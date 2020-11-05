const mongoose = require("mongoose");
const User = require("./User");

const Offer = mongoose.model("Offer", {
  productName: String,
  productDescription: String,
  productPrice: Number,
  productDetails: Array,
  productImage: { type: mongoose.Schema.Types.Mixed, defaults: {} },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
  },
});

module.exports = Offer;
