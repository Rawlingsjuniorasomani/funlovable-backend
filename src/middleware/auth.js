const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.is_approved, u.is_onboarded,
             u.subscription_status, u.subscription_end_date,
             COALESCE(bool_or(ur.role = 'super_admin'), false) as is_super_admin
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    
    if (user.role === 'teacher' && !user.is_approved) {
      return res.status(403).json({
        error: 'Account pending approval',
        message: 'Your teacher account is pending admin approval. You cannot access this resource until approved.'
      });
    }

    
    const viewAsId = req.headers['x-view-as-student'];
    if (viewAsId && user.role === 'parent') {
      
      const childLink = await pool.query(
        'SELECT * FROM parent_children WHERE parent_id = $1 AND child_id = $2',
        [user.id, viewAsId]
      );

      if (childLink.rows.length > 0) {
        
        const childUserResult = await pool.query(`
          SELECT u.id, u.name, u.email, u.role, u.is_approved, u.subscription_status, u.subscription_end_date
          FROM users u
          WHERE u.id = $1
        `, [viewAsId]);

        if (childUserResult.rows.length > 0) {
          req.user = childUserResult.rows[0]; 
          req.user.parent_id = user.id; 
          req.parentUser = user; 
        }
      }
    } else {
      req.user = user;
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireRole = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    
    const result = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [req.user.id]
    );

    const userRoles = result.rows.map(r => r.role.toLowerCase());
    userRoles.push(req.user.role.toLowerCase()); 

    const requiredRoles = roles.flat().map(r => r.toLowerCase());
    const hasRole = userRoles.includes('super_admin') || requiredRoles.some(role => userRoles.includes(role));

    
    console.log(`[requireRole] User: ${req.user.email}, User Roles: [${userRoles.join(', ')}], Required: [${requiredRoles.join(', ')}], Has Access: ${hasRole}`);

    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const requireApproval = (req, res, next) => {
  if (!req.user.is_approved) {
    return res.status(403).json({ error: 'Account pending approval' });
  }
  next();
};

const requireSubscription = (req, res, next) => {
  
  if (req.user.role !== 'student') {
    return next();
  }

  
  const isActive = req.user.subscription_status === 'active';
  const isExpired = req.user.subscription_end_date && new Date(req.user.subscription_end_date) < new Date();

  if (!isActive || isExpired) {
    return res.status(403).json({
      error: 'Subscription required',
      message: 'Active subscription required to access this content.',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  }

  next();
};

const requireSuperAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  
  if (req.user.is_super_admin) {
    return next();
  }

  
  try {
    const result = await pool.query(
      "SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'super_admin'",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Super Admin privileges required' });
    }

    next();
  } catch (error) {
    console.error('Super Admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

module.exports = { authMiddleware, requireRole, requireApproval, requireSuperAdmin, requireSubscription };
