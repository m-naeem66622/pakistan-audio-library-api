const axios = require("axios");
const qs = require("qs");
const AudioBookModel = require("../models/audioBook.model");
const UserModel = require("../models/user.model");
const { validValues } = require("../validators/audioBook.validator");

// Function to retrieve an audio book by _id with select/exclude options
const getAudioBookInfo = async (req, res) => {
  try {
    const { audioBookId } = req.params;
    const { include, exclude } = req.query;
    console.log(include, exclude);

    const fields = {};
    let dynamicStage;

    if (include) {
      include.forEach((field) => (fields[field] = 1));
    }

    if (exclude) {
      exclude.forEach((field) => (fields[field] = 0));
    }

    let pipeline = [{ $match: { _id: audioBookId } }, { $project: fields }];

    // Exclude the listen_url of the section to secure the content
    // Case 1: if it is including sections field
    // Case 2: if it is not excluding sections field
    if (include?.includes("sections") || !exclude?.includes("sections")) {
      pipeline.push({ $project: { "sections.listen_url": 0 } });
    }

    // Populate user info in place of userId if fields include reviews
    // Case 1: if it is including reviews field
    // Case 2: if it is not excluding reviews field
    if (
      include?.includes("reviews") ||
      (exclude && !exclude.includes("reviews"))
    ) {
      console.log("Review is included or not excluded");
      // Filtered Fields Object With Value 1
      // Case 1: If reviews include replicate get same fields as in fields object
      // Case 2: If reviews not exclude get all the fields other than in fields object
      const fieldsObjWithoutReviews1 = {};
      if (include?.includes("reviews")) {
        console.log("The review is included for 1");
        Object.keys(fields)
          .filter((field) => field !== "reviews")
          .forEach((field) => (fieldsObjWithoutReviews1[field] = 1));
      } else {
        console.log("The review is not included for 1");
        validValues
          .filter((value) => !Object.keys(fields).includes(value))
          .forEach((field) => (fieldsObjWithoutReviews1[field] = null));
      }

      console.log("fieldsObjWithoutReviews1:", fieldsObjWithoutReviews1);

      // Filtered feilds object with value $first accumulator
      const fieldsObjWithoutReviews2 = {};
      if (include?.includes("reviews")) {
        console.log("The review is included for 2");
        Object.keys(fieldsObjWithoutReviews1).forEach(
          (field) => (fieldsObjWithoutReviews2[field] = { $first: "$" + field })
        );
        dynamicStage = {
          $project: {
            _id: "$_id",
            ...fieldsObjWithoutReviews1,
            review: {
              $cond: [
                { $ifNull: ["$reviews.k", false] },
                {
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
                null,
              ],
            },
          },
        };
      } else {
        console.log("The review is not included for 2");
        validValues
          .filter((value) => !Object.keys(fields).includes(value))
          .forEach(
            (field) =>
              (fieldsObjWithoutReviews2[field] = { $first: "$" + field })
          );
        dynamicStage = {
          $addFields: {
            _id: "$_id",
            // ...fieldsObjWithoutReviews1,
            review: {
              $cond: [
                { $ifNull: ["$reviews.k", false] },
                {
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
                null,
              ],
            },
          },
        };
      }

      console.log("fieldsObjWithoutReviews2:", fieldsObjWithoutReviews2);

      pipeline.push(
        {
          $addFields: {
            reviews: {
              $objectToArray: "$reviews",
            },
          },
        },
        {
          $unwind: {
            preserveNullAndEmptyArrays: true,
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
            preserveNullAndEmptyArrays: true,
            path: "$reviewsDetails",
          },
        },
        dynamicStage,
        {
          $group: {
            _id: "$_id",
            ...fieldsObjWithoutReviews2,
            reviews: {
              $push: {
                $cond: [{ $ifNull: ["$review", false] }, "$review", "$$REMOVE"],
              },
            },
          },
        }
      );
    }

    console.log("finalPipeline:", JSON.stringify(pipeline));

    const audioBook = await AudioBookModel.getAudioBookById(pipeline);

    if (audioBook.status === "SUCCESS") {
      return res
        .status(200)
        .send({ message: audioBook.status, data: audioBook.data });
    } else if (audioBook.status === "FAILED") {
      return res.status(404).send({
        message: audioBook.status,
        description: "Audio book not found",
      });
    } else {
      return res
        .status(500)
        .send({ message: audioBook.status, error: audioBook.error });
    }
  } catch (error) {
    return res.status(500).send({
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000B01", // for only development purpose while debugging
      },
    });
  }
};

const getAudioBooks = async (req, res) => {
  try {
    const { include, exclude, limit, page } = req.query;
    const fields = {};
    let stagesForSort = [
      {
        $addFields: {
          sortRank: {
            $cond: [
              {
                $eq: ["$rank", null],
              },
              "",
              "$rank",
            ],
          },
        },
      },
      {
        $sort: {
          sortRank: 1,
        },
      },
      {
        $project: {
          sortRank: 0,
        },
      },
    ];
    let dynamicStage;

    if (include) {
      include.forEach((field) => (fields[field] = 1));
    }

    if (exclude) {
      exclude.forEach((field) => (fields[field] = 0));
    }

    let pipeline = [
      { $project: fields },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: limit ? parseInt(limit) : 10 },
    ];

    if (include?.includes("rank") || !exclude?.includes("rank")) {
      /* Get the audioBooks that have rank in ascending order (null means not ranked will be at last)
      Adjusting the query mechanism becasue sorting with value 1 get null data at first
      */
      pipeline.unshift(...stagesForSort);
    }

    if (include?.includes("sections") || !exclude?.includes("sections")) {
      // Exclude the listen_url of the section to secure the content
      pipeline.unshift({ $project: { "sections.listen_url": 0 } });
    }

    // Populate user info in place of userId if fields include reviews
    // Case 1: if it is including reviews field
    // Case 2: if it is not excluding reviews field
    if (
      include?.includes("reviews") ||
      (exclude && !exclude.includes("reviews"))
    ) {
      console.log("Review is included or not excluded");
      // Filtered Fields Object With Value 1
      // Case 1: If reviews include replicate get same fields as in fields object
      // Case 2: If reviews not exclude get all the fields other than in fields object
      const fieldsObjWithoutReviews1 = {};
      if (include?.includes("reviews")) {
        console.log("The review is included for 1");
        Object.keys(fields)
          .filter((field) => field !== "reviews")
          .forEach((field) => (fieldsObjWithoutReviews1[field] = 1));
      } else {
        console.log("The review is not included for 1");
        validValues
          .filter((value) => !Object.keys(fields).includes(value))
          .forEach((field) => (fieldsObjWithoutReviews1[field] = null));
      }

      console.log("fieldsObjWithoutReviews1:", fieldsObjWithoutReviews1);

      // Filtered feilds object with value $first accumulator
      const fieldsObjWithoutReviews2 = {};
      if (include?.includes("reviews")) {
        console.log("The review is included for 2");
        Object.keys(fieldsObjWithoutReviews1).forEach(
          (field) => (fieldsObjWithoutReviews2[field] = { $first: "$" + field })
        );
        dynamicStage = {
          $project: {
            _id: "$_id",
            ...fieldsObjWithoutReviews1,
            review: {
              $cond: [
                { $ifNull: ["$reviews.k", false] },
                {
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
                null,
              ],
            },
          },
        };
      } else {
        console.log("The review is not included for 2");
        validValues
          .filter((value) => !Object.keys(fields).includes(value))
          .forEach(
            (field) =>
              (fieldsObjWithoutReviews2[field] = { $first: "$" + field })
          );
        dynamicStage = {
          $addFields: {
            _id: "$_id",
            review: {
              $cond: [
                { $ifNull: ["$reviews.k", false] },
                {
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
                null,
              ],
            },
          },
        };
      }

      console.log("fieldsObjWithoutReviews2:", fieldsObjWithoutReviews2);

      pipeline.push(
        {
          $addFields: {
            reviews: {
              $objectToArray: "$reviews",
            },
          },
        },
        {
          $unwind: {
            preserveNullAndEmptyArrays: true, // To still keep the documents that dont have reviews.
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
            preserveNullAndEmptyArrays: true, // To still keep the documents that dont have reviews.
            path: "$reviewsDetails",
          },
        },
        dynamicStage,
        {
          $group: {
            _id: "$_id",
            ...fieldsObjWithoutReviews2,
            reviews: {
              $push: {
                $cond: [{ $ifNull: ["$review", false] }, "$review", "$$REMOVE"],
              },
            },
          },
        }
      );
    }

    if (include?.includes("rank") || !exclude?.includes("rank")) {
      /* Again pushing sort because of unwind disturb the previous sort. but this time sort will only happen for maximum 10 elements
       */
      pipeline.push(...stagesForSort);
    }

    console.log(JSON.stringify(pipeline));

    const audioBooks = await AudioBookModel.getAudioBooks(pipeline);

    if (audioBooks.status === "SUCCESS") {
      res.json({
        message: "SUCCESS",
        data: {
          limit: parseInt(limit),
          page: parseInt(page),
          currentResults: audioBooks.data?.documents.length,
          ...audioBooks.data,
        },
      });
    } else if (audioBooks.status === "FAILED") {
      return res.status(404).send({
        message: audioBooks.status,
        description: "No audio book found",
      });
    } else {
      return res
        .status(422)
        .send({ message: audioBooks.status, error: audioBooks.error });
    }
  } catch (error) {
    return res.status(500).send({
      status: "INTERNAL SERVER ERROR",
      error: {
        trace: error.stack,
        message: error.message,
        identifier: "0x000B08", // for only development purpose while debugging
      },
    });
  }
};

const getAudioFileStream = async (req, res) => {
  const { audioBookId, sectionId } = req.params;

  try {
    // A projection string that will make sure to get the specific listen url based on section index.

    const pipeline = [
      {
        $match: {
          _id: audioBookId,
        },
      },
      {
        $unwind: "$sections",
      },
      {
        $match: {
          "sections._id": sectionId,
        },
      },
      {
        $project: {
          _id: 0,
          listen_url: "$sections.listen_url",
        },
      },
    ];

    const audioBookSection = await AudioBookModel.getAudioBookById(pipeline);

    if (audioBookSection.status === "SUCCESS") {
      if (!audioBookSection.data[0]?.listen_url) {
        return res
          .status(404)
          .send({ message: "FAILED", description: "Section not found" });
      }

      const audioFileUrl = audioBookSection.data[0].listen_url;

      return res.send({ message: "SUCCESS", data: audioFileUrl });
    } else if (audioBookSection.status === "FAILED") {
      return res.status(404).send({
        message: audioBookSection.status,
        description: "Audio book not found",
      });
    } else {
      return res.status(500).send({
        message: audioBookSection.status,
        error: audioBookSection.error,
      });
    }
  } catch (error) {
    return res.status(500).send({
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000B02", // for only development purpose while debugging
        stack: error.stack,
      },
    });
  }
};

const updateAudioBookScore = async (req, res) => {
  const { audioBookId } = req.params;
  const { type } = req.body;

  const scoreTypes = { CLICK: 0.01, ADD_TO_FAVOURITE: 5 };

  // To-Do from user models
  let increment = true;
  if (type === "ADD_TO_FAVOURITE") {
    // do the implementation for the users
  }

  const audioBook = await AudioBookModel.updateAudioBookScore(
    audioBookId,
    increment ? scoreTypes[type] : -scoreTypes[type]
  );

  if (audioBook.status === "SUCCESS") {
    return res.status(200).send({ message: audioBook.status });
  } else if (audioBook.status === "FAILED") {
    return res
      .status(404)
      .send({ message: audioBook.status, description: "Book not found" });
  } else {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000B03", // for only development purpose while debugging
      },
    });
  }
};

