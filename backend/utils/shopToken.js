const sendShopToken = (seller, statusCode, res) => {
  const token = seller.getJwtToken();
  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: true,
  };

  res
    .status(statusCode)
    .cookie("sellerToken", token, options)
    .json({ success: true, seller, token });
};
module.exports = sendShopToken;
