const express = require("express");
/* ----------------- Importing Controllers ----------------- */
const {
  addMultipleAudioBooks,
  getAudioBookInfo,
  updateAudioBookScore,
  getAudioFileStream,
  addAudioBookReview,
  getAudioBookReviewByUserId,
  getAudioBookReviewByReviewId,
  getAudioBooks,
  searchAudioBooks,
  getRecommendations,
} = require("../controllers/audioBook.controller");
/* ----------------- Importing Controllers ----------------- */

/* ----------------- Importing Middlewares ----------------- */
const { authentication } = require("../middlewares/authentication.middleware");
const { isListener } = require("../middlewares/authorization.middleware");
const {
  validateRequest,
} = require("../middlewares/validateRequest.middleware");
const {
  audioBookStreamSchema,
  audioBookScoreSchema,
  audioBookReviewSchema,
  getAudioBooksSchema,
  searchAudioBooksSchema,
  getSingleAudioBookSchema,
} = require("../validators/audioBook.validator");
const { rateLimiterHandler } = require("../middlewares/rateLimiter.middleware");
/* ----------------- Importing Middlewares ----------------- */

const audioBookRouter = express.Router();

/* ----------------- Update Book Scores Route ----------------- */
audioBookRouter.patch(
  "/:audioBookId/score",
  validateRequest(audioBookScoreSchema["BODY"], "BODY"),
  validateRequest(audioBookScoreSchema["PARAMS"], "PARAMS"),
  authentication,
  isListener,
  rateLimiterHandler,
  updateAudioBookScore
);
/* ----------------- Update Book Scores Route ----------------- */

/* ----------------- Browse Books Routes ----------------- */
audioBookRouter.get(
  "/",
  validateRequest(getAudioBooksSchema, "QUERY"),
  getAudioBooks
);
audioBookRouter.get(
  "/search",
  validateRequest(searchAudioBooksSchema, "QUERY"),
  searchAudioBooks
);
audioBookRouter.get(
  "/recommendations",
  validateRequest(getAudioBooksSchema, "QUERY"),
  authentication,
  isListener,
  getRecommendations
);
audioBookRouter.get(
  "/:audioBookId",
  validateRequest(getSingleAudioBookSchema, "QUERY"),
  getAudioBookInfo
);
/* ----------------- Browse Books Routes ----------------- */

/* ----------------- Streaming Book Route ----------------- */
audioBookRouter.get(
  "/stream/:audioBookId/:sectionId",
  validateRequest(audioBookStreamSchema, "PARAMS"),
  authentication,
  isListener,
  getAudioFileStream
);
/* ----------------- Streaming Book Route ----------------- */

/* ----------------- Book Reviewing Routes ----------------- */
audioBookRouter.post(
  "/:audioBookId/review",
  validateRequest(audioBookReviewSchema["PARAMS"], "PARAMS"),
  validateRequest(audioBookReviewSchema["BODY"], "BODY"),
  authentication,
  isListener,
  addAudioBookReview
);
audioBookRouter.put(
  "/:audioBookId/review",
  validateRequest(audioBookReviewSchema["PARAMS"], "PARAMS"),
  validateRequest(audioBookReviewSchema["BODY"], "BODY"),
  authentication,
  isListener,
  addAudioBookReview
);
audioBookRouter.get(
  "/:audioBookId/review",
  validateRequest(audioBookReviewSchema["PARAMS"], "PARAMS"),
  authentication,
  isListener,
  getAudioBookReviewByUserId
);
audioBookRouter.get(
  "/:audioBookId/review/:reviewId",
  validateRequest(audioBookReviewSchema["PARAMS_WITH_REVIEWID"], "PARAMS"),
  getAudioBookReviewByReviewId
);
/* ----------------- Book Reviewing Routes ----------------- */

// For Admin Purposes
audioBookRouter.post("/multiple", addMultipleAudioBooks);

module.exports = audioBookRouter;
