# ===================== STAGE 1: Frontend Build =====================
FROM node:20-alpine AS frontend-builder

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
FROM node:20-alpine

WORKDIR /app

# Instalar Chromium y dependencias necesarias para que Playwright funcione en Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Configurar Playwright para NO descargar navegadores y usar el Chromium del sistema
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production
ENV HEADLESS=true

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

# Exponer puerto
EXPOSE 3000

# Entrypoint con dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "index.js"]