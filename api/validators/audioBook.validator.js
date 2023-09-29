const Joi = require("joi");

const authorSchema = Joi.object({
  _id: Joi.string().required(),
  first_name: Joi.string().default(""),
  last_name: Joi.string().required(),
  dob: Joi.string(),
  dod: Joi.string(),
});

const readerSchema = Joi.object({
  _id: Joi.string().required(),
  display_name: Joi.string().required(),
});

const sectionSchema = Joi.object({
  _id: Joi.string().required(),
  section_number: Joi.string().required(),
  title: Joi.string().required(),
  listen_url: Joi.string().required(),
  language: Joi.string().required,
  playtime: Joi.string().required(),
  readers: Joi.array().items(readerSchema),
});

const genreSchema = Joi.object({
  _id: Joi.string().required(),
  name: Joi.string().required(),
});

const translatorSchema = Joi.object({
  _id: Joi.string().required(),
  first_name: Joi.string().default(""),
  last_name: Joi.string().required(),
  dob: Joi.string(),
  dod: Joi.string(),
});

const audioBookInfoSchema = Joi.object({
  _id: Joi.string().required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  language: Joi.string().required(),
  num_sections: Joi.string().required(),
  totaltimesecs: Joi.number().required(),
  authors: Joi.array().items(authorSchema),
  sections: Joi.array().items(sectionSchema),
  genres: Joi.array().items(genreSchema),
  translators: Joi.array().items(translatorSchema),
});

const validValues = [
  "title",
  "description",
  "language",
  "num_sections",
  "totaltimesecs",
  "score",
  "authors",
  "sections",
  "genres",
  "translators",
  "totalTimeListened",
  "rank",
  "reviews",
];

const getSingleAudioBookSchema = Joi.object({
  exclude: Joi.array().items(Joi.string().valid(...validValues)),
  include: Joi.array().items(Joi.string().valid(...validValues)),
}).oxor("include", "exclude");

const getAudioBooksSchema = Joi.object({
  exclude: Joi.array().items(Joi.string().valid(...validValues)),
  include: Joi.array().items(Joi.string().valid(...validValues)),
  limit: Joi.number().min(0).max(10).required(),
  page: Joi.number().min(1).required(),
}).oxor("include", "exclude");

const searchAudioBooksSchema = Joi.object({
  exclude: Joi.array().items(Joi.string().valid(...validValues)),
  include: Joi.array().items(Joi.string().valid(...validValues)),
  title: Joi.string(),
  language: Joi.string(),
  authors: Joi.array().items(Joi.string()),
  genres: Joi.array().items(Joi.string()),
  translators: Joi.array().items(Joi.string()),
  limit: Joi.number().min(0).max(10).required(),
  page: Joi.number().min(1).required(),
});

const audioBookStreamSchema = Joi.object({
  audioBookId: Joi.string().required(),
  sectionId: Joi.string().required(),
});

const audioBookScoreSchema = {
  BODY: Joi.object({
    type: Joi.string().valid("CLICK", "ADD_TO_FAVOURITE").required(),
  }),

  PARAMS: Joi.object({
    audioBookId: Joi.string().required(),
  }),
};

const audioBookReviewSchema = {
  PARAMS: Joi.object({
    audioBookId: Joi.string().required(),
  }),

  PARAMS_WITH_REVIEWID: Joi.object({
    audioBookId: Joi.string().required(),
    reviewId: Joi.string().hex().length(24).required(),
  }),

  BODY: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    content: Joi.string().trim().min(15).required(),
  }),
};

module.exports = {
  audioBookInfoSchema,
  getSingleAudioBookSchema,
  getAudioBooksSchema,
  audioBookStreamSchema,
  searchAudioBooksSchema,
  audioBookScoreSchema,
  audioBookReviewSchema,
  validValues,
};
