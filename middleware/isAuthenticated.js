const User = require("../models/User");

// Check if someone who send a request is logged in.
const isAuthenticated = async (req, res, next) => {
  // First, check if the request has a suitable header.
  if (!req.headers.authorization) {
    return res.status(401).json({ message: "Action not allowed" });
  } else {
    // If it doess, check if a user has the requests token.
    const user = await User.findOne({
      token: req.headers.authorization.replace("Bearer ", ""),
    });
    // If it doesn't, return an error.
    if (!user) {
      return res.status(401).json({ message: "Action not allowed" });
    } else {
      // If it does, add the user to the request parameters and returns it.
      req.user = user;
      return next();
    }
  }

  // req.header.authorization.replace("Bearer ", "");
  // const userToken = req.header.authorization;
  // const user = await User.findOne({token : userToken});
  // if (user) {
  //     return next();
  // } else {
  //     res.status(401).json({message : "Action not allowed."});
  // }
};

module.exports = isAuthenticated;
