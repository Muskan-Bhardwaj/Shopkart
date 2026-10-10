const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require('../controllers/wishlist.controller');

router.get('/', authMiddleware, getWishlist);
router.post('/:productId', authMiddleware, addToWishlist);
router.delete('/:productId', authMiddleware, removeFromWishlist);

module.exports = router;
