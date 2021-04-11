// Import packages
const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;
// We're going to configure cloudinary right now.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_USER,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Models import
const User = require("../models/User");
const Offer = require("../models/Offer");
const isAuthenticated = require("../middleware/isAuthenticated");

// Routes definition

// Allow a user to create an acount. Require these BODY parameters: "userName" (String), "userMail" (String) and "userPassword" (String). Also takes a picture parameter (File)
router.post("/user/signup", async (req, res) => {
  try {
    // Get informations out of the request and check if correct BODY parameters have been given.
    const userName = req.fields.userName;
    const userMail = req.fields.userMail;
    const userPassword = req.fields.userPassword;

    // Then check if these informations were indeed in the request.
    if (userName) {
      if (userMail) {
        if (userPassword) {
          // Then, check if this email already exists in the database.
          const existingUser = await User.find({
            account: { email: userMail },
          });
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

            // Now, if we have a picture, we're going to process the image. First, check if there's an image attached to the request.
            const picture = req.files.picture;
            if (picture) {
              const picturePath = picture.path;
              // Then, get the offer's id in order to give the image a name on cloudinary.
              const userId = newUser._id;
              const resultPicture = await cloudinary.uploader.upload(
                picturePath,
                {
                  resource_type: "image",
                  folder: `vinted/users/`,
                  public_id: userId,
                  overwrite: false,
                }
              );
              newUser.account.avatar = resultPicture.secure_url;
              await newUser.save();
            }
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

// Allow a user to access the user collection from Vinted database. Require no parameter.
router.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    const response = [];
    for (let i = 0; i < users.length; i++) {
      response.push({ account: users[i].account, id : users[i]._id });
    }
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Allow a user to access a single user data, require this QUERY parameter: id (Mongoose ID)
router.get("/user/:id", async (req, res) => {
  try {
    const id = req.params;
    const userSearched = await User.findById(id);
    res.status(200).json(userSearched);
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

router.put("/user/update", isAuthenticated, async (req, res) => {
  // This route allows a user to update his profile. For now, it only accepts a picture as a BODY parameter.
  try {
    const newPicture = req.files.picture;
    const user = req.user;

    if (newPicture) {
      const picturePath = newPicture.path;
      // Then, get the offer's id in order to give the image a name on cloudinary.
      const userId = user._id;
      const resultPicture = await cloudinary.uploader.upload(picturePath, {
        resource_type: "image",
        folder: `vinted/users/`,
        public_id: userId,
        overwrite: true,
      });
      user.account.avatar = resultPicture.secure_url;
      await user.save();
      res.status(200).json(user);
    } else {
      res.status(400).json({ message: "No picture given" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
