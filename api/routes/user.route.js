const express = require("express");

/* ----------------- Importing Controllers ----------------- */
const {
  updateUserListening,
  addToUserFavourite,
  removeFromUserFavourite,
  getUserFavouriteList,
  getUserProfileInfo,
  updateUserProfileInfo,
  deleteUserProfile,
} = require("../controllers/user.controller");
/* ----------------- Importing Controllers ----------------- */

/* ----------------- Importing Middlewares ----------------- */
const {
  validateRequest,
} = require("../middlewares/validateRequest.middleware");
const {
  userListeningDataSchema,
  updateUserProfileSchema,
} = require("../validators/user.validator");
const { authentication } = require("../middlewares/authentication.middleware");
const { isListener } = require("../middlewares/authorization.middleware");
const { asyncHandler } = require("../middlewares/asyncHandler.middleware");
/* ----------------- Importing Middlewares ----------------- */

const userRouter = express.Router();

/* ----------------- User Update Listening Data Route ----------------- */
userRouter.patch(
  "/listeningData/:audioBookId",
  validateRequest(userListeningDataSchema["BODY"], "BODY"),
  validateRequest(userListeningDataSchema["PARAMS"], "PARAMS"),
  authentication,
  isListener,
  updateUserListening
);
/* ----------------- User Update Listening Data Route ----------------- */

/* ----------------- User Favourites Management Routes ----------------- */
userRouter.post(
  "/favourite/:audioBookId",
  validateRequest(userListeningDataSchema["PARAMS"], "PARAMS"),
  authentication,
  isListener,
  addToUserFavourite
);
userRouter.delete(
  "/favourite/:audioBookId",
  validateRequest(userListeningDataSchema["PARAMS"], "PARAMS"),
  authentication,
  isListener,
  removeFromUserFavourite
);
userRouter.get("/favourites", authentication, isListener, getUserFavouriteList);
/* ----------------- User Favourites Management Routes ----------------- */

/* ----------------- User Profile Management Routes ----------------- */
userRouter.get("/profile", authentication, isListener, getUserProfileInfo);
userRouter.put(
  "/profile",
  validateRequest(updateUserProfileSchema, "BODY"),
  authentication,
  isListener,
  asyncHandler(updateUserProfileInfo)
);
userRouter.delete("/profile", authentication, isListener, deleteUserProfile);
/* ----------------- User Profile Management Routes ----------------- */

module.exports = userRouter;
