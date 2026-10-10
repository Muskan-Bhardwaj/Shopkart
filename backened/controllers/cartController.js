const User = require('../models/User'); // Check exact path to your User model

const getCart = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).populate('cart.productId');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, cart: user.cart || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id || req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const itemIndex = user.cart.findIndex((item) => {
      const idInCart = item.productId?._id ? item.productId._id.toString() : item.productId.toString();
      return idInCart === productId.toString();
    });

    if (itemIndex > -1) {
      user.cart[itemIndex].quantity += 1;
    } else {
      user.cart.push({ productId, quantity: 1 });
    }

    await user.save();
    const updatedUser = await User.findById(userId).populate('cart.productId');
    res.json({ success: true, cart: updatedUser.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const decreaseCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id || req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const itemIndex = user.cart.findIndex((item) => {
      const idInCart = item.productId?._id ? item.productId._id.toString() : item.productId.toString();
      return idInCart === productId.toString();
    });

    if (itemIndex > -1) {
      if (user.cart[itemIndex].quantity > 1) {
        user.cart[itemIndex].quantity -= 1;
      } else {
        user.cart.splice(itemIndex, 1);
      }
      await user.save();
    }

    const updatedUser = await User.findById(userId).populate('cart.productId');
    res.json({ success: true, cart: updatedUser.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { productId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.cart = (Array.isArray(user.cart) ? user.cart : []).filter((item) => {
      const idInCart = item?.productId?._id || item?.productId;
      return idInCart?.toString() !== productId;
    });

    await user.save();
    const updatedUser = await User.findById(userId).populate('cart.productId');
    return res.json({ success: true, cart: updatedUser?.cart || [] });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Export ALL handlers together
module.exports = {
  getCart,
  addToCart,
  decreaseCartItem,
  removeCartItem,
};