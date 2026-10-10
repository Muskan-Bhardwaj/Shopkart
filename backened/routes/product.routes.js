const express = require('express');
const router = express.Router();
const { getProducts } = require('../controllers/product.controller');

// GET /api/products
router.get('/', getProducts);

module.exports = router;