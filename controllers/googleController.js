const passport = require("passport");
const User = require("../model/User");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const crypto = require("crypto");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const displayName = profile.displayName;
        const profilePicture = profile.photos?.[0]?.value;

        if (!email) {
          return done(
            new Error("Google account did not provide an email address."),
          );
        }

        let user = await User.findOne({ email });

        if (user) {
          if (!user.profilePicture && profilePicture) {
            user.profilePicture = profilePicture;
          }

          // Every Google login creates a new active session.
          user.sessionId = crypto.randomUUID();

          await user.save();

          return done(null, user);
        }

        // Create a new Nihongomax account for this Google user.
        user = await User.create({
          username: displayName,
          email,
          profilePicture,
          sessionId: crypto.randomUUID(),
        });

        return done(null, user);
      } catch (error) {
        console.error("Google authentication error:", error);
        return done(error);
      }
    },
  ),
);

module.exports = passport;
