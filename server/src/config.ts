const env = <T extends string>(key: string, fallback?: T): string => {
  const val = process.env[key] ?? fallback;
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
};

export const config = {
  port: Number(env("PORT", "3001")),
  databaseUrl: env("DATABASE_URL"),
  jwtSecret: env("JWT_SECRET"),
  jwtExpiresIn: "7d",
  bcryptRounds: 12,
  corsOrigin: env("CORS_ORIGIN", "http://localhost:8000"),
  bodyLimit: "5mb",
} as const;
