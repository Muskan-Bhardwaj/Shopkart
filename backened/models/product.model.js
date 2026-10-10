const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: [1, 'Price must be greater than 0'] },
    imageUrl: { type: String, required: true },
    category: { type: String, required: true },
    stock: {
        type: Number,
        required: true,
        min: [0, 'Stock cannot be negative'],
    },
    createdAt: {type: Date, default: Date.now},
})

module.exports = mongoose.model('Product', productSchema);