const cron = require("node-cron");
const { User } = require("../api/schemas/user.schema");
const { AudioBook } = require("../api/schemas/audioBook.schema");

const updateUserTotalTimeListened = async () => {
  User.aggregate([
    // Stage 1: Reshape the listeningData map into an array of key-value pairs
    {
      $project: {
        listeningData: {
          $objectToArray: "$listeningData",
        },
      },
    },
    // Stage 2: Deconstruct the array of key-value pairs into separate documents
    {
      $unwind: "$listeningData",
    },
    // Stage 3: Group the documents by the book id and sum up the time values
    {
      $group: {
        _id: "$listeningData.k",
        totalTimeListened: {
          $sum: "$listeningData.v",
        },
      },
    },
    // Stage 4: Convert string _id to ObjectId of each document to match it for merge.
    {
      $addFields: {
        _id: "$_id",
      },
    },
    // Stage 5: Update the audiobooks collection with the total time listened
    {
      $merge: {
        into: "audiobooks",
        on: "_id",
        whenMatched: "merge",
        whenNotMatched: "discard",
      },
    },
  ]).then((result) => {
    updateRankingOfBooks();
  });
};

const updateRankingOfBooks = async () => {
  AudioBook.aggregate([
    // Stage 1: Set 0 to the score or totalTimeListened in case of the null or undefined value
    {
      $fill: {
        output: {
          score: {
            value: 0,
          },
          totalTimeListened: {
            value: 0,
          },
        },
      },
    },
    // Stage 2: Calculate rankValue as weighted sum of 40% of score and 60% of totalTimeListened
    {
      $project: {
        score: 1,
        totalTimeListened: 1,
        rankValue: {
          $add: [
            {
              $multiply: [0.4, "$score"],
            },
            {
              $multiply: [0.6, "$totalTimeListened"],
            },
          ],
        },
      },
    },
    // Stage 3: Filter out the documents that have rankValue equal to 0
    {
      $match: {
        rankValue: {
          $gt: 0,
        },
      },
    },
    // Stage 4: Sort the documents by rankValue in descending order
    {
      $sort: {
        rankValue: -1,
      },
    },
    // Stage 5: Limit the results to 100 documents (Get first 100 ranked books)
    {
      $limit: 100,
    },
    // Stage 6: Group the documents by null and push them into an array called books
    {
      $group: {
        _id: null,
        books: {
          $push: "$$ROOT",
        },
      },
    },
    // Stage 7: Deconstruct books array and add new field rank as index + 1
    {
      $unwind: {
        path: "$books",
        includeArrayIndex: "rank",
      },
    },
    // Stage 8: Keep only _id and rank field from each document
    {
      $project: {
        _id: "$books._id",
        rank: {
          $add: ["$rank", 1],
        },
      },
    },
    // Stage 9: Update the audiobooks collection with the rank field
    {
      $merge: {
        into: "audiobooks",
        on: "_id",
        whenMatched: "merge",
        whenNotMatched: "discard",
      },
    },
  ]).then((result) => {
    console.log("Both Jobs Done");
  });
};

// Job will run at every 6 hours
const task = cron.schedule("0 */6 * * *", updateUserTotalTimeListened);

module.exports = { task };
