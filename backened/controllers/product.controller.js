const Product = require('../models/product.model');
const mongoose = require('mongoose');

// TASK 2: Create a Product
const createProduct = async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ success: true, product });
    } catch (error) {
        // This catches your strict Mongoose validation errors (like negative stock)
        res.status(400).json({ success: false, message: error.message });
    }
};

// TASKS 3 & 5: Get All Products + Search & Filter + Bonus (Sorting)
const getProducts = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database is not connected' });
        }

        const { search, category, sort } = req.query;
        const query = {};

        if (typeof search === 'string' && search.trim()) {
            const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.name = { $regex: escapedSearch, $options: 'i' };
        }

        if (typeof category === 'string' && category.trim()) {
            query.category = category.trim();
        }

        let productQuery = Product.find(query);
        if (sort === 'price_asc') productQuery = productQuery.sort({ price: 1 });
        if (sort === 'price_desc') productQuery = productQuery.sort({ price: -1 });

        const products = await productQuery.exec();
        return res.status(200).json({ success: true, count: products.length, products });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


const getProductById = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database is not connected' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, product });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { createProduct, getProducts, getProductById };