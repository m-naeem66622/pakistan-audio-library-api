const mongoose = require("mongoose");
const { User } = require("../schemas/user.schema");

const saveUser = async (body) => {
  try {
    const user = await User.create(body);

    /* Exclude these fields from the Object.
    There is no sense to send it in response 
    And assigning undefined because delete
    operator not work on mongooose document */
    user.password = undefined;
    user.isSuspended = undefined;
    user.isDeleted = undefined;
    user.blockedStatus = undefined;
    user.blockedHistory = undefined;
    user.listeningData = undefined;

    if (user) {
      return {
        status: "SUCCESS",
        data: user,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C07" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C01", // for only development purpose while debugging
      },
    };
  }
};

const getUserById = async (userId, projection) => {
  try {
    const user = await User.findById(userId, projection);

    if (user) {
      return {
        status: "SUCCESS",
        data: user,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C08" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C02", // for only development purpose while debugging
      },
    };
  }
};

const getUserByUsername = async (username, projection) => {
  try {
    const user = await User.findOne({ username }, projection);

    if (user) {
      return {
        status: "SUCCESS",
        data: user,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C06" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C03", // for only development purpose while debugging
      },
    };
  }
};

const setSessionString = async (userId, loginSession = null) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { loginSession },
      { new: true }
    );

    if (updatedUser) {
      return {
        status: "SUCCESS",
        data: updatedUser,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C05" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C04", // for only development purpose while debugging
      },
    };
  }
};

const updateUserListeningData = async (userId, audioBookId, time) => {
  try {
    const user = await User.findByIdAndUpdate(userId, {
      $inc: { [`listeningData.${audioBookId}`]: time },
    });

    if (user) {
      return {
        status: "SUCCESS",
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C0A" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C09", // for only development purpose while debugging
      },
    };
  }
};

const addToUserFavourite = async (userId, audioBookId, options) => {
  try {
    const favouriteList = await User.findByIdAndUpdate(
      userId,
      { $set: { [`favouriteAudioBooks.${audioBookId}`]: { audioBookId } } },
      options
    );

    return {
      status: "SUCCESS",
      data: favouriteList,
    };

    if (favouriteList) {
      return {
        status: "SUCCESS",
        data: favouriteList,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C0C" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C0B", // for only development purpose while debugging
      },
    };
  }
};

const removeFromUserFavourite = async (userId, audioBookId, options) => {
  try {
    const favouriteList = await User.findByIdAndUpdate(
      userId,
      { $unset: { [`favouriteAudioBooks.${audioBookId}`]: "" } },
      options
    );

    if (favouriteList) {
      return {
        status: "SUCCESS",
        data: favouriteList,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C0E" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C0D", // for only development purpose while debugging
      },
    };
  }
};

const getUserFavouriteList = async (userId) => {
  try {
    const favouriteList = await User.aggregate([
      // Stage 1: Filter the documents by the userId
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      // Stage 2: Reshape the favouriteAudioBooks map into an array of key-value pairs
      {
        $project: {
          favouriteAudioBooks: {
            $objectToArray: "$favouriteAudioBooks",
          },
        },
      },
      // Stage 3: Deconstruct the array of key-value pairs into separate documents
      {
        $unwind: {
          path: "$favouriteAudioBooks",
        },
      },
      // Stage 4: Join the documents with the audiobooks collection on the audioBookId field
      {
        $lookup: {
          from: "audiobooks",
          localField: "favouriteAudioBooks.v.audioBookId",
          foreignField: "_id",
          as: "audioBookDetails",
        },
      },
      // Stage 5: Deconstruct the audioBookDetails array into separate documents
      {
        $unwind: {
          path: "$audioBookDetails",
        },
      },
      // Stage 6: Keep only the relevant fields from each document
      {
        $project: {
          _id: 1,
          audioBookId: "$favouriteAudioBooks.v.audioBookId",
          addedAt: "$favouriteAudioBooks.v.addedAt",
          title: "$audioBookDetails.title",
          description: "$audioBookDetails.description",
          language: "$audioBookDetails.language",
          num_sections: "$audioBookDetails.num_sections",
          totaltimesecs: "$audioBookDetails.totaltimesecs",
          genres: "$audioBookDetails.genres",
        },
      },
    ]).exec();

    if (favouriteList) {
      return {
        status: "SUCCESS",
        data: favouriteList,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C10" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C0F", // for only development purpose while debugging
      },
    };
  }
};

