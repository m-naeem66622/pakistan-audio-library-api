const mongoose = require("mongoose");
const { AudioBook } = require("../schemas/audioBook.schema");

const saveAudioBook = async (data) => {
  try {
    const audioBook = new AudioBook(data);
    const savedAudioBook = await audioBook.save();

    if (savedAudioBook) {
      return {
        status: "SUCCESS",
        data: savedAudioBook,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000A01" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    // console.log("error: Models", data.id, error.message);
    // let stream = fs.createWriteStream("errors.txt", { flags: "a" });
    // stream.write(data.id + ": " + JSON.stringify(error.message) + "\n\n");
    // stream.end();
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000A00", // for only development purpose while debugging
      },
    };
  }
};

const getAudioBooks = async (pipeline) => {
  try {
    // Count items
    const totalResults = await AudioBook.countDocuments().exec();

    const documents = await AudioBook.aggregate(pipeline).exec();

    if (documents?.length) {
      return {
        status: "SUCCESS",
        data: { totalResults, documents },
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000A11" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000A10", // for only development purpose while debugging
      },
    };
  }
};

const getAudioBookById = async (pipeline) => {
  try {
    const audioBook = await AudioBook.aggregate(pipeline);
    console.log("audioBook:", audioBook);
    if (audioBook.length) {
      return {
        status: "SUCCESS",
        data: audioBook[0],
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000A03" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000A02", // for only development purpose while debugging
      },
    };
  }
};

const updateAudioBookScore = async (audioBookId, score) => {
  try {
    const audioBook = await AudioBook.findByIdAndUpdate(audioBookId, {
      $inc: { score },
    });

    if (audioBook) {
      return {
        status: "SUCCESS",
        data: audioBook,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000A05" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000A04", // for only development purpose while debugging
      },
    };
  }
};

const saveAudioBookReview = async (
  userId,
  audioBookId,
  reviewData,
  options = {}
) => {
  try {
    const updatedAudioBook = await AudioBook.findByIdAndUpdate(
      userId,
      { $set: { [`reviews.${audioBookId}`]: reviewData } },
      options
    );

    if (updatedAudioBook) {
      return {
        status: "SUCCESS",
        data: updatedAudioBook,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000A07" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000A06", // for only development purpose while debugging
      },
    };
  }
};

