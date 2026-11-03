const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../db');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
        const name = profile.displayName || 'Beauty Client';
        const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : '';

        // Шукаємо користувача або реєструємо нового в базі
        let res = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);

        if (res.rows.length === 0) {
          const insertRes = await db.query(
            `INSERT INTO users (google_id, email, name, avatar_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [googleId, email, name, avatarUrl]
          );
          return done(null, insertRes.rows[0]);
        }

        return done(null, res.rows[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const res = await db.query('SELECT id, google_id, email, name, avatar_url FROM users WHERE id = $1', [id]);
    if (res.rows.length > 0) {
      done(null, res.rows[0]);
    } else {
      done(null, null);
    }
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;