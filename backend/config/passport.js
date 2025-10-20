// config/passport.js - UPDATED: Don't auto-create users on Google login
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

export function configurePassport() {
  console.log('\n========================================');
  console.log('🔐 CONFIGURING PASSPORT');
  console.log('========================================\n');

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google';

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('\n❌ CRITICAL: Google OAuth credentials missing!');
    return false;
  }

  try {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: GOOGLE_CALLBACK_URL,
          scope: ['profile', 'email'],
          passReqToCallback: true  // ✅ Need req to check origin
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            console.log('\n🎯 Google OAuth Callback!');
            console.log('  Email:', profile.emails?.[0]?.value);
            console.log('  State:', req.query.state);

            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email from Google'), null);
            }

            const cleanEmail = email.toLowerCase().trim();
            let user = await User.findOne({ emailId: cleanEmail });

            if (user) {
              console.log('✅ Existing user found:', cleanEmail);
              
              // Link Google account if not already linked
              if (!user.googleId) {
                console.log('🔗 Linking Google account to existing user');
                user.googleId = profile.id;
                
                if (user.authProvider === 'local' && user.passwordHash) {
                  user.authProvider = 'both';
                } else {
                  user.authProvider = 'google';
                }
                
                await user.save();
              }
              
              user.lastLogin = new Date();
              await user.save();
              return done(null, user);
            }

            // ✅ CRITICAL: Check if this is from signup or login
            const isFromSignup = req.query.state === 'signup';
            
            if (!isFromSignup) {
              // User doesn't exist and trying to login
              console.log('❌ User not found, rejecting login attempt');
              return done(null, false, { message: 'account_not_found' });
            }

            // ✅ NEW USER from signup: Create account
            console.log('📝 Creating new user with Google (from signup)');
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
    return true;

  } catch (error) {
    console.error('\n❌❌❌ FATAL ERROR ❌❌❌');
    console.error('Failed to configure Google strategy!');
    return false;
  }
}

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

export default passport;