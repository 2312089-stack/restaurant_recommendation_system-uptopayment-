// backend/config/passport.js - EXPORT CONFIGURATION FUNCTION
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Export a configuration function instead of executing immediately
export function configurePassport() {
  console.log('\n========================================');
  console.log('🔐 CONFIGURING PASSPORT');
  console.log('========================================\n');

  // Check environment variables NOW (not at import time)
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  console.log('📋 Environment Variables Check:');
  console.log('  GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 30)}... ✅` : '❌ MISSING');
  console.log('  GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? '✅ Present (hidden)' : '❌ MISSING');
  console.log('  GOOGLE_CALLBACK_URL:', GOOGLE_CALLBACK_URL);

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('\n❌ CRITICAL: Google OAuth credentials missing!');
    console.error('Google Sign-In will NOT work!');
    console.error('Add to .env file:');
    console.error('  GOOGLE_CLIENT_ID=your_client_id');
    console.error('  GOOGLE_CLIENT_SECRET=your_client_secret');
    console.error('========================================\n');
    return false; // Return false to indicate failure
  }

  console.log('\n✅ Google OAuth credentials found!');
  console.log('🔧 Registering Google Strategy...\n');

  try {
    // Configure Google Strategy
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: GOOGLE_CALLBACK_URL,
          scope: ['profile', 'email'],
          passReqToCallback: false
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('\n🎯 Google OAuth Callback!');
            console.log('  Email:', profile.emails?.[0]?.value);

            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email from Google'), null);
            }

            const cleanEmail = email.toLowerCase().trim();
            let user = await User.findOne({ emailId: cleanEmail });

            if (user) {
              console.log('✅ Existing user:', cleanEmail);
              if (!user.googleId) {
                user.googleId = profile.id;
                user.authProvider = 'google';
                await user.save();
              }
              user.lastLogin = new Date();
              await user.save();
              return done(null, user);
            }

            console.log('📝 Creating new user...');
            user = new User({
              emailId: cleanEmail,
              name: profile.displayName || cleanEmail.split('@')[0],
              googleId: profile.id,
              authProvider: 'google',
              role: 'customer',
              onboardingCompleted: false,
              isActive: true,
              lastLogin: new Date()
            });

            await user.save();
            console.log('✅ User created:', cleanEmail);
            return done(null, user);

          } catch (error) {
            console.error('❌ OAuth callback error:', error);
            return done(error, null);
          }
        }
      )
    );

    console.log('✅✅✅ Google Strategy REGISTERED! ✅✅✅');
    
    // Verify registration
    const strategies = Object.keys(passport._strategies || {});
    console.log('📋 Registered strategies:', strategies);
    
    if (strategies.includes('google')) {
      console.log('✅ CONFIRMED: Google strategy is active!');
      console.log('========================================\n');
      return true; // Return true to indicate success
    } else {
      console.error('❌ ERROR: Google strategy not in list!');
      console.error('========================================\n');
      return false;
    }

  } catch (error) {
    console.error('\n❌❌❌ FATAL ERROR ❌❌❌');
    console.error('Failed to configure Google strategy!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================\n');
    return false;
  }
}

// Serialize/Deserialize
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Export passport instance
export default passport;