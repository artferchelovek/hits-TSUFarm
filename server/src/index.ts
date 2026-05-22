import express from "express";
import cors from "cors";
import { config } from "./config.ts";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: config.bodyLimit }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`API server running on port ${config.port}`);
});
