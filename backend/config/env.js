const getMongoUri = () => process.env.MONGO_URI || process.env.MONGODB_URI;

const getJwtSecret = () => process.env.JWT_SECRET || 'tastesphere-secret-key';

const getFrontendUrl = () => {
  const frontendUrl = process.env.FRONTEND_URL?.trim();
  if (frontendUrl) return frontendUrl.replace(/\/+$/, '');
  
  if (process.env.NODE_ENV === 'production') {
    return 'https://tastesphere-hy30.onrender.com';
  }
  
  return 'http://localhost:5173';
};

const getBackendUrl = () => {
  const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;
  if (backendUrl) return backendUrl.replace(/\/+$/, '');
  
  if (process.env.NODE_ENV === 'production') {
    return 'https://tastesphere-hy30.onrender.com';
  }
  
  return 'http://localhost:5000';
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
    'https://tastesphere-hy30.onrender.com'
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
  getBackendUrl,
  getJwtSecret,
  getMongoUri,
  validateCoreEnv,
};
