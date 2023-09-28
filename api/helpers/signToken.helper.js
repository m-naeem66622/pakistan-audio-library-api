const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const signToken = async (user) => {
  const tokenData = {
    _id: user._id,
    role: user.role,
    session: user.loginSession,
  };

  const signedToken = await jwt.sign(tokenData, JWT_SECRET);
  return signedToken;
};

module.exports = {
  signToken,
};