const getAudioBookReviews = async (audioBookId, options = {}) => {
  try {
    const reviews = await AudioBook.aggregate([
      {
        $match: {
          _id: audioBookId,
        },
      },
      {
        $project: {
          reviews: {
            $objectToArray: "$reviews",
          },
        },
      },
      {
        $unwind: {
          path: "$reviews",
        },
      },
      {
        $addFields: {
          "reviews.k": {
            $toObjectId: "$reviews.k",
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reviews.k",
          foreignField: "_id",
          as: "reviewsDetails",
        },
      },
      {
        $unwind: {
          path: "$reviewsDetails",
        },
      },
      {
        $project: {
          _id: "$reviews.v._id",
          user: {
            _id: "$reviewsDetails._id",
            firstName: "$reviewsDetails.firstName",
            lastName: "$reviewsDetails.lastName",
            username: "$reviewsDetails.username",
          },
          content: "$reviews.v.content",
          rating: "$reviews.v.rating",
        },
      },
    ]);

    if (reviews) {
      return {
        status: "SUCCESS",
        data: reviews,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000A09" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000A08", // for only development purpose while debugging
      },
    };
  }
};

const getAudioBookWithReviews = async (audioBookId, options = {}) => {
  try {
    const audioBook = await AudioBook.aggregate([
      [
        {
          $match: {
            _id: audioBookId,
          },
        },
        {
          $project: {
            reviews: {
              $objectToArray: "$reviews",
            },
          },
        },
        {
          $unwind: {
            path: "$reviews",
          },
        },
        {
          $addFields: {
            "reviews.k": {
              $toObjectId: "$reviews.k",
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "reviews.k",
            foreignField: "_id",
            as: "reviewsDetails",
          },
        },
        {
          $unwind: {
            path: "$reviewsDetails",
          },
        },
        {
          $group: {
            _id: "$_id",
            reviews: {
              $push: {
                _id: "$reviews.v._id",
                user: {
                  _id: "$reviewsDetails._id",
                  firstName: "$reviewsDetails.firstName",
                  lastName: "$reviewsDetails.lastName",
                  username: "$reviewsDetails.username",
                },
                content: "$reviews.v.content",
                rating: "$reviews.v.rating",
              },
            },
          },
        },
        {
          $lookup: {
            from: "audiobooks",
            localField: "_id",
            foreignField: "_id",
            as: "book",
          },
        },
        {
          $unwind: {
            path: "$book",
          },
        },
        {
          $project: {
            _id: 1,
            title: "$book.title",
            description: "$book.description",
            language: "$book.username",
            copyright_year: "$book.copyright_year",
            num_sections: "$book.num_sections",
            sections: "$book.sections",
            totaltimesecs: "$book.totaltimesecs",
            authors: "$book.authors",
            sections: "$book.sections",
            genres: "$book.genres",
            translators: "$book.translators",
            rank: "$book.rank",
            reviews: 1,
          },
        },
      ],
    ]);

    if (audioBook) {
      return {
        status: "SUCCESS",
        data: audioBook,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000A0B" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000A0A", // for only development purpose while debugging
      },
    };
  }
};

const getAudioBookReviewByUserId = async (
  audioBookId,
  userId,
  options = {}
) => {
  try {
    // return {
    //   status: "SUCCESS",
    //   data: audioBookId,
    // };
    const audioBook = await AudioBook.aggregate([
      {
        $match: {
          _id: audioBookId,
        },
      },
      {
        $project: {
          reviews: {
            $objectToArray: "$reviews",
          },
        },
      },
      {
        $unwind: {
          path: "$reviews",
        },
      },
      {
        $addFields: {
          "reviews.k": {
            $toObjectId: "$reviews.k",
          },
        },
      },
      {
        $match: {
          "reviews.k": new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reviews.k",
          foreignField: "_id",
          as: "reviewsDetails",
        },
      },
      {
        $unwind: {
          path: "$reviewsDetails",
        },
      },
      {
        $project: {
          _id: "$reviews.v._id",
          user: {
            _id: "$reviewsDetails._id",
            firstName: "$reviewsDetails.firstName",
            lastName: "$reviewsDetails.lastName",
            username: "$reviewsDetails.username",
          },
          content: "$reviews.v.content",
          rating: "$reviews.v.rating",
        },
      },
    ]);

    if (audioBook instanceof Array && audioBook[0]) {
      return {
        status: "SUCCESS",
        data: audioBook[0],
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000A0D" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000A0C", // for only development purpose while debugging
      },
    };
  }
};

const getAudioBookReviewByReviewId = async (
  audioBookId,
  reviewId,
  options = {}
) => {
  try {
    const audioBook = await AudioBook.aggregate([
      {
        $match: {
          _id: audioBookId,
        },
      },
      {
        $project: {
          reviews: {
            $objectToArray: "$reviews",
          },
        },
      },
      {
        $unwind: {
          path: "$reviews",
        },
      },
      {
        $addFields: {
          "reviews.k": {
            $toObjectId: "$reviews.k",
          },
        },
      },
      {
        $match: {
          "reviews.v._id": new mongoose.Types.ObjectId(reviewId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reviews.k",
          foreignField: "_id",
          as: "reviewsDetails",
        },
      },
      {
        $unwind: {
          path: "$reviewsDetails",
        },
      },
      {
        $project: {
          _id: "$reviews.v._id",
          user: {
            _id: "$reviewsDetails._id",
            firstName: "$reviewsDetails.firstName",
            lastName: "$reviewsDetails.lastName",
            username: "$reviewsDetails.username",
          },
          content: "$reviews.v.content",
          rating: "$reviews.v.rating",
        },
      },
    ]);

    if (audioBook instanceof Array && audioBook[0]) {
      return {
        status: "SUCCESS",
        data: audioBook[0],
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000A0F" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000A0E", // for only development purpose while debugging
      },
    };
  }
};

module.exports = {
  saveAudioBook,
  getAudioBooks,
  getAudioBookById,
  updateAudioBookScore,
  saveAudioBookReview,
  getAudioBookReviews,
  getAudioBookWithReviews,
  getAudioBookReviewByUserId,
  getAudioBookReviewByReviewId,
};
