const mongoose = require("mongoose");
const User = require("./User");

const Payment = mongoose.model("Payment", {
  offer: {
    productName: String,
    productDescription: String,
    productPrice: Number,
    productDetails: Object,
    productImage: { type: mongoose.Schema.Types.Mixed, defaults: {} },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
    },
  },
  payment: {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
    },
    stripeToken: String,
  },
});

module.exports = Payment;
