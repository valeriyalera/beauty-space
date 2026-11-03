const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);


router.get('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

router.get('/api/auth/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({
      authenticated: true,
      user: req.user
    });
  }
  res.status(401).json({
    authenticated: false,
    message: 'Користувач не авторизований'
  });
});

module.exports = router;