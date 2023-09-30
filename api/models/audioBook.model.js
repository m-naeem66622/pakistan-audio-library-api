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
  audioBookId,
  userId,
  reviewData,
  options = {}
) => {
  try {
    const updatedAudioBook = await AudioBook.findByIdAndUpdate(
      audioBookId,
      { $set: { [`reviews.${userId}`]: reviewData } },
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

const populateDataForSearchedIds = async (pipeline) => {
  try {
    const documents = await AudioBook.aggregate(pipeline).exec();

    const documentsLength = Object.values(documents[0]).reduce(
      (length, array) => length + array.length,
      0
    );

    if (documentsLength) {
      return { status: "SUCCESS", data: documents[0] };
    } else {
      return { status: "FAILED" };
    }
  } catch (error) {
    return { status: "INTERNAL SERVER ERROR", error: error.message };
  }
};

const getBooksByIds = async (pipeline) => {
  try {
    const documents = await AudioBook.aggregate(pipeline).exec();

    if (documents.length) {
      return { status: "SUCCESS", data: documents };
    } else {
      return { status: "FAILED" };
    }
  } catch (error) {
    return { status: "INTERNAL SERVER ERROR", error: error.message };
  }
};

module.exports = {
  saveAudioBook,
  getAudioBooks,
  getAudioBookById,
  updateAudioBookScore,
  saveAudioBookReview,
  getAudioBookReviewByUserId,
  getAudioBookReviewByReviewId,
  populateDataForSearchedIds,
  getBooksByIds
};
