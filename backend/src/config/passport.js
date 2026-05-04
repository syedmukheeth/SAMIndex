const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback';
  console.log(`[Passport] Initializing Google Strategy with callback: ${callbackURL}`);
  
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback',
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        console.log(`[Passport] Google callback triggered for: ${profile.emails[0].value}`);
        try {
          const { id, displayName, emails, photos } = profile;
          const email = emails[0].value;
          const avatar = photos[0].value;

          // Upsert User
          let user = await User.findOne({ email });

          if (user) {
            // Update existing user if needed
            if (user.provider !== 'google') {
              user.provider = 'google';
              user.googleId = id;
              user.avatar = avatar || user.avatar;
              await user.save({ validateBeforeSave: false });
            }
            return done(null, user);
          }

          // Create new user
          user = await User.create({
            name: displayName,
            email,
            avatar,
            googleId: id,
            provider: 'google'
          });

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
} else {
  console.warn('[Passport] Google OAuth skipped: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not found.');
}

// We don't need sessions since we're using JWT
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

module.exports = passport;
