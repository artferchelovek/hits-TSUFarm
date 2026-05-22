import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config.ts";
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

app.listen(config.port, () => {
  console.log(`API server running on port ${config.port}`);
});
