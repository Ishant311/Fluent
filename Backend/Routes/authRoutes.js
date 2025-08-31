const express = require('express');
const { signin, signup } = require('../Controller/authController');

const router = express.Router();

// User registration
router.post('/signup', signup);

// User login
router.post('/signin', signin);

module.exports = router;
