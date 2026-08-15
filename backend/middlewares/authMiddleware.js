const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Middleware to authenticate requests using JWT (Level 1 Security).
 * Validates the 'Authorization: Bearer <token>' header.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access denied. No authentication token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret_key_rgclocker_vault_2026';

  try {
    const decoded = jwt.verify(token, secret);
    
    // Attach user payload to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    console.error('[Auth Middleware] JWT validation error:', error.message);
    let message = 'Invalid authentication token.';
    if (error.name === 'TokenExpiredError') {
      message = 'Authentication token has expired. Please login again.';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token or session secret has changed. Please login again.';
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message
    });
  }
}

module.exports = authMiddleware;
