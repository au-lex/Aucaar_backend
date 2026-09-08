import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";


import fs from "fs";
import path from "path";
import YAML from "js-yaml";
import swaggerUi from "swagger-ui-express";
import { connectDB } from "./config/db";


import webhookRoutes from "./routes/webhookRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import carRoutes from "./routes/vehicleRoutes";
import cartRoutes from "./routes/cartRoutes";
import wishlistRoutes from "./routes/wishlistRoutes";
import addressRoutes from "./routes/addressRoutes";
import shippingMethodRoutes from "./routes/shipping-methodRoutes"
import orderRoutes from "./routes/orderRoutes";
import walletRoutes from "./routes/walletRoutes";
import savedCardRoutes from "./routes/cardRoutes";
import linkedAccountRoutes from "./routes/linkaccRoutes";
import notificationRoutes from "./routes/notificationRoutes";



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

app.use("/api/webhooks", webhookRoutes);

app.use(express.json());

// ─── API Docs ────────────────────────────────────────────────────────────────

const swaggerDocument = YAML.load(
  fs.readFileSync(path.join(__dirname, "../swagger.yaml"), "utf8")
) as object;

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui { color-scheme: light; }',
}));

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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/shipping-methods", shippingMethodRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/cards", savedCardRoutes);
app.use("/api/linked-accounts", linkedAccountRoutes);
app.use("/api/notifications", notificationRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use(
  (err: any, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
);

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
      console.log(` Docs:        http://localhost:${PORT}/api-docs`);
      console.log(` Auth:        http://localhost:${PORT}/api/auth`);
      console.log(` Cars:        http://localhost:${PORT}/api/cars`);
      console.log(` Orders:      http://localhost:${PORT}/api/orders`);
      console.log(` Wallet:      http://localhost:${PORT}/api/wallet`);
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