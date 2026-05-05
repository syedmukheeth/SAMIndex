const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
const passport = require('passport');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error('[Auth] Passport Auth Error:', err);
      return res.status(500).json({ status: 'error', message: err.message, detail: err });
    }
    if (!user) {
      console.warn('[Auth] No user found in Passport callback:', info);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
    }
    req.user = user;
    authController.googleCallback(req, res);
  })(req, res, next);
});

// Protected routes
router.use(authMiddleware.protect);
router.get('/me', authController.getMe);

module.exports = router;
