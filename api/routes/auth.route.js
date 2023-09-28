const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
} = require("../controllers/auth.controller");
const {
  validateRequest,
} = require("../middlewares/validateRequest.middleware");
const {
  userRegisterSchema,
  userLoginSchema,
} = require("../validators/user.validator");
const { authentication } = require("../middlewares/authentication.middleware");
const { isListener } = require("../middlewares/authorization.middleware");

const authRouter = express.Router();

authRouter.post(
  "/register",
  validateRequest(userRegisterSchema, "BODY"),
  registerUser
);

authRouter.post("/login", validateRequest(userLoginSchema, "BODY"), loginUser);

authRouter.post("/logout", authentication, isListener, logoutUser);

module.exports = authRouter;
