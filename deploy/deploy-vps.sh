#!/bin/bash
# ============================================================
# Script de Despliegue — miplanilla.devscenter.online
# Ejecutar en el VPS de Hostinger con: bash deploy-vps.sh
# ============================================================

set -e  # Detener si hay algún error

echo "========================================"
echo "  DESPLIEGUE — miplanilla.devscenter.online"
echo "========================================"

# --- VARIABLES — Ajusta si cambias la estructura de carpetas ---
APP_DIR="/var/www/miplanilla"
BACKEND_DIR="$APP_DIR/backEnd"
FRONTEND_DIR="$APP_DIR/frontEnd"
NGINX_CONF="/etc/nginx/sites-available/miplanilla"
NGINX_ENABLED="/etc/nginx/sites-enabled/miplanilla"

# ============================================================
# PASO 1: Crear directorio de la aplicación
# ============================================================
echo ""
echo "[1/7] Creando directorios..."
mkdir -p $APP_DIR

# ============================================================
# PASO 2: Instalar dependencias del sistema (si no están)
# ============================================================
echo ""
echo "[2/7] Verificando dependencias del sistema..."

if ! command -v node &> /dev/null; then
    echo "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    npm install -g pm2
fi

echo "Node: $(node -v) | npm: $(npm -v) | pm2: $(pm2 -v)"

# ============================================================
# PASO 3: Instalar dependencias del Backend
# ============================================================
echo ""
echo "[3/7] Instalando dependencias del Backend..."
cd $BACKEND_DIR
npm install --production

# ============================================================
# PASO 4: Compilar el Frontend (con la URL correcta del API)
# ============================================================
echo ""
echo "[4/7] Compilando el Frontend..."
cd $FRONTEND_DIR

# Crear .env de producción para el frontend
cat > .env << 'EOF'
VITE_API_URL=https://miplanilla.devscenter.online/api
EOF

echo "  → VITE_API_URL apunta a: https://miplanilla.devscenter.online/api"
npm install
npm run build
echo "  → Build generado en: $FRONTEND_DIR/dist"

# ============================================================
# PASO 5: Configurar Nginx
# ============================================================
echo ""
echo "[5/7] Configurando Nginx..."

# Copiar configuración
cp $APP_DIR/nginx-vps.conf $NGINX_CONF

# Actualizar la ruta del dist en el archivo de Nginx
sed -i "s|/var/www/miplanilla/frontEnd/dist|$FRONTEND_DIR/dist|g" $NGINX_CONF

# Activar sitio si no está activado
if [ ! -L "$NGINX_ENABLED" ]; then
    ln -s $NGINX_CONF $NGINX_ENABLED
    echo "  → Sitio de Nginx activado"
fi

# Eliminar el default si existe (puede interferir)
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración de Nginx
nginx -t
echo "  → Configuración de Nginx OK"
systemctl reload nginx
echo "  → Nginx recargado"

# ============================================================
# PASO 6: Iniciar/Reiniciar el Backend con PM2
# ============================================================
echo ""
echo "[6/7] Iniciando Backend con PM2..."
cd $BACKEND_DIR

# Detener instancia anterior si existe
pm2 delete miplanilla-backend 2>/dev/null || true

# Iniciar backend en modo producción
pm2 start index.js \
    --name "miplanilla-backend" \
    --interpreter node \
    --env production

# Guardar configuración de PM2 para que arranque con el sistema
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "  → Backend corriendo con PM2"

# ============================================================
# PASO 7: Verificación final
# ============================================================
echo ""
echo "[7/7] Verificando despliegue..."
sleep 3

# Health check al backend
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://miplanilla.devscenter.online/api/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "✅ ¡DESPLIEGUE EXITOSO!"
    echo "   Frontend: https://miplanilla.devscenter.online/"
    echo "   Backend:  https://miplanilla.devscenter.online/api/health"
    echo "   API Docs: https://miplanilla.devscenter.online/api-docs/"
else
    echo ""
    echo "⚠️  El health check devolvió HTTP $HTTP_CODE"
    echo "   Revisa los logs con: pm2 logs miplanilla-backend"
    echo "   Logs de Nginx:       tail -f /var/log/nginx/miplanilla_error.log"
fi

echo ""
echo "Comandos útiles:"
echo "  pm2 logs miplanilla-backend     → Ver logs del backend"
echo "  pm2 restart miplanilla-backend  → Reiniciar backend"
echo "  pm2 status                      → Estado de todos los procesos"
echo "  nginx -t && systemctl reload nginx → Recargar Nginx"
echo "========================================"
