const JWT = require("jsonwebtoken");
const { getUserById } = require("../models/user.model");
const JWT_SECRET = process.env.JWT_SECRET;

const authentication = async (req, res, next) => {
  try {
    const bearerToken = req.headers.authorization;
    const token = bearerToken?.split(" ")[1];

    // If token will not found from request
    if (!token) {
      return res.status(403).json({
        message: "INVALID USER",
        identifier: "0x000E01", // for only development purpose while debugging
      });
    }

    const decodedToken = JWT.verify(token, JWT_SECRET);

    // If token will not verified
    if (!decodedToken) {
      return res.status(403).json({
        message: "INVALID USER",
        identifier: "0x000E02", // for only development purpose while debugging
      });
    }

    // Projection to include only _id and loginSession that we need
    const projection = { _id: 1, loginSession: 1, isDeleted: 1 };
    // Get the user detail to verify the token _id and loginSession
    const { status, data } = await getUserById(decodedToken._id, projection);

    // If user already logged out
    if (data?.loginSession === null) {
      return res.status(403).json({
        message: "NOT ALLOWED",
        identifier: "0x000E05", // for only development purpose while debugging
      });
    }

    const isSessionMatched = data?.loginSession === decodedToken?.session;

    // If user not found or login session not matched
    if (status !== "SUCCESS" || !isSessionMatched || data?.isDeleted) {
      return res.status(403).json({
        message: "INVALID USER",
        identifier: "0x000E03", // for only development purpose while debugging
      });
    }

    /* All is good, attach the decoded token to
    the request for later use in controllers */
    req.decodedToken = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({
      message: "INVALID USER",
      identifier: "0x000E04", // for only development purpose while debugging
    });
  }
};

module.exports = {
  authentication,
};
