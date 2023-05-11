const express = require("express");
const Error = require("./middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
app.use("/", express.static("uploads"));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({ path: "backend/config/.env" });
}

// import routes

const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const Event = require("./controller/event");
const Coupon = require("./controller/coupon");
app.use("/api/v1/user", user);
app.use("/api/v1/shop", shop);
app.use("/api/v1/product", product);
app.use("/api/v1/event", Event);
app.use("/api/v1/coupon", Coupon);

// Its for error handling
app.use(Error);
module.exports = app;
