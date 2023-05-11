const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const Coupon = require("../model/coupon");
const Shop = require("../model/shop");
const { isSeller } = require("../middleware/auth");
const router = express.Router();
// create Coupon

router.post(
  "/create-coupon",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponData = req.body;
      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);
      couponData.shop = shop;
      const isCouponExists = await Coupon.find({ name: couponData?.name });
      if (isCouponExists.length > 0) {
        return next(
          new ErrorHandler("Coupon with this name already exists.", 400)
        );
      }
      const coupon = await Coupon.create(couponData);
      res.status(201).json({ success: true, coupon });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
router.get(
  "/get-coupon/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.params.id;
      const coupons = await Coupon.find({ shopId });
      res.status(200).json({ success: true, coupons });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
router.delete(
  "/delete-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponId = req.params.id;
      const coupon = await Coupon.findByIdAndDelete(couponId);
      if (!coupon) {
        return next(new ErrorHandler("Coupon not found with this id!", 500));
      }
      res
        .status(200)
        .json({ success: true, message: "Coupon deleted successfully." });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
module.exports = router;
