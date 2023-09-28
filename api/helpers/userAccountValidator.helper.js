const { DateTime, Duration } = require("luxon");
const bcrypt = require("bcryptjs");

const userAccountValidator = async (body, user) => {
  const { isDeleted, isSuspended, blockedStatus } = user;
  let isMatch;

  /* The error occur while comparing
  password also lead to invalid credentials */
  try {
    isMatch = await bcrypt.compare(body.password, user.password);
  } catch (error) {
    return {
      statusCode: 401,
      message: "INVALID USER",
      description: "Wrong credentials",
    };
  }

  // User password not matched or user is deleted
  if (!isMatch || isDeleted) {
    return {
      statusCode: 401,
      message: "INVALID USER",
      description: "Wrong credentials",
    };
  }

  // If user is suspended
  if (isSuspended) {
    return {
      statusCode: 403,
      message: "ACCOUNT SUSPENDED",
      description: "Contact support for more.",
    };
  }

  // If user is blocked
  if (blockedStatus?.isBlocked) {
    const blockedAt = DateTime.fromJSDate(blockedStatus.blockedAt);
    const blockedFor = blockedStatus.blockedFor;
    const willUnblockAt = blockedAt.plus({ seconds: blockedFor });
    const remaining = willUnblockAt.diffNow().milliseconds;

    // The blocked time is elapsed
    if (remaining <= 0) {
      user.blockedStatus.isBlocked = false;
      user.blockedStatus.blockedAt = null;
      user.blockedStatus.blockedFor = 0;

      // Save the user document
      await user.save();

      return {
        message: "SUCCESS",
      };
    } else {
      // The user is still blocked
      const shifted = Duration.fromObject({
        millisecond: remaining,
      }).shiftTo("days", "hours", "minutes", "seconds");

      // Omitting the time units that reached to zero.
      const filtered = Object.keys(shifted.toObject()).reduce((result, key) => {
        const value = shifted[key];
        return value ? { ...result, [key]: Math.round(value) } : result;
      }, {});

      // Final formatted string
      const formatted = Duration.fromObject(filtered).toHuman();

      return {
        statusCode: 403,
        message: "ACCOUNT TEMPORARY BLOCKED",
        description: `Try again after ${formatted}.`,
      };
    }
  } else {
    // The user is not blocked, so return a success message
    return {
      message: "SUCCESS",
    };
  }
};

module.exports = { userAccountValidator };
