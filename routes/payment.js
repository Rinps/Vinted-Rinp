// Load packages
const express = require("express");
const formidable = require("express-formidable");
const isAuthenticated = require("../middleware/isAuthenticated");
const mongoose = require("mongoose");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// Load the Payment model.
const Payment = require("../models/Payment");
const Offer = require("../models/Offer");

// Define routes

// Allow an authenticated user to make a payment. Requires a token made using Stripe's API as well as these BODY params: "id" (Mongoose ID), "title" (String), "price" (Number), "owner" (String).
router.post("/payment", isAuthenticated, async (req, res) => {
  try {
    // Extract the request params
    const { id, title, price, owner, stripeToken } = req.fields;
    console.log("putain de test 1");
    console.log("putain de test 2");
    console.log("stripeToken: ", stripeToken);
    console.log("id", id);
    console.log("price", price);
    console.log("title", title);
    console.log("owner", owner);

    if (stripeToken && id && title && price && owner) {
      console.log("putain de test 3");
      // Make the transaction
      const response = await stripe.charges.create({
        amount: price * 100,
        currency: "eur",
        description: "lol",
        source: stripeToken,
      });
      console.log("putain de test 4");

      if (response) {
        // Now that the transaction has been made, we have to delete the offer.
        const offerToDelete = await Offer.findById(id);
        console.log("putain de test 5");
        const newPayment = new Payment({
          offer: {
            productName: offerToDelete.productName,
            productDescription: offerToDelete.productDescription,
            productPrice: offerToDelete.productPrice,
            productDetails: offerToDelete.productDetails,
            productImage: offerToDelete.productImage,
            owner: offerToDelete.owner,
          },
          payment: {
            buyer: req.user,
            stripeToken: stripeToken,
          },
        });
        console.log("putain de test 6");

        await newPayment.save();
        await offerToDelete.deleteOne();

        res.status(200).json({
          message: "isOKAYé",
        });
      } else {
        res.status(400).json({ message: "there was a problem with stripe" });
      }
    } else {
      res.status(400).json({ message: "Missing information" });
    }

    //res.json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
