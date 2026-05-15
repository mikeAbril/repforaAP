/**
 * index.js — Punto de entrada del backend
 *
 * Inicializa Express, middlewares, rutas, Swagger, y el cron de scrapers.
 *
 * Flujo de arranque:
 *  1. Cargar variables de entorno (.env)
 *  2. Configurar CORS, morgan, body parsers
 *  3. Servir frontend estático (si existe /public)
 *  4. Montar rutas de la API bajo /api/*
 *  5. Conectar a MongoDB
 *  6. Iniciar cron de scrapers
 *  7. Escuchar en el puerto configurado
 *
 * Documentación API: GET /api-docs (Swagger UI)
 * Health check:      GET /api/health
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import { startScraperCron } from "./scrapers/scraperRunner.js";

// --- Inicialización ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares globales ---
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : ["http://localhost:5173", "http://localhost:5174", "https://miplanilla.devscenter.online/", "https://miplanilla.devscenter.online/api"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-token", "Authorization"],
  }),
);


app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Servir archivos estáticos del frontend ---
const publicPath = path.join(__dirname, "../public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// --- Rutas ---
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import supervisorRoutes from "./routes/supervisorRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import driveAuthRoutes from "./routes/driveAuthRoutes.js";
import swaggerUi from "swagger-ui-express";

import yaml from "yamljs";

// Documentación Swagger
const swaggerDocument = yaml.load(path.join(__dirname, "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/supervisors", supervisorRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/drive", driveAuthRoutes);


// --- Ruta de salud ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Middleware de errores global ---
app.use((err, _req, res, _next) => {
  console.error("🔴 Error:", err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Error interno del servidor",
  });
});

// --- Conexión a DB e inicio del servidor ---
const startServer = async () => {
  await connectDB();

  // Iniciar cron de scrapers (programado diariamente)
  startScraperCron();

  app.listen(PORT, () => {
    console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
  });
};

startServer();
