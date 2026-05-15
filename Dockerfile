# ===================== STAGE 1: Frontend Build =====================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copiar package files primero para caché de dependencias
COPY frontEnd/package*.json ./

RUN npm ci --only=production

# Copiar resto del frontend
COPY frontEnd/ ./

# Variables de entorno para producción
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Construir frontend
RUN npm run build

# ===================== STAGE 2: Backend Build =====================
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Instalar dependencias de Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget \
    curl

# Copiar package files primero para caché de dependencias
COPY backEnd/package*.json ./

RUN npm ci --only=production

# Copiar resto del backend
COPY backEnd/ ./

# ===================== STAGE 3: Runtime =====================
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias necesarias para runtime
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Configurar Playwright para usar Chromium del sistema
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Copiar desde el builder
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app ./

# Crear directorio para servir frontend
RUN mkdir -p ./public

# Copiar build del frontend
COPY --from=frontend-builder /app/frontend/dist ./public

# Exponer puerto
EXPOSE 3000

# Variable de entorno por defecto
ENV NODE_ENV=production

# Entrypoint
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "index.js"]