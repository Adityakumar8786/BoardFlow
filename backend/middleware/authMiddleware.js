// backend/middleware/authMiddleware.js
// Purpose: Protects routes that require an authenticated user (and optionally a specific role).

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ success: false, message: "Please log in to continue" });
};

const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ success: false, message: "Admin access required" });
};

module.exports = { ensureAuthenticated, ensureAdmin };
