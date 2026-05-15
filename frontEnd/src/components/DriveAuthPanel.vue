<template>
  <div class="drive-auth-panel">
    <div class="row items-center justify-between q-mb-md">
      <div class="header-info">
        <h3 class="card-title text-h5 text-weight-bold q-ma-none text-dark">Conexión Google Drive</h3>
        <p class="card-subtitle text-grey-7 q-mt-xs q-mb-none">Configurar la conexión para subir certificados</p>
      </div>
      <q-badge
        :color="authStatus.authenticated ? (authStatus.isExpired ? 'orange' : 'green') : 'red'"
        class="status-badge"
        text-color="white"
      >
        {{ statusText }}
      </q-badge>
    </div>

    <q-card class="drive-card-premium">
      <q-card-section class="q-pa-md">
        <div class="row q-col-gutter-md">
          <!-- Estado de la conexión -->
          <div class="col-12">
            <div class="connection-status" :class="statusClass">
              <div class="status-icon">
                <q-icon :name="authStatus.authenticated ? 'sym_o_cloud_done' : 'sym_o_cloud_off'" size="48px" />
              </div>
              <div class="status-info">
                <h5 class="q-ma-none">{{ statusTitle }}</h5>
                <p class="q-ma-none">{{ statusMessage }}</p>
                <p v-if="authStatus.authenticated" class="q-ma-none text-caption text-grey-6">
                  Actualizado: {{ formatDate(authStatus.updatedAt) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Botones de acción -->
          <div class="col-12">
            <q-card flat bordered class="actions-card">
              <q-card-section class="q-pa-md">
                <div class="row q-gutter-sm">
                  <q-btn
                    v-if="!authStatus.authenticated || authStatus.isExpired"
                    color="blue-7"
                    icon="sym_o_login"
                    label="Autorizar Google Drive"
                    @click="authorizeDrive"
                    :loading="loading"
                    class="action-btn"
                    unelevated
                  />
                  <q-btn
                    v-else
                    color="green-7"
                    icon="sym_o_check_circle"
                    label="Conectado y funcionando"
                    disable
                    class="action-btn"
                    unelevated
                  />
                  <q-btn
                    v-if="authStatus.authenticated"
                    color="red-7"
                    icon="sym_o_refresh"
                    label="Revocar"
                    @click="confirmRevoke"
                    outline
                    class="action-btn"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Instrucciones -->
          <div class="col-12">
            <q-expansion-item
              icon="sym_o_help"
              label="Instrucciones de configuración"
              header-class="text-grey-7"
            >
              <q-card flat class="q-mt-sm">
                <q-card-section>
                  <div class="instructions-container">
                    <ol class="q-ma-none q-pa-md instructions">
                      <li>
                        Ve a <a href="https://console.cloud.google.com" target="_blank">Google Cloud Console</a>
                      </li>
                      <li>Selecciona o crea un proyecto</li>
                      <li>Ve a "APIs y Servicios" → "Credenciales"</li>
                      <li>Edita tu "ID de cliente OAuth 2.0"</li>
                      <li>En "URI de redirección autorizada", agrega:</li>
                    </ol>
                    <div class="code-block">
                      <code>{{ redirectUri }}</code>
                      <q-btn
                        flat
                        round
                        size="sm"
                        icon="sym_o_content_copy"
                        @click="copyRedirectUri"
                        class="copy-btn"
                      />
                    </div>
                    <ol class="q-ma-none q-pa-md instructions" start="6">
                      <li>Guarda los cambios</li>
                      <li>Usa el botón "Autorizar Google Drive" aquí para conectar</li>
                    </ol>
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import api from '@/plugins/axios'

const $q = useQuasar()

const authStatus = ref({
  authenticated: false,
  isExpired: false,
  expiryDate: null,
  createdAt: null,
  updatedAt: null,
  message: ''
})

const loading = ref(false)
const redirectUri = computed(() => {
  const baseUrl = window.location.origin
  return `${baseUrl}/api/drive/auth/callback`
})

const statusText = computed(() => {
  if (!authStatus.value.authenticated) return 'No conectado'
  if (authStatus.value.isExpired) return 'Expirado'
  return 'Conectado'
})

const statusClass = computed(() => {
  if (!authStatus.value.authenticated) return 'status-disconnected'
  if (authStatus.value.isExpired) return 'status-expired'
  return 'status-connected'
})

const statusTitle = computed(() => {
  if (!authStatus.value.authenticated) return 'No hay conexión con Google Drive'
  if (authStatus.value.isExpired) return 'La conexión ha expirado'
  return 'Google Drive conectado correctamente'
})

const statusMessage = computed(() => {
  if (!authStatus.value.authenticated) return 'Autoriza la aplicación para poder subir certificados'
  if (authStatus.value.isExpired) return 'El token ha expirado. Re-autoriza la conexión.'
  return 'Los certificados se subirán automáticamente a tu cuenta de Drive.'
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-ES')
}

const checkStatus = async () => {
  try {
    const res = await api.get('/drive/auth/status')
    if (res.data.success) {
      authStatus.value = res.data
    }
  } catch (error) {
    console.error('Error checking drive status:', error)
  }
}

// Manejar mensaje de la ventana secundaria (postMessage)
const handlePostMessage = (event) => {
  if (event.data?.type === 'driveAuthCallback') {
    console.log('Mensaje recibido de ventana secundaria:', event.data)

    if (event.data.success) {
      $q.notify({
        color: 'positive',
        message: '✅ Google Drive conectado exitosamente!',
        icon: 'sym_o_check_circle',
        position: 'top',
        timeout: 5000
      })
    } else {
      $q.notify({
        color: 'negative',
        message: `❌ ${event.data.message}`,
        icon: 'sym_o_warning',
        position: 'top',
        timeout: 8000
      })
    }

    // Verificar el estado después de recibir el mensaje
    setTimeout(checkStatus, 500)
  }
}

// Manejar cambios en localStorage (evento storage)
const handleStorageChange = (event) => {
  if (event.key === 'driveAuthStatus' && event.newValue) {
    console.log('Cambio en localStorage detectado')
    try {
      const data = JSON.parse(event.newValue)

      if (data.success) {
        $q.notify({
          color: 'positive',
          message: '✅ Google Drive conectado exitosamente!',
          icon: 'sym_o_check_circle',
          position: 'top',
          timeout: 5000
        })
      } else {
        $q.notify({
          color: 'negative',
          message: `❌ ${data.message}`,
          icon: 'sym_o_warning',
          position: 'top',
          timeout: 8000
        })
      }

      // Verificar el estado y limpiar
      setTimeout(async () => {
        await checkStatus()
        try {
          localStorage.removeItem('driveAuthStatus')
        } catch (e) {
          // Ignorar error si ya no existe
        }
      }, 500)
    } catch (e) {
      console.error('Error parseando storage event:', e)
    }
  }
}

const authorizeDrive = async () => {
  loading.value = true
  try {
    const res = await api.get('/drive/auth/url')
    if (res.data.success) {
      // Abrir Google en una nueva pestaña
      const authWindow = window.open(res.data.authUrl, '_blank', 'width=600,height=700,scrollbars=yes,resizable=yes')

      if (!authWindow) {
        $q.notify({
          color: 'warning',
          message: 'La ventana emergente fue bloqueada. Habilita las ventanas emergentes en tu navegador.',
          icon: 'sym_o_warning'
        })
        loading.value = false
        return
      }

      $q.notify({
        color: 'info',
        message: 'Autoriza la aplicación en la nueva pestaña. Se cerrará automáticamente cuando termines.',
        timeout: 10000
      })

      // Verificar el estado periódicamente
      const checkInterval = setInterval(async () => {
        try {
          // Verificar el estado del Drive independientemente de la ventana
          await checkStatus()

          // Intentar verificar si la ventana está cerrada (silenciar el warning)
          try {
            if (authWindow.closed) {
              clearInterval(checkInterval)
              console.log('Ventana de autorización cerrada')
            }
          } catch (e) {
            // Ignorar el error de COOP, la ventana probablemente se cerró
            // Si checkStatus ahora muestra autenticado, significa que funcionó
            if (authStatus.value.authenticated) {
              clearInterval(checkInterval)
            }
          }
        } catch (e) {
          console.error('Error verificando ventana:', e)
        }
      }, 2000)

      // Detener el intervalo después de 3 minutos
      setTimeout(() => {
        clearInterval(checkInterval)
        loading.value = false
      }, 180000)
    }
  } catch (error) {
    console.error('Error en authorizeDrive:', error)
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Error obteniendo URL de autorización',
      icon: 'sym_o_warning'
    })
    loading.value = false
  }
}

const copyRedirectUri = () => {
  navigator.clipboard.writeText(redirectUri.value)
  $q.notify({
    color: 'positive',
    message: 'URI copiada al portapapeles',
    icon: 'sym_o_content_copy'
  })
}

const confirmRevoke = () => {
  $q.dialog({
    title: 'Revocar conexión',
    message: '¿Estás seguro de que quieres revocar la conexión con Google Drive? Tendrás que volver a autorizar.',
    cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
    ok: { label: 'Revocar', color: 'red-7' }
  }).onOk(async () => {
    try {
      const res = await api.delete('/drive/auth/revoke')
      if (res.data.success) {
        $q.notify({
          color: 'positive',
          message: 'Conexión revocada exitosamente',
          icon: 'sym_o_check_circle'
        })
        await checkStatus()
      }
    } catch (error) {
      $q.notify({
        color: 'negative',
        message: error.response?.data?.message || 'Error revocando conexión',
        icon: 'sym_o_warning'
      })
    }
  })
}

// Verificar estado al montar
onMounted(() => {
  checkStatus()

  // Escuchar mensajes de la ventana secundaria
  window.addEventListener('message', handlePostMessage)

  // Escuchar cambios en localStorage
  window.addEventListener('storage', handleStorageChange)

  // También verificar si hay un resultado guardado (en caso de refresh)
  try {
    const savedStatus = localStorage.getItem('driveAuthStatus')
    if (savedStatus) {
      const data = JSON.parse(savedStatus)
      // Solo mostrar si es reciente (últimos 30 segundos)
      if (Date.now() - data.timestamp < 30000 && data.success) {
        $q.notify({
          color: 'positive',
          message: '✅ Google Drive conectado exitosamente!',
          icon: 'sym_o_check_circle'
        })
      }
      localStorage.removeItem('driveAuthStatus')
    }
  } catch (e) {
    // Ignorar
  }
})

// Limpiar listeners al desmontar
onUnmounted(() => {
  window.removeEventListener('message', handlePostMessage)
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<style scoped>
.drive-card-premium {
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.status-badge {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
}

.connection-status {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 12px;
  background: #f5f5f5;
}

.status-connected {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
}

.status-connected .status-icon {
  color: #2e7d32;
}

.status-expired {
  background: #fff3e0;
  border: 1px solid #ffcc80;
}

.status-expired .status-icon {
  color: #f57c00;
}

.status-disconnected {
  background: #ffebee;
  border: 1px solid #ef9a9a;
}

.status-disconnected .status-icon {
  color: #c62828;
}

.status-icon {
  flex-shrink: 0;
}

.status-info h5 {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.status-info p {
  font-size: 0.9rem;
  color: #616161;
  margin-bottom: 0.25rem;
}

.actions-card {
  border-radius: 12px;
}

.action-btn {
  border-radius: 8px;
  padding: 0.5rem 1.25rem;
}

.instructions-container {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.instructions {
  font-size: 0.9rem;
  line-height: 1.8;
}

.instructions li {
  margin-bottom: 0.5rem;
}

.instructions a {
  color: var(--color_button);
  text-decoration: none;
  font-weight: 500;
}

.instructions a:hover {
  text-decoration: underline;
}

.code-block {
  background: #263238;
  color: #fff;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  position: relative;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.code-block code {
  display: block;
  padding-right: 40px;
}

.copy-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
