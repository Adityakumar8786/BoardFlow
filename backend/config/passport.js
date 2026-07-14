// backend/config/passport.js
// Purpose: Configures Passport's Local Strategy for session-based authentication.
// No JWT — Passport serializes the user's Mongo _id into the session store (connect-mongo),
// and deserializes it back into req.user on every subsequent request.

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/User");

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Stores only the user's id in the session cookie payload (small, efficient).
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// On every request, looks up the full user document by the id stored in session.
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
