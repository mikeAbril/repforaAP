import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // Mantener la conexión activa con pings periódicos
            serverSelectionTimeoutMS: 10000,  // 10s para seleccionar servidor
            socketTimeoutMS: 45000,           // 45s timeout de socket
            heartbeatFrequencyMS: 10000,      // ping cada 10s para evitar idle
            maxPoolSize: 10,                  // máximo de conexiones en pool
            minPoolSize: 2,                   // mínimo de conexiones siempre abiertas
            family: 4,                        // usar IPv4 (más estable en VPS)
        });
        console.log("🟢 Base de datos MongoDB conectada correctamente");

        // Manejo de reconexión automática
        mongoose.connection.on("disconnected", () => {
            console.warn("⚠️ MongoDB desconectado. Intentando reconectar...");
        });
        mongoose.connection.on("reconnected", () => {
            console.log("🟢 MongoDB reconectado exitosamente");
        });
        mongoose.connection.on("error", (err) => {
            console.error("🔴 Error de MongoDB:", err.message);
        });

    } catch (error) {
        console.error("🔴 Error al conectar con MongoDB:", error.message);
        // Reintentar en 5 segundos si falla la conexión inicial
        console.log("🔄 Reintentando conexión en 5 segundos...");
        setTimeout(connectDB, 5000);
    }
};
