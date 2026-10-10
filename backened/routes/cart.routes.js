const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');
const { getCart, addToCart, decreaseCartItem, removeCartItem } = require('../controllers/cartController');

router.get('/', authMiddleware, getCart);
router.post('/decrease/:productId', authMiddleware, decreaseCartItem);
router.delete('/:productId', authMiddleware, removeCartItem);
router.post('/:productId', authMiddleware, addToCart);

module.exports = router;