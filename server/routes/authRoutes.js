const express = require('express');
const router = express.Router();
const { registerUser, authUser, updateCredentials, getGlobalTheme, updateGlobalTheme } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', authUser);
router.put('/profile', protect, updateCredentials);
router.get('/theme', protect, getGlobalTheme);
router.put('/theme', protect, updateGlobalTheme);

module.exports = router;
