const Joi = require("joi");

const userRegisterSchema = Joi.object({
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
  username: Joi.string()
    .max(30)
    .pattern(new RegExp(/^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/))
    .required(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .uppercase()
    .valid("LISTENER", "NARRATOR", "ADMIN")
    .required(),
});

const userLoginSchema = Joi.object({
  username: Joi.string()
    .max(30)
    .pattern(new RegExp(/^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/))
    .required(),
  password: Joi.string().min(8).required(),
});

const userListeningDataSchema = {
  BODY: Joi.object({ time: Joi.number().min(0).required() }),

  PARAMS: Joi.object({ audioBookId: Joi.string().required() }),
};

const updateUserProfileSchema = Joi.object({
  firstName: Joi.string().trim().optional(),
  lastName: Joi.string().trim().optional(),
  username: Joi.string()
    .max(30)
    .pattern(new RegExp(/^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/))
    .optional(),
});

module.exports = {
  userRegisterSchema,
  userLoginSchema,
  userListeningDataSchema,
  updateUserProfileSchema,
};
