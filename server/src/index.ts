import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { config } from "./config.ts";
import { db } from "./db/index.ts";
import authRoutes from "./routes/auth.ts";
import savesRoutes from "./routes/saves.ts";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: config.bodyLimit }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many attempts. Try again later." },
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/saves", savesRoutes);

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations done");

  app.listen(config.port, () => {
    console.log(`API server running on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