const addAudioBookReview = async (req, res) => {
  try {
    const { _id: userId } = req.decodedToken;
    const { audioBookId } = req.params;

    // req.body.userId = userId;
    const options = { fields: `-reviews` };

    let updatedAudioBook = await AudioBookModel.saveAudioBookReview(
      audioBookId,
      userId,
      req.body,
      options
    );

    console.log(JSON.stringify(updatedAudioBook.data));

    if (updatedAudioBook.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Review not updated",
        error: updatedAudioBook.error,
      });
    }

    updatedAudioBook = await AudioBookModel.getAudioBookReviewByUserId(
      audioBookId,
      userId
    );

    if (updatedAudioBook.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Review updated but failed in getting details",
        error: updatedAudioBook.error,
      });
    }

    res.status(200).send({ message: "SUCCESS", data: updatedAudioBook.data });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000B04", // for only development purpose while debugging
      },
    });
  }
};

const getAudioBookReviewByUserId = async (req, res) => {
  const { _id: userId } = req.decodedToken;
  const { audioBookId } = req.params;

  try {
    const updatedAudioBook = await AudioBookModel.getAudioBookReviewByUserId(
      audioBookId,
      userId
    );

    if (updatedAudioBook.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Review not fetched",
        error: updatedAudioBook.error,
      });
    }

    res.status(200).send({ message: "SUCCESS", data: updatedAudioBook.data });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000B06", // for only development purpose while debugging
      },
    });
  }
};

