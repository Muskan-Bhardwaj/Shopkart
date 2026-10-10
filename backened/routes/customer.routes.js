const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customer.controller');

// Fallback checks to prevent TypeError
const registerHandler = customerController.registerCustomer || customerController.register;
const loginHandler = customerController.loginCustomer || customerController.login;

router.post('/register', registerHandler);
router.post('/login', loginHandler);

module.exports = router;