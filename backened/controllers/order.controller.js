const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/User');
const razorpay = require('../config/razorpay');

const requiredAddressFields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];

function getUserId(req) {
  return req.user?.id || req.user?._id;
}

function validateAddress(address) {
  if (!address || typeof address !== 'object') return 'Please provide your shipping address.';
  for (const field of requiredAddressFields) {
    if (typeof address[field] !== 'string' || !address[field].trim()) {
      return `${field} is required.`;
    }
  }
  if (!/^\d{10}$/.test(address.phone.trim())) return 'Phone must contain exactly 10 digits.';
  if (!/^\d{6}$/.test(address.pincode.trim())) return 'Pincode must contain exactly 6 digits.';
  return '';
}

const createPaymentOrder = async (req, res) => {
  let shopKartOrder;
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database is not connected.' });
    }
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Online payment is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backened/.env, then restart the backend.',
      });
    }

    const addressError = validateAddress(req.body?.shippingAddress);
    if (addressError) return res.status(400).json({ success: false, message: addressError });

    const user = await User.findById(getUserId(req));
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const cart = Array.isArray(user.cart) ? user.cart : [];
    if (cart.length === 0) return res.status(400).json({ success: false, message: 'Your cart is empty.' });

    const productIds = cart
      .map((item) => item?.productId?._id || item?.productId)
      .filter((productId) => productId && mongoose.isValidObjectId(productId));
    if (productIds.length !== cart.length) {
      return res.status(400).json({ success: false, message: 'Your cart contains an invalid product.' });
    }

    const products = await Product.find({ _id: { $in: productIds } });
    const productById = new Map(products.map((product) => [product._id.toString(), product]));
    const orderItems = [];
    let totalAmount = 0;

    for (const cartItem of cart) {
      const productId = (cartItem?.productId?._id || cartItem?.productId).toString();
      const product = productById.get(productId);
      const quantity = Number(cartItem?.quantity);
      if (!product) {
        return res.status(400).json({ success: false, message: 'A product in your cart is no longer available.' });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || Number(product.stock) < quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}.` });
      }

      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ success: false, message: `Invalid price for ${product.name}.` });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price,
        quantity,
        image: product.imageUrl || product.image || '',
      });
      totalAmount += price * quantity;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Order total must be greater than zero.' });
    }

    shopKartOrder = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress: Object.fromEntries(
        requiredAddressFields.map((field) => [field, req.body.shippingAddress[field].trim()]),
      ),
      totalAmount,
      paymentStatus: 'PENDING',
      status: 'PENDING_PAYMENT',
    });

    const amount = Math.round(totalAmount * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: shopKartOrder._id.toString(),
    });

    shopKartOrder.razorpayOrderId = razorpayOrder.id;
    await shopKartOrder.save();

    return res.status(201).json({
      success: true,
      shopKartOrderId: shopKartOrder._id,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    if (shopKartOrder) {
      try {
        shopKartOrder.paymentStatus = 'FAILED';
        await shopKartOrder.save();
      } catch (saveError) {
        console.error('Failed to mark payment order as failed:', saveError);
      }
    }
    return res.status(500).json({ success: false, message: error.message || 'Unable to create payment order.' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      shopKartOrderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body || {};

    if (!shopKartOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment verification details are incomplete.' });
    }
    if (!mongoose.isValidObjectId(shopKartOrderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ success: false, message: 'Payment verification is not configured.' });
    }

    const order = await Order.findById(shopKartOrderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.user.toString() !== String(getUserId(req))) {
      return res.status(403).json({ success: false, message: 'You are not allowed to verify this order.' });
    }
    if (order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Razorpay order does not match.' });
    }
    if (!/^[a-f0-9]{64}$/i.test(razorpaySignature)) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${order.razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    const received = Buffer.from(razorpaySignature, 'hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }
    if (order.paymentStatus === 'PAID' && order.razorpayPaymentId !== razorpayPaymentId) {
      return res.status(409).json({ success: false, message: 'This order has already been paid with a different payment.' });
    }

    const user = await User.findById(order.user);
    if (!user) return res.status(404).json({ success: false, message: 'Order owner not found.' });

    const wasAlreadyPaid = order.paymentStatus === 'PAID';
    if (!wasAlreadyPaid) {
      order.paymentStatus = 'PAID';
      order.status = 'PLACED';
      order.razorpayPaymentId = razorpayPaymentId;
      await order.save();
    }

    if (!order.cartClearedAt) {
      user.cart = [];
      await user.save();
      order.cartClearedAt = new Date();
      await order.save();
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to verify payment.' });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: getUserId(req) }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.user.toString() !== String(getUserId(req))) {
      return res.status(403).json({ success: false, message: 'You are not allowed to view this order.' });
    }
    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPaymentOrder, verifyPayment, getOrders, getOrderById };
