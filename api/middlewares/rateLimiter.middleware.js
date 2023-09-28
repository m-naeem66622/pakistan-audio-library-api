const mongoose = require("mongoose");
const {
  RateLimiterMongo,
  RateLimiterMemory,
} = require("rate-limiter-flexible");
const { User } = require("../schemas/user.schema");
const conn = mongoose.connection;

// Create a rate limiter instance
const rateLimiter = new RateLimiterMongo({
  storeClient: conn,
  tableName: "rate-limit",
  points: 25, // Maximum number of requests in one duration
  duration: 5 * 60, // Duration of one window in seconds (15 minutes)
  blockDuration: 86400, // Block duration in seconds (1 day)
  keyPrefix: "rlflx", // Prefix for monogoDB document's key
  execEvenly: false, // Do not delay requests
  insuranceLimiter: new RateLimiterMemory({ points: 1, duration: 5 * 60 }), // Fallback to memory if MongoDB fails
});

const rateLimiterHandler = async (req, res, next) => {
  // Consume one point from the user's limit
  rateLimiter
    .consume(`${req.decodedToken._id}_${req.params.audioBookId}`)
    .then((limiterRes) => {
      console.log("limitRes:", limiterRes);
      console.log("I am going to next");
      next();
    })
    .catch(async (limiterRes) => {
      console.log("I am calling block and suspension behaviour");

      const { _id } = req.decodedToken;

      // Find the user in the database by userId
      const user = await User.findOne({ _id });
      if (!user) {
        return res.status(404).send({
          message: "INVALID USER",
          description: "Invalid credentails",
        });
      }

      // Increment the blocked count
      console.log("Before:", user.blockedStatus.blockedCount);
      user.blockedStatus.blockedCount++;
      console.log("After:", user.blockedStatus.blockedCount);

      // Check if the user has reached the maximum number of offenses
      if (user.blockedStatus.blockedCount >= 3) {
        console.log("I am suspended");
        // Set isSuspended to true and save the user
        user.isSuspended = true;
        user.loginSession = null;

        await user.save();
        return res.status(429).send({ message: "ACCOUNT SUSPENDED" });
      } else {
        console.log("I am not suspended");
        let blockedFor = 86400; // ( default block for 1 day)
        if (user.blockedStatus.blockedCount === 1)
          blockedFor = 86400; // ( block for 1 day)
        else if (user.blockedStatus.blockedCount === 2) blockedFor = 86400 * 3; // ( block for 3 days)

        // Set the blocked details and expire the session
        console.log("blockedFor:", blockedFor);
        user.blockedStatus.isBlocked = true;
        user.blockedStatus.blockedAt = Date.now();
        user.blockedStatus.blockedFor = blockedFor;
        user.loginSession = null;

        // Save the user
        await user.save();
        return res.status(429).send({ message: "ACCOUNT TEMPORARY BLOCKED" });
      }
    });
};

module.exports = { rateLimiterHandler };
