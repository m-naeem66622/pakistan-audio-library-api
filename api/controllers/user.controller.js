const UserModel = require("../models/user.model");
const AudioBookModel = require("../models/audioBook.model");

const updateUserListening = async (req, res) => {
  try {
    const { time } = req.body;
    const { audioBookId } = req.params;
    const { _id: userId } = req.decodedToken;

    const audioBook = await AudioBookModel.getAudioBookById([
      { $match: { _id: audioBookId } },
    ]);

    if (audioBook.status !== "SUCCESS") {
      return res.status(404).send({
        message: "FAILED",
        description: "Book not found",
      });
    }

    const dataUpdated = await UserModel.updateUserListeningData(
      userId,
      audioBookId,
      time
    );

    if (dataUpdated.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Update listening data failed",
        error: dataUpdated.error,
      });
    }

    res.status(200).send({ message: "SUCCESS" });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000F01", // for only development purpose while debugging
      },
    });
  }
};

const addToUserFavourite = async (req, res) => {
  try {
    const { audioBookId } = req.params;
    const { _id: userId } = req.decodedToken;

    const audioBook = await AudioBookModel.getAudioBookById([
      { $match: { _id: audioBookId } },
    ]);

    if (audioBook.status !== "SUCCESS") {
      return res.status(404).send({
        message: "FAILED",
        description: "Book not found",
      });
    }

    const options = { new: true, fields: `favouriteAudioBooks.${audioBookId}` };

    const updatedFavouriteList = await UserModel.addToUserFavourite(
      userId,
      audioBookId,
      options
    );

    if (updatedFavouriteList.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Not added to favourite",
        error: updatedFavouriteList.error,
      });
    }

    res
      .status(200)
      .send({ message: "SUCCESS", data: updatedFavouriteList.data });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000F02", // for only development purpose while debugging
      },
    });
  }
};

const removeFromUserFavourite = async (req, res) => {
  try {
    const { audioBookId } = req.params;
    const { _id: userId } = req.decodedToken;

    const audioBook = await AudioBookModel.getAudioBookById([
      { $match: { _id: audioBookId } },
    ]);

    if (audioBook.status !== "SUCCESS") {
      return res.status(404).send({
        message: "FAILED",
        description: "Book not found",
      });
    }

    const options = { new: true, fields: `favouriteAudioBooks.${audioBookId}` };

    const updatedFavouriteList = await UserModel.removeFromUserFavourite(
      userId,
      audioBookId,
      options
    );

    if (updatedFavouriteList.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Not removed from favourite",
        error: updatedFavouriteList.error,
      });
    }

    res
      .status(200)
      .send({ message: "SUCCESS", data: updatedFavouriteList.data });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000F03", // for only development purpose while debugging
      },
    });
  }
};

const getUserFavouriteList = async (req, res) => {
  try {
    const { _id: userId } = req.decodedToken;

    const updatedFavouriteList = await UserModel.getUserFavouriteList(userId);

    if (updatedFavouriteList.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Favourite not fetched",
        error: updatedFavouriteList.error,
      });
    }

    res
      .status(200)
      .send({ message: "SUCCESS", data: updatedFavouriteList.data });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000F04", // for only development purpose while debugging
      },
    });
  }
};

const getUserProfileInfo = async (req, res) => {
  try {
    const { _id: userId } = req.decodedToken;

    const updatedFavouriteList = await UserModel.getUserProfileInfo(userId);

    if (updatedFavouriteList.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Profile not fetched",
        error: updatedFavouriteList.error,
      });
    }

    res
      .status(200)
      .send({ message: "SUCCESS", data: updatedFavouriteList.data });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000F05", // for only development purpose while debugging
      },
    });
  }
};

const updateUserProfileInfo = async (req, res) => {
  try {
    const { _id } = req.decodedToken;
    const { username } = req.body;
    const userFound = await UserModel.getUserByUsername(username);

    if (userFound.status === "SUCCESS") {
      return res.status(409).json({
        message: "USERNMAE ALREADY EXIST",
      });
    }

    const updateObj = req.body;

    const updatedUser = await UserModel.updateUserProfileInfo(
      { _id },
      updateObj
    );

    if (updatedUser.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Profile not updated",
        error: updatedUser.error,
      });
    }

    const populatedUser = await UserModel.getUserProfileInfo(_id);

    if (populatedUser.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Profile not fetched but updated",
        error: populatedUser.error,
      });
    }

    res.status(200).send({ message: "SUCCESS", data: populatedUser.data });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000F06", // for only development purpose while debugging
      },
    });
  }
};

const deleteUserProfile = async (req, res) => {
  try {
    const { _id: userId } = req.decodedToken;

    const options = { new: true };
    const userDeleted = await UserModel.deleteUserProfile(userId, options);

    if (userDeleted.status !== "SUCCESS") {
      return res.status(422).send({
        message: "FAILED",
        description: "Profile not deleted",
        error: userDeleted.error,
      });
    }

    res.status(200).send({ message: "SUCCESS" });
  } catch (error) {
    return res.status(500).send({
      message: "INTERNAL SERVER ERROR",
      error: {
        message: error.message,
        identifier: "0x000F07", // for only development purpose while debugging
      },
    });
  }
};

module.exports = {
  updateUserListening,
  addToUserFavourite,
  removeFromUserFavourite,
  getUserFavouriteList,
  getUserProfileInfo,
  updateUserProfileInfo,
  deleteUserProfile,
};
