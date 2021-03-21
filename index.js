// Load environementals variables.
require("dotenv").config();

// Packages import
const express = require("express");
const cors = require("cors");
const formidable = require("express-formidable");
const mongoose = require("mongoose");

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

// Initialize server
const app = express();
app.use(cors());
app.use(formidable());

// Routes import
const userRoutes = require("./routes/user");
app.use(userRoutes);

const offerRoutes = require("./routes/offer");
app.use(offerRoutes);

const paymentRoutes = require("./routes/payment");
app.use(paymentRoutes);

// Catch non defined routes
app.all("*", (req, res) => {
  res
    .status(404)
    .json({ message: "Route not found, please try another request." });
});

// Launch server
app.listen(process.env.PORT, () => {
  console.log("3... 2... 1... VINTED LAUNCHED TO THE MOOOOOOOOOOOOOOOON!!!");
});
