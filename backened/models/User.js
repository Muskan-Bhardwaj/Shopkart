const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // CRITICAL: Define cart as an array of items
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, default: 1 }
    }
  ],
  wishlist: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
  ]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);