const mongoose = require("mongoose");

const authorSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  first_name: { type: String, default: "" },
  last_name: { type: String, required: true },
  dob: String,
  dod: String,
});

const readerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  display_name: { type: String, required: true },
});

const sectionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  section_number: { type: String, required: true },
  title: { type: String, required: true },
  listen_url: { type: String, required: true },
  language: { type: String, required: true },
  playtime: { type: String, required: true },
  readers: [readerSchema],
});

const genreSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
});

const translatorSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  first_name: { type: String, default: "" },
  last_name: { type: String, required: true },
  dob: String,
  dod: String,
});

const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const audioBookSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    language: { type: String, required: true },
    copyright_year: String,
    num_sections: { type: String, required: true },
    totaltimesecs: { type: Number, required: true },
    score: { type: Number, default: 0 },
    authors: [authorSchema],
    sections: [sectionSchema],
    genres: [genreSchema],
    translators: [translatorSchema],
    totalTimeListened: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    reviews: { type: Map, of: reviewSchema },
  },
  { timestamps: true }
);

const AudioBook = mongoose.model("AudioBook", audioBookSchema);

module.exports = { AudioBook };
