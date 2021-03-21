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
// Allow a user to publish an announcement. Requires a Header (Authorization Bearer Token) and these BODY parameters: "title" (String), "description" (String), "price" (Number), "picture" (optionnal, file) and "size" (optionnal, text) and "dreamFactor ((really) optionnal, text)".
router.post("/offers/publish", isAuthenticated, async (req, res) => {
  try {
    // Extract every parameters and stores them in variables.
    const { title, description, price, size, dreamFactor } = req.fields;
    const user = req.user;
    // Check if there's a title, description, price and user in res (user has been added in it during the authentification process).
    if (!title || !description || !price || !user) {
      res.status(400).json({ message: "Missing parameter in the request." });
    } else {
      // Check if the parameters do not exceed the range of what we allow users to input.
      if (
        title.length <= 50 &&
        description.length <= 500 &&
        price <= 10000000
      ) {
        // If we're OK, create the new offer and saves it in the database.
        const newOffer = new Offer({
          productName: title,
          productDescription: description,
          productPrice: price,
          productDetails: { size: size, Dream_factor: dreamFactor },
          owner: user,
        });
        await newOffer.save();

        // Create a result variable in order to return a readable information to the user.
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

// Display the whole offers database to the user.
router.get("/offers", async (req, res) => {
  try {
    const offers = await Offer.find();
    res.status(200).json(offers);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Display offers depending of various parameters. Requires at least one of these QUERY parameters: "title" (String), "priceMin" (Number), "priceMax" (Number) and "sort" (either "price-desc" or "price-asc"), as well as a mandatory parameter: "page" (Number).
router.get("/offers/search", async (req, res) => {
  try {
    // Start by getting the parameters from the request. A lot of them will be store in a variable, as the program will have to fix their value if it hasn't been given.
    const { title, sort } = req.query;
    let { priceMin, priceMax, page, offersLimit } = req.query;
    let howToSort;
    const offersByPage = parseInt(offersLimit);

    // If priceMin, priceMax and sort have not been given, give them a value matching our database limit values.
    if (!priceMin) {
      priceMin = 0.0;
    }

    if (!priceMax) {
      priceMax = 1000000000.0;
    }

    if (sort === "price-desc") {
      howToSort = { productPrice: "desc" };
    } else if (sort === "price-asc") {
      howToSort = { productPrice: "asc" };
    } else {
      howToSort = {};
    }

    if (!page) {
      page = 0;
    }

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

// Display a single offer based on the id the client gives.
router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account",
    });
    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update and offer. Require at least one of these BODY parameters: id (Mongoose ID, mandatory) name (String), description (String), price (Number), size (String), dream_factor (String, this one is for the joke!), image (File, not working for now).
router.put("/offer/update", isAuthenticated, async (req, res) => {
  try {
    // Extract the parameters and store them into a variable.
    const {
      id,
      name,
      description,
      price,
      size,
      dream_factor,
      picture,
    } = req.fields;

    if (id || name || description || price || size || dream_factor || picture) {
      const offer = await Offer.findById(id);
      const owner = await User.findById(offer.owner);

      if (owner.token === req.user.token) {
        if (name) {
          offer.name = name;
        }
        if (description) {
          offer.description = description;
        }
        if (price) {
          offer.price = price;
        }
        if (size && !dream_factor) {
          offer.productDetail = { size: size };
        }
        if (dream_factor && !size) {
          offer.productDetail = { dream_factor: dream_factor };
        }
        if (size && dream_factor) {
          offer.productDetail = { size: size, dream_factor: dream_factor };
        }
        await offer.save();
        res.status(200).json(offer);
      } else {
        res.status(400).json({ message: "Permission not granted" });
      }
    } else {
      res
        .status(400)
        .json({ message: "No parameter to update in the request." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
