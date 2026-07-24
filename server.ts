/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeFirestore } from "./src/server/state";
import { globalLimiter, correlationIdMiddleware, errorHandler } from "./src/server/middleware";

import { authRouter } from "./src/routes/auth";
import { uploadRouter } from "./src/routes/upload";
import { listingsRouter } from "./src/routes/listings";
import { sellersRouter } from "./src/routes/sellers";
import { procurementRouter } from "./src/routes/procurement";
import { offersRouter } from "./src/routes/offers";
import { escrowRouter } from "./src/routes/escrow";
import { financingRouter } from "./src/routes/financing";
import { engineersRouter } from "./src/routes/engineers";
import { logisticsRouter } from "./src/routes/logistics";
import { aiRouter } from "./src/routes/ai";
import { adminRouter } from "./src/routes/admin";

const app = express();
const PORT = 3000;

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https://storage.googleapis.com", "https://*.googleusercontent.com"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "wss://*.firebaseio.com"],
      frameSrc: ["'self'", "https://*.firebaseapp.com"]
    }
  } : false,
  crossOriginEmbedderPolicy: false
}));

// Restrict CORS policies to authorized origins
const allowedOrigins = [
  process.env.APP_URL,
  process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []
].flat().filter(Boolean) as string[];

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGINS must be configured in production environment');
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (such as mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    
    if (
      process.env.NODE_ENV !== 'production' ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy violation: Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(correlationIdMiddleware);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(globalLimiter);

// Mount modular API routers
app.use(authRouter);
app.use(uploadRouter);
app.use(listingsRouter);
app.use(sellersRouter);
app.use(procurementRouter);
app.use(offersRouter);
app.use(escrowRouter);
app.use(financingRouter);
app.use(engineersRouter);
app.use(logisticsRouter);
app.use(aiRouter);
app.use(adminRouter);

// Global Error Handling Middleware
app.use(errorHandler);

async function startServer() {
  await initializeFirestore();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Healthcare Equipment and Consumables Directory running on http://localhost:${PORT}`);
  });
}

export { app };

if (process.env.NODE_ENV !== "test") {
  startServer();
}
