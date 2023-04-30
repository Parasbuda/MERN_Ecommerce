const express = require("express");
const path = require("path");
const router = express.Router();
const { upload } = require("../multer");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../middleware/auth");
router.post("/create-shop", upload.single("file"), async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      description,
      address,
      phoneNumber,
      zipCode,
    } = req.body;
    const sellerEmail = await Shop.findOne({ email });
    if (sellerEmail) {
      const filename = req.file.filename;
      const filePath = `uploads/${filename}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          res.status(500).json({ message: "Error while delete file" });
        }
      });
      return next(new ErrorHandler("User already exists", 400));
    }
    const filename = req.file.filename;
    const fileUrl = path.join(filename);

    const seller = {
      name,
      email,
      password,
      description,
      address,
      phoneNumber,
      zipCode,
      avatar: fileUrl,
    };

    const activationToken = createActivationToken(seller);
    const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;
    try {
      // send mail
      await sendMail({
        email: seller?.email,
        subject: "Activate your account",
        message: `Hello ${seller.name}, please click on the link below to activate your account: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${seller.email} to activate your account!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// function for activation Token

const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// activate user

router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activationToken } = req.body;
      const newSeller = jwt.verify(
        activationToken,
        process.env.ACTIVATION_SECRET
      );
      if (!newSeller) {
        return next(new ErrorHandler("Invalid Token", 400));
      }
      let seller = await Shop.findOne({ email: newSeller.email });
      if (seller) {
        return next(new ErrorHandler("Seller already registered", 400));
      }
      seller = await Shop.create(newSeller);
      sendToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// login
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new ErrorHandler("Please provide the credentials", 400));
      }
      const seller = await Shop.findOne({ email }).select("password");
      if (!seller) {
        return next(new ErrorHandler("Seller not registered", 400));
      }
      const isPasswordValid = await seller.comparePassword(password);
      if (!isPasswordValid) {
        return next(new ErrorHandler("credentials did not matched", 400));
      }
      sendToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// load user

router.get(
  "/get-seller",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.shop.id);
      if (!seller) {
        return next(new ErrorHandler("Seller does not exist", 400));
      }
      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

module.exports = router;
