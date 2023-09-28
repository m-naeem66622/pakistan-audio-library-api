const mongoose = require("mongoose");

const connectionString = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@free-tier-cluster.zpxeooe.mongodb.net/${process.env.DB_NAME}`;
// const connectionString = `mongodb://127.0.0.1:27017/${process.env.DB_NAME}`;

const connectionOptions = {};

mongoose.set("strictQuery", true);

const connectToDatabase = () => {
  mongoose
    .connect(connectionString, connectionOptions)
    .then(() => console.log("MongoDB Connected"))
    .catch((error) => console.log(error));
};

module.exports = { connectToDatabase };
