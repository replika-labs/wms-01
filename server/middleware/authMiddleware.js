const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { User } = require('../models');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (exclude password hash)
      req.user = await User.findByPk(decoded.id, { attributes: { exclude: ['passwordHash'] } });

      if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Not authorized, user not found'
          });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
});

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
          success: false,
          message: 'Not authorized as an admin'
        });
    }
};

module.exports = { protect, adminOnly }; 