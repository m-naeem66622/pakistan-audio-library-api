const isAdmin = async (req, res, next) => {
  const role = req.decodedToken?.role;

  if (role === "ADMIN") {
    next();
  } else {
    return res.status(401).json({
      message: "INVALID USER",
      identifier: "0x000E06", // for only development purpose while debugging
    });
  }
};

const isListener = async (req, res, next) => {
  const role = req.decodedToken?.role;

  if (role === "LISTENER") {
    next();
  } else {
    return res.status(401).json({
      message: "INVALID USER",
      identifier: "0x000E07", // for only development purpose while debugging
    });
  }
};

const isNarrator = async (req, res, next) => {
  const role = req.decodedToken?.role;

  if (role === "NARRATOR") {
    next();
  } else {
    return res.status(401).json({
      message: "INVALID USER",
      identifier: "0x000E08", // for only development purpose while debugging
    });
  }
};

module.exports = {
  isAdmin,
  isListener,
  isNarrator,
};
