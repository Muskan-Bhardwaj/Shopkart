const User = require('../models/User');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const alreadySaved = (Array.isArray(user.wishlist) ? user.wishlist : [])
      .some((savedProductId) => savedProductId.toString() === productId);
    if (!alreadySaved) user.wishlist.push(product._id);

    await user.save();
    return res.status(200).json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).populate({
      path: 'wishlist',
      select: 'name price category imageUrl description stock',
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const wishlist = Array.isArray(user.wishlist) ? user.wishlist : [];
    return res.status(200).json({ success: true, count: wishlist.length, wishlist });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { wishlist: productId } },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, wishlist: user.wishlist || [] });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { addToWishlist, getWishlist, removeFromWishlist };
