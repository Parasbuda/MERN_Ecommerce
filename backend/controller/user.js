const express = require("express");
const path = require("path");
const router = express.Router();
const { upload } = require("../multer");
const User = require("../model/user");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../middleware/auth");
const user = require("../model/user");
const multer = require("multer");
router.post("/create-user", upload.single("file"), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userEmail = await User.findOne({ email });
    if (userEmail) {
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

    const user = {
      name,
      email,
      password,
      avatar: fileUrl,
    };

    const activationToken = createActivationToken(user);
    const activationUrl = `http://localhost:3000/activation/${activationToken}`;
    try {
      // send mail
      await sendMail({
        email: user?.email,
        subject: "Activate your account",
        message: `Hello ${user.name}, please click on the link below to activate your account: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${user.email} to activate your account!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// function for activation Token

const createActivationToken = (user) => {
  return jwt.sign(user, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// activate user

router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activationToken } = req.body;
      const newUser = jwt.verify(
        activationToken,
        process.env.ACTIVATION_SECRET
      );
      if (!newUser) {
        return next(new ErrorHandler("Invalid Token", 400));
      }
      let user = await User.findOne({ email: newUser.email });
      if (user) {
        return next(new ErrorHandler("User already registered", 400));
      }
      user = await User.create(newUser);
      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// login
router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new ErrorHandler("Please provide the credentials", 400));
      }
      const user = await User.findOne({ email }).select("password");
      if (!user) {
        return next(new ErrorHandler("User not registered", 400));
      }
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return next(new ErrorHandler("credentials did not matched", 400));
      }
      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// load user

router.get(
  "/get-user",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return next(new ErrorHandler("User does not exist", 400));
      }
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res
        .status(200)
        .json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, password, email, phoneNumber } = req.body;
      const user = await User.findOne({ email }).select("password");
      console;
      if (!user) {
        return next(new ErrorHandler("User does not registered", 400));
      }
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide correct information", 400)
        );
      }
      const updatedUser = await User.findByIdAndUpdate(
        user?.id,
        { name, email, phoneNumber },
        {
          new: true,
        }
      );
      // user.name = name;
      // user.phoneNumber = phoneNumber;
      // user.email = email;
      // await user.save();
      res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

router.put(
  "/update-avatar",
  isAuthenticated,
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user?._id);
      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }
      const oldAvatar = `uploads/${user.avatar}`;
      fs.unlinkSync(oldAvatar);
      const filename = req.file.filename;
      const fileUrl = path.join(filename);
      const updatedUser = await User.findByIdAndUpdate(
        user?._id,
        { avatar: fileUrl },
        { new: true }
      );
      res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { country, city, address1, address2, zipCode, addressType } =
        req.body;
      const user = await User.findById(req.user?._id);
      if (!user) {
        return next(new ErrorHandler(error, 400));
      }
      const sameAddress = user.addresses.find(
        (address) => address.addressType === addressType
      );
      if (sameAddress) {
        return next(new ErrorHandler(`${addressType} is already added.`, 400));
      }
      const updatedUser = await User.findByIdAndUpdate(
        user?._id,
        {
          addresses: [
            ...user.addresses,
            { country, city, address1, address2, zipCode, addressType },
          ],
        },
        { new: true }
      );
      res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
module.exports = router;