const getUserProfileInfo = async (userId) => {
  try {
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $project: {
          favouriteAudioBooks: {
            $objectToArray: "$favouriteAudioBooks",
          },
        },
      },
      {
        $unwind: {
          path: "$favouriteAudioBooks",
        },
      },
      {
        $lookup: {
          from: "audiobooks",
          localField: "favouriteAudioBooks.v.audioBookId",
          foreignField: "_id",
          as: "audioBookDetails",
        },
      },
      {
        $unwind: {
          path: "$audioBookDetails",
        },
      },
      {
        $group: {
          _id: "$_id",
          favouriteBooks: {
            $push: {
              _id: "$favouriteAudioBooks.v.audioBookId",
              addedAt: "$favouriteAudioBooks.v.addedAt",
              title: "$audioBookDetails.title",
              description: "$audioBookDetails.description",
              language: "$audioBookDetails.language",
              num_sections: "$audioBookDetails.num_sections",
              totaltimesecs: "$audioBookDetails.totaltimesecs",
              genres: "$audioBookDetails.genres",
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
        },
      },
      {
        $project: {
          _id: 1,
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          username: "$user.username",
          role: "$user.role",
          createdAt: "$user.createdAt",
          updatedAt: "$user.updatedAt",
          favouriteBooks: 1,
        },
      },
    ]).exec();

    if (user) {
      return {
        status: "SUCCESS",
        data: user,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C12" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C11", // for only development purpose while debugging
      },
    };
  }
};

const updateUserProfileInfo = async (conditionObj, updateObj, options = {}) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      conditionObj,
      { $set: updateObj },
      options
    )
      .populate()
      .exec();

    if (updatedUser) {
      return {
        status: "SUCCESS",
        data: updatedUser,
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C14" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C13", // for only development purpose while debugging
      },
    };
  }
};

const deleteUserProfile = async (userId, options = {}) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: { isDeleted: true, loginSession: null },
      },
      options
    );

    if (user.isDeleted) {
      return {
        status: "SUCCESS",
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C16" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C15", // for only development purpose while debugging
      },
    };
  }
};

const getTopListenedGenres = async (userId, limit = 5) => {
  try {
    const topGenres = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $project: {
          listeningData: {
            $objectToArray: "$listeningData",
          },
        },
      },
      {
        $unwind: {
          path: "$listeningData",
        },
      },
      {
        $lookup: {
          from: "audiobooks",
          localField: "listeningData.k",
          foreignField: "_id",
          as: "audioBookDetail",
        },
      },
      {
        $unwind: {
          path: "$audioBookDetail",
        },
      },
      {
        $unwind: {
          path: "$audioBookDetail.genres",
        },
      },
      {
        $group: {
          _id: "$audioBookDetail.genres.name",
          userId: {
            $first: "$_id",
          },
          totalTimeListened: {
            $first: "$listeningData.v",
          },
        },
      },
      {
        $sort: {
          totalTimeListened: -1,
        },
      },
      {
        $limit: limit,
      },
      {
        $group: {
          _id: "$userId",
          genres: {
            $push: "$_id",
          },
        },
      },
    ]).exec();

    if (topGenres.length) {
      return {
        status: "SUCCESS",
        data: topGenres[0],
      };
    } else {
      return {
        status: "FAILED",
        error: { identifier: "0x000C18" }, // for only development purpose while debugging
      };
    }
  } catch (error) {
    return {
      status: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000C17", // for only development purpose while debugging
      },
    };
  }
};

module.exports = {
  saveUser,
  getUserById,
  getUserByUsername,
  setSessionString,
  updateUserListeningData,
  addToUserFavourite,
  removeFromUserFavourite,
  getUserFavouriteList,
  getUserProfileInfo,
  updateUserProfileInfo,
  deleteUserProfile,
  getTopListenedGenres,
};
