const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { task } = require("./dependencies/cron-jobs");
dotenv.config(); // configure before importing connectToDatabase;

process.on("unhandledRejection", (reason, promise) => {
  console.log("Reason:", reason);
});

const { connectToDatabase } = require("./dependencies/db");

connectToDatabase();

const app = express();
const PORT = process.env.PORT || "5000";

app.use(cors());
app.use(express.json());
app.use("/files", express.static("uploads"));

// Available endpoints
const audioBookRouter = require("./api/routes/audioBook.route");
app.use("/api/audioBook", audioBookRouter);

const authRouter = require("./api/routes/auth.route");
app.use("/api/auth", authRouter);

const userRouter = require("./api/routes/user.route");
app.use("/api/user", userRouter);

app.use("/", (req, res) => {
  return res.status(404).json({
    message: "No such route found",
  });
});

app.listen(PORT, () => {
  console.log("server is running");
});
