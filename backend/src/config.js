const parseOrigins = (value) =>
  (value ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

export const config = {
  version: '1.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  jwtSecret: process.env.JWT_SECRET ?? 'mesitra_super_secret_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d'
}

