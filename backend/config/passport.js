import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { getBackendUrl } from './env.js';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${getBackendUrl()}/api/auth/google/callback`,
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ 
        $or: [
          { googleId: profile.id },
          { emailId: profile.emails[0].value.toLowerCase() }
        ]
      });

      if (user) {
        // Update googleId if not present
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
        return done(null, user);
      }

      // If not, create new user
      user = await User.create({
        googleId: profile.id,
        emailId: profile.emails[0].value.toLowerCase(),
        name: profile.displayName,
        passwordHash: 'oauth-placeholder-' + Math.random(), // Required by schema
        role: 'customer'
      });

      return done(null, user);
    } catch (err) {
      console.error('Passport Google Strategy Error:', err);
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
