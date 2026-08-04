const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Middleware to authenticate Locker Access (Level 2 Security).
 * Validates the 'X-Locker-Token' header against LOCKER_JWT_SECRET.
 * Ensures that the token is valid, matches the current user, and matches the target locker.
 */
function lockerMiddleware(req, res, next) {
  const lockerToken = req.headers['x-locker-token'];
  
  // Extract lockerId from request parameters, query, or body
  const lockerId = req.params.lockerId || req.query.lockerId || req.body.lockerId;

  if (!lockerId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Locker ID is required for this operation.'
    });
  }

  if (!lockerToken) {
    return res.status(403).json({
      error: 'LockerLocked',
      message: 'This locker is locked. A valid Locker PIN is required to unlock it.',
      lockerId
    });
  }

  try {
    const decoded = jwt.verify(lockerToken, process.env.LOCKER_JWT_SECRET || 'dev_locker_jwt_secret_key_rgclocker_vault_2026');
    
    // Check if the locker token matches the requested lockerId
    if (decoded.lockerId !== lockerId) {
      return res.status(403).json({
        error: 'LockerAccessDenied',
        message: 'This token is not valid for the requested locker.',
        lockerId
      });
    }

    // Check if the locker token belongs to the logged in user
    if (decoded.userId !== req.user.id) {
      return res.status(403).json({
        error: 'LockerAccessDenied',
        message: 'This locker token does not belong to your session.'
      });
    }

    // Attach verified locker info to request
    req.locker = {
      id: decoded.lockerId
    };

    next();
  } catch (error) {
    console.error('Locker token validation error:', error.message);
    return res.status(403).json({
      error: 'LockerTokenExpired',
      message: error.name === 'TokenExpiredError' 
        ? 'Your locker session has expired due to 15 minutes of inactivity. Please re-enter your PIN.' 
        : 'Invalid locker session token.',
      lockerId
    });
  }
}

module.exports = lockerMiddleware;