const getAudioBookReviewByReviewId = async (req, res) => {
  const { audioBookId, reviewId } = req.params;

  try {
    const updatedAudioBook = await AudioBookModel.getAudioBookReviewByReviewId(
      audioBookId,
      reviewId
    );

    if (updatedAudioBook.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Review not fetched",
        error: updatedAudioBook.error,
      });
    }

    res.status(200).send({ message: "SUCCESS", data: updatedAudioBook.data });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000B07", // for only development purpose while debugging
      },
    });
  }
};

const searchAudioBooks = async (req, res) => {
  const {
    include,
    exclude,
    limit = 10,
    page = 1,
    title,
    language,
    authors,
    genres,
    translators,
  } = req.query;

  try {
    const offset = (parseInt(page) - 1) * limit;

    const queryForRequestData = {
      limit,
      title,
      authors,
      genres,
      language,
      translators,
    };

    const queryStringified = qs.stringify(queryForRequestData, {
      encode: false,
      arrayFormat: "brackets",
    });

    const URI = `${process.env.AI_MODEL_BASE_URL}/books?${queryStringified}&offset=${offset}`;
    console.log(URI);
    let response;
    try {
      response = await axios.get(URI);
    } catch (error) {
      console.log(error.response.data);
      return res
        .status(422)
        .send({ message: "FAILED", description: "No search results found." });
    }

    const pipeline = [
      {
        $facet: {
          moreSimilar: [
            {
              $match: {
                _id: {
                  $in: [...response.data.moreSimilar],
                },
              },
            },
          ],
          lessSimilar: [
            {
              $match: {
                _id: {
                  $in: [...response.data.lessSimilar],
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          "moreSimilar.sections.listen_url": 0,
          "lessSimilar.sections.listen_url": 0,
        },
      },
    ];

    const audioBooks = await AudioBookModel.populateDataForSearchedIds(
      pipeline
    );

    if (audioBooks.status === "SUCCESS") {
      return res.json({
        data: {
          limit,
          page,
          totalResults: response.data.totalResults,
          currentResults: Object.values(audioBooks.data).reduce(
            (length, array) => length + array.length,
            0
          ),
          data: audioBooks.data,
        },
      });
    } else if (audioBooks.status === "FAILED") {
      return res
        .status(404)
        .send({ message: "FAILED", description: "No search results found." });
    } else {
      return res
        .status(422)
        .send({ message: "FAILED", error: audioBooks.error });
    }
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const getRecommendations = async (req, res, next) => {
  const { limit, page } = req.query;
  const { _id: userId } = req.decodedToken;

  const topGenres = await UserModel.getTopListenedGenres(userId);

  if (topGenres.status !== "SUCCESS") {
    return res.status(404).send({
      message: "FAILED",
      description: "No listened data for the user yet.",
    });
  }

  const offset = (parseInt(page) - 1) * limit;

  const queryForRequest = { genres: topGenres.data?.genres };
  const queryStringified = qs.stringify(queryForRequest, {
    encode: false,
    arrayFormat: "brackets",
  });

  const URI = `${process.env.AI_MODEL_BASE_URL}/recommendations?${queryStringified}&limit=${limit}&offset=${offset}`;
  // console.log(URI);
  let response;
  try {
    response = await axios.get(URI);
  } catch (error) {
    console.log(error.response.data);
    return res
      .status(422)
      .send({ message: "FAILED", description: "No search results found." });
  }

  const pipeline = [
    {
      $match: {
        _id: {
          $in: response.data.recommendations,
        },
      },
    },
    {
      $project: {
        "sections.listen_url": 0,
      },
    },
  ];

  const audioBooks = await AudioBookModel.getBooksByIds(pipeline);

  if (audioBooks.status === "SUCCESS") {
    return res.json({
      data: {
        limit,
        page,
        totalResults: response.data.totalResults,
        currentResults: audioBooks.data.length,
        data: audioBooks.data,
      },
    });
  } else if (audioBooks.status === "FAILED") {
    return res
      .status(404)
      .send({ message: "FAILED", description: "No search results found." });
  } else {
    return res
      .status(500)
      .send({ message: "INTERNAL SERVER ERROR", error: audioBooks.error });
  }
};

/*
Controllers For Admin To Add Books
*/
// This function takes an array of data objects and returns an array of promises
const saveMultipleAudioBooks = async (data) => {
  // Create an empty array to store the promises
  const promises = [];

  // Loop through the data array
  data.forEach((audioBook, index) => {
    try {
      promises.push(AudioBookModel.saveAudioBook(audioBook));

      console.log("Successfully added: ", index);
    } catch (error) {
      // If there is any other error while checking or saving the appointment, push a rejected promise with the error object to the promises array
      console.log("error: controller", error);
      promises.push(Promise.reject(error));
    }
  });

  // Return the promises array
  return promises;
};

// This function takes an array of data objects and a response object, and tries to save all the appointments
const addMultipleAudioBooks = async (req, res, next) => {
  // Add a listener for the unhandledRejection event on the process object
  process.on("unhandledRejection", (reason, promise) => {
    // Log the reason and the promise that caused the rejection
    // console.log("Unhandled Rejection at:", promise, "reason:", reason);
    // Handle the error according to your needs, such as sending a response, logging to a file, etc.
    // For example, you can send a failure response with the reason message
    return res.status(400).json({
      message: "FAILED",
      description: reason.message,
    });
  });

  try {
    const data_set = require("../misc/data_audio_books_cleaned.json");
    const data = JSON.stringify(data_set);
    const json = JSON.parse(data);

    // Call the saveMultipleAppointments function and get the array of promises
    const promises = await saveMultipleAudioBooks(json);

    // Use Promise.all to wait for all the promises to resolve or reject
    console.log("All items are processed");
    Promise.all(promises)
      .then((results) => {
        // If all the promises are resolved, send a success response with the results array
        console.log("All items are added");
        return res.status(201).json({
          message: "SUCCESS",
          data: results,
        });
      })
      .catch((error) => {
        // If any of the promises are rejected, send a failure response with the error message
        return res.status(400).json({
          message: "FAILED",
          description: error.message,
        });
      });
  } catch (error) {
    // If there is any other error, send a server error response
    console.log(error);
    return res.status(500).json({
      message: "INTERNAL SERVER ERROR",
    });
  }
};

module.exports = {
  searchAudioBooks,
  getAudioBookInfo,
  getAudioBooks,
  getAudioFileStream,
  updateAudioBookScore,
  addMultipleAudioBooks,
  addAudioBookReview,
  getAudioBookReviewByUserId,
  getAudioBookReviewByReviewId,
  getRecommendations,
};
