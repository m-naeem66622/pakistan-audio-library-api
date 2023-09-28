const axios = require("axios");
const AudioBookModel = require("../models/audioBook.model");
const { AudioBook } = require("../schemas/audioBook.schema");

// Function to retrieve an audio book by _id with select/exclude options
const getAudioBookInfo = async (req, res) => {
  try {
    const { audioBookId } = req.params;
    const { include, exclude } = req.query;

    const fields = {};

    if (include) {
      include.forEach((field) => (fields[field] = 1));
    }

    if (exclude) {
      exclude.forEach((field) => (fields[field] = 0));
    }

    let pipeline = [{ $match: { _id: audioBookId } }, { $project: fields }];

    if (include.includes("sections") && fields.sections) {
      // Exclude the listen_url of the section to secure the content
      pipeline.push({ $project: { "sections.listen_url": 0 } });
    }

    if (include.includes("reviews") && fields.reviews) {
      // Exclude the listen_url of the section to secure the content
      pipeline = [
        ...pipeline,
        {
          $addFields: {
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
            _id: "$_id",
            rank: 1,
            title: 1,
            review: {
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
        {
          $group: {
            _id: "$_id",
            title: {
              $first: "$title",
            },
            rank: {
              $first: "$rank",
            },
            reviews: {
              $push: "$review",
            },
          },
        },
      ];
    }

    // console.log(pipeline);

    const audioBook = await AudioBookModel.getAudioBookById(pipeline);

    if (audioBook.status === "SUCCESS") {
      return res
        .status(200)
        .send({ message: audioBook.status, data: audioBook.data });
    } else if (audioBook.status === "FAILED") {
      return res.status(404).send({
        message: audioBook.status,
        description: "Audio book not found",
        check: "I am from book info",
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
    let fields = {};
    let sort = {};

    if (include) {
      include.forEach((field) => (fields[field] = 1));
    }

    if (exclude) {
      exclude.forEach((field) => (fields[field] = 0));
    }

    if (fields.rank) {
      sort.rank = 1;
    }

    let pipeline = [
      { $project: fields },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: limit ? parseInt(limit) : 10 },
    ];

    if (fields.rank) {
      pipeline.splice(0, 0, { $match: { rank: { $gt: 0 } } });
      pipeline.splice(1, 0, { $sort: { rank: 1 } });
    }

    if (include.includes("sections") && fields.sections) {
      // Exclude the listen_url of the section to secure the content
      pipeline.splice(1, 0, { $project: { "sections.listen_url": 0 } });
    }

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
  const { audioBookId, sectionIndex } = req.params;

  try {
    // A projection string that will make sure to get the specific listen url based on section index.
    // const pipeline = {
    //   sections: { $arrayElemAt: ["$sections", Number(sectionIndex)] },
    // };

    const pipeline = [
      {
        $match: {
          _id: audioBookId,
        },
      },
      {
        $project: {
          sections: {
            $arrayElemAt: ["$sections", parseInt(sectionIndex)],
          },
        },
      },
    ];

    const audioBookSection = await AudioBookModel.getAudioBookById(pipeline);

    if (audioBookSection.status === "SUCCESS") {
      if (
        !audioBookSection.data?.length ||
        !audioBookSection.data[0]?.sections
      ) {
        return res
          .status(404)
          .send({ message: "FAILED", description: "Section not found" });
      }

      const audioFileUrl = audioBookSection.data[0].sections.listen_url;

      return res.send({ message: "SUCCESS", data: audioFileUrl });
    } else if (audioBookSection.status === "FAILED") {
      return res.status(404).send({
        message: audioBookSection.status,
        description: "Audio book not found",
        check: "I am from stream",
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
    const options = { fields: "reviews" };

    let updatedAudioBook = await AudioBookModel.saveAudioBookReview(
      audioBookId,
      userId,
      req.body,
      options
    );

    if (updatedAudioBook.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Review not updated",
        error: updatedAudioBook.error,
      });
    }

    updatedAudioBook = await AudioBookModel.getAudioBookReviews(audioBookId);

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

const getAudioBookReviews = async (req, res) => {
  const { audioBookId } = req.params;

  try {
    const updatedAudioBook = await AudioBookModel.getAudioBookReviews(
      audioBookId
    );

    if (updatedAudioBook.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Reviews not fetched",
        error: updatedAudioBook.error,
      });
    }

    res.status(200).send({ message: "SUCCESS", data: updatedAudioBook.data });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000B05", // for only development purpose while debugging
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
  try {
    /* For the time being if title is provided (with or without other fields) then only results match to the title will be returned other fields will be ignored because lack of time we forgot to add the remaining fields search support in our AI model */

    const {
      title,
      language,
      authors,
      genres,
      translators,
      limit = 10,
      page = 1,
    } = req.query;

    // const query = {};
    // let titleMatchedBooks;
    if (title) {
      const offset = (parseInt(page) - 1) * limit;
      const URI = `${process.env.AI_MODEL_BASE_URL}/books?name=${title}&n_books=${limit}&offset=${offset}`;
      const response = await axios.get(URI);

      // console.log(response.status);

      return res.status(200).send({ data: response.data });
      if (response.status !== 200) {
        return res.status(422).send({ message: "FAILED" });
      }

      // const totalDocuments = await Book.countDocuments().exec();
      const documents = await AudioBook.aggregate([
        {
          $facet: {
            moreSimilar: [
              {
                $match: {
                  _id: {
                    $in: [...response.data.moreSimilar.map((id) => String(id))],
                  },
                },
              },
            ],
            lessSimilar: [
              {
                $match: {
                  _id: {
                    $in: [...response.data.lessSimilar.map((id) => String(id))],
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
      ]);

      return res.json({
        data: {
          limit,
          page,
          currentResults: Object.values(documents[0]).reduce(
            (length, array) => length + array.length,
            0
          ),
          data: documents,
        },
      });
    }

    // if (authors?.length) {
    //   // const terms = authors.map((term) => new RegExp(`(?=.*${term})`, "i"));
    //   filters.$or = authors.map((id) => ({ authors: id }));
    // }
  } catch (error) {
    return res.status(500).send({ error: error.message, stack: error.stack });
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
  getAudioBookReviews,
  getAudioBookReviewByUserId,
  getAudioBookReviewByReviewId,
};
