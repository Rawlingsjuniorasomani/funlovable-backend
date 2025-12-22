

const attempts = new Map();


const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; 
  const max = options.max || 10;

  return (req, res, next) => {
    try {
      const key = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const now = Date.now();
      const entry = attempts.get(key) || { count: 0, first: now };

      if (now - entry.first > windowMs) {
        entry.count = 0;
        entry.first = now;
      }

      entry.count += 1;
      attempts.set(key, entry);

      if (entry.count > max) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }

      next();
    } catch (err) {
      next();
    }
  };
};

module.exports = { rateLimit };
