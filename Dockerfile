# ===================== STAGE 1: Frontend Build =====================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copiar package files primero para caché de dependencias
COPY frontEnd/package*.json ./

# Instalar TODAS las dependencias (vite es devDependency, se necesita para build)
RUN npm ci

# Copiar resto del frontend
COPY frontEnd/ ./

# En producción, la API está en el mismo dominio bajo /api
# Esto se usa en tiempo de BUILD por Vite
ENV VITE_API_URL=/api

# Construir frontend
RUN npm run build

# ===================== STAGE 2: Backend + Runtime =====================
# Usamos playwright's imagen oficial que ya trae Chromium y todas las deps
FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Instalar Node.js 20 (la imagen de Playwright trae una versión, pero aseguramos la correcta)
# La imagen de Playwright ya trae Node.js, así que solo necesitamos dumb-init
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package files del backend
COPY backEnd/package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar resto del backend
COPY backEnd/ ./

# Crear directorios necesarios
RUN mkdir -p ./downloads ./public

# Copiar build del frontend al directorio public
COPY --from=frontend-builder /app/frontend/dist ./public

# Indicar a Playwright que use los navegadores del sistema (ya instalados en la imagen)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production
ENV HEADLESS=true

# Exponer puerto
EXPOSE 3000

# Entrypoint con dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "index.js"]