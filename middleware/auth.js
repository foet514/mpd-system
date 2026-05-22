import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function generateToken(userId, username, roleId, rank) {
  return jwt.sign(
    { userId, username, roleId, rank },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.roleId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export function checkRank(allowedRanks) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRanks.includes(req.user.rank)) {
      return res.status(403).json({ error: 'Insufficient rank' });
    }

    next();
  };
}

export const rankHierarchy = {
  'rank_1': 'Chief of Police',
  'rank_2': 'Deputy Chief of Police',
  'rank_3': 'Police Administrator',
  'rank_4': 'Police Commander',
  'rank_5': 'Deputy Police Commander',
  'rank_6': 'Police Inspector',
  'rank_7': 'Captain',
  'rank_8': 'Lieutenant',
  'rank_9': 'Staff Sergeant',
  'rank_10': 'Sergeant',
  'rank_11': 'Officer'
};

// Ranks that can manage clock records
export const clockManagementRanks = ['rank_1', 'rank_2', 'rank_3', 'rank_4', 'rank_5', 'rank_6', 'rank_7'];
