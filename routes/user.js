// Import packages
const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

// Models import
const User = require("../models/User");
const Offer = require("../models/Offer");

// Routes definition

router.post("/user/signup", async (req, res) => {
  // Allow a user to create an acount. Require these BODY parameters: "name" (String), "mail" (String) and "password" (String)
  try {
    // Get informations out of the request and check if correct BODY parameters have been given.
    const userName = req.fields.name;
    const userMail = req.fields.mail;
    const userPassword = req.fields.password;

    // Then check if these informations were indeed in the request.
    if (userName) {
      if (userMail) {
        if (userPassword) {
          // Then, check if this email already exists in the database.
          console.log("email : ", userMail);
          const existingUser = await User.find({
            account: { email: userMail },
          });
          console.log("User.findOne : ", existingUser);
          if (existingUser.length !== 0) {
            res.status(400).json({
              message: "This email adress has an already existing account.",
            });
          } else {
            // Create the salt, then the hash.
            const userSalt = uid2(16);
            const userHash = SHA256(userPassword + userSalt).toString(
              encBase64
            );
            const userToken = uid2(16);
            const newUser = new User({
              token: userToken,
              email: userMail,
              account: { username: userName },
              salt: userSalt,
              hash: userHash,
            });

            await newUser.save();
            res.status(200).json({
              email: newUser.email,
              username: newUser.account.username,
              token: newUser.token,
            });
          }
        } else {
          res.status(400).json({ message: "Please enter a password." });
        }
      } else {
        res.status(400).json({ message: "Please enter an email adress." });
      }
    } else {
      res
        .status(400)
        .json({ message: "Please enter a user name for your account." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  // Allow a user to access his account if correct mail and password are specified. Require these BODY parameters: "email" (String), "password" (String)
  try {
    const mail = req.fields.email;
    const password = req.fields.password;

    // Check if the account exists.
    const account = await User.find({ email: mail });
    if (account.length === 0) {
      res.status(400).json({ message: "This account does not exist." });
    } else {
      // Check if the password is correct.
      const userHash = account[0].hash;
      const userSalt = account[0].salt;
      if (userHash === SHA256(password + userSalt).toString(encBase64)) {
        res.status(200).json({
          _id: account[0]._id,
          token: account[0].token,
          account: {
            username: account[0].account.username,
            phone: account[0].account.phone,
          },
        });
      } else {
        res.status(400).json({ message: "Unauthorized" });
      }
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
