const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
const passport = require('passport');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), authController.googleCallback);

// Protected routes
router.use(authMiddleware.protect);
router.get('/me', authController.getMe);

module.exports = router;
