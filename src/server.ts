import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db";



dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Team-Meridian API is running",
    timestamp: new Date().toISOString(),
  });
});

// ─── Root Route ──────────────────────────────────────────────────────────────

app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Welcome to Team-Meridian API",
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────




// ─── Start Server ────────────────────────────────────────────────────────────

async function start() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("");
      console.log("==========================================");
      console.log("Team-Meridian API is running");
      console.log("==========================================");
      console.log(` Server:      http://localhost:${PORT}`);
      console.log(` Health:      http://localhost:${PORT}/health`);
      console.log(` Works:       http://localhost:${PORT}/api/works`);
      console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("==========================================");
      console.log("");
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();