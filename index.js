// Load environementals variables.
require("dotenv").config();

// Packages import
const express = require("express");
const cors = require("cors");
const formidable = require("express-formidable");
const mongoose = require("mongoose");

// Database connection
mongoose.connect("mongodb://localhost/vinted", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndexes: true,
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

// Catch non defined routes
app.all("*", (req, res) => {
  res
    .status(404)
    .json({ message: "Route not found, please try another request." });
});

// Launch server
app.listen(3000, () => {
  console.log("3... 2... 1... VINTED LAUNCHED TO THE MOOOOOOOOOOOOOOOON!!!");
});
