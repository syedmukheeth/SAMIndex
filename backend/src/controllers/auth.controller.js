const User = require('../models/User');
const { sendToken } = require('../utils/auth');
const passport = require('passport');

/**
 * Register User
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, avatar } = req.body;

    const newUser = await User.create({
      name,
      email,
      password,
      avatar,
      provider: 'email'
    });

    sendToken(newUser, 201, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message || 'Registration failed'
    });
  }
};

/**
 * Login User
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Please provide email and password' });
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password, user.password))) {
      return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });
    }

    // 3) If everything ok, send token to client
    sendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

/**
 * Google OAuth Callback
 */
exports.googleCallback = (req, res) => {
  // Passport has already authenticated the user and put it in req.user
  if (!req.user) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
  }

  const token = require('../utils/auth').signToken(req.user._id);
  
  // Redirect to frontend with token and user data
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const userData = encodeURIComponent(JSON.stringify({
    name: req.user.name,
    email: req.user.email,
    avatar: req.user.avatar
  }));
  
  res.redirect(`${frontendUrl}/?token=${token}&user=${userData}`);
};

/**
 * Get Current User
 */
exports.getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
};
