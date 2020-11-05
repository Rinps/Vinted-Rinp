// Load packages
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
// We're going to configure cloudinary right now.

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_USER,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const isAuthenticated = require("../middleware/isAuthenticated");

// Models import
const User = require("../models/User");
const Offer = require("../models/Offer");

// Define routes
router.post("/offers/publish", isAuthenticated, async (req, res) => {
  // Allow a user to publish an announcement. Requires a Header (Authorization Bearer Token) and these BODY parameters: "title" (String), "description" (String), "price" (Number), "details" (optionnal, Array) and "picture" (optionnal, File).
  try {
    // Extract every parameters and stores them in variables.
    const { title, description, price, details } = req.fields;
    const user = req.user;
    // Check if there's a title, description, price and user in res (user has been added in it during the authentification process).
    if (!title || !description || !price || !user) {
      res.status(400).json({ message: "Missing parameter in the request." });
    } else {
      // Check if the parameters do not exceed the range of what we allow users to input.
      if (title.length <= 50 && description.length <= 500 && price <= 100000) {
        // If we're OK, create the new offer and saves it in the database.
        const newOffer = new Offer({
          productName: title,
          productDescription: description,
          productPrice: price,
          productDetails: details,
          owner: user,
        });
        await newOffer.save();

        // Create a result variable in ordre to return a readable information to the user.
        const result = await Offer.findOne({ productName: title })
          .populate("owner")
          .populate("account");

        // Now, if we have a picture, we're going to process the image. First, check if there's an image attached to the request.
        const picture = req.files.picture;
        if (picture) {
          const picturePath = picture.path;
          // Then, get the offer's id in order to give the image a name on cloudinary.
          const offerId = newOffer._id;
          const resultPicture = await cloudinary.uploader.upload(picturePath, {
            resource_type: "image",
            folder: `vinted/offers/`,
            public_id: offerId,
            overwrite: false,
          });
          console.log(resultPicture);
          newOffer.productImage = resultPicture.secure_url;
          await newOffer.save();
        }
        res.status(200).json(result);
      } else {
        res.status(400).json({
          message:
            "Max length in title and description, or max value in price have been exceeded.",
        });
      }
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offers", async (req, res) => {
  // Display offers depending of various parameters. Requires at least one of these QUERY parameters: "title" (String), "priceMin" (Number), "priceMax" (Number) and "sort" (either "price-desc" or "price-asc"), as well as a mandatory parameter: "page" (Number).
  try {
    // Start by getting the parameters from the request. A lot of them will be store in a variable, as the program will have to fix their value if it hasn't been given.
    const { title, sort } = req.query;
    let { priceMin, priceMax, page } = req.query;
    let howToSort;
    const offersByPage = 2;

    // If priceMin, priceMax and sort have not been given, give them a value matching our database limit values.
    if (!priceMin) {
      priceMin = 0.0;
    }

    if (!priceMax) {
      priceMax = 100000.0;
    }
    console.log("sort : ", sort);

    if (sort === "price-desc") {
      console.log("test1");
      howToSort = { productPrice: "desc" };
    } else if (sort === "price-asc") {
      console.log("test2");
      howToSort = { productPrice: "asc" };
    } else {
      console.log("test3");
      howToSort = {};
    }

    if (!page) {
      page = 0;
    }

    console.log("priceMin : ", Number(priceMin));
    console.log("priceMax : ", Number(priceMax));
    console.log("sort : ", howToSort);

    if (title) {
      const offersToDisplay = await Offer.find({
        productName: new RegExp(title, "i"),
        productPrice: { $gte: Number(priceMin) },
        productPrice: { $lte: Number(priceMax) },
      })
        .sort(howToSort)
        .skip(offersByPage * page)
        .limit(offersByPage * page + offersByPage);
      res.status(200).json(offersToDisplay);
    } else {
      const offersToDisplay = await Offer.find({
        productPrice: { $gte: Number(priceMin) },
        productPrice: { $lte: Number(priceMax) },
      })
        .sort(howToSort)
        .skip(offersByPage * page)
        .limit(offersByPage * page + offersByPage);
      res.status(200).json(offersToDisplay);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account",
    });
    console.log(offer);
    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
module.exports = router;
