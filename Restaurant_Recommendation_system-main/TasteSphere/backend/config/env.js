const getMongoUri = () => process.env.MONGO_URI || process.env.MONGODB_URI;

const getJwtSecret = () => process.env.JWT_SECRET;

const getFrontendUrl = () => {
  const frontendUrl = process.env.FRONTEND_URL?.trim();
  return frontendUrl ? frontendUrl.replace(/\/+$/, '') : 'http://localhost:5173';
};

const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = [
    getFrontendUrl(),
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  return [...new Set([...configuredOrigins, ...defaults])];
};

const validateCoreEnv = () => {
  const missing = [];

  if (!getMongoUri()) {
    missing.push('MONGO_URI');
  }

  if (!getJwtSecret()) {
    missing.push('JWT_SECRET');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

export {
  getAllowedOrigins,
  getFrontendUrl,
  getJwtSecret,
  getMongoUri,
  validateCoreEnv,
};
