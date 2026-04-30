<template>
  <q-page class="supervisor-page-premium q-pa-lg">
    <div class="page-container">
      
      <!-- Premium Header -->
      <header class="dashboard-header row items-center justify-between q-mb-xl">
        <div class="header-left row items-center no-wrap">
          <div class="logo-container-mini q-mr-md">
            <img src="@/assets/logo-sena.png" alt="SENA Logo" class="mini-logo" />
          </div>
          <div>
            <h1 class="dashboard-title">Panel de Supervisor</h1>
            <p class="dashboard-subtitle">Gestión y monitoreo de certificados de seguridad social</p>
          </div>
        </div>
        <div class="header-actions row q-gutter-x-md">
          <q-btn 
            v-if="profile.role === 'admin'"
            flat 
            color="primary" 
            class="header-btn-premium admin q-mr-md"
            @click="router.push('/admin/supervisors')"
          >
            <div class="row items-center no-wrap">
              <q-icon name="admin_panel_settings" size="xs" class="q-mr-sm" />
              <span>Gestión Admin</span>
            </div>
          </q-btn>
          <q-btn 
            flat 
            color="primary" 
            class="header-btn-premium secondary"
            @click="showSettings = true"
          >
            <div class="row items-center no-wrap">
              <q-icon name="person_outline" size="xs" class="q-mr-sm" />
              <span>Mi Perfil</span>
            </div>
          </q-btn>
          <q-btn 
            flat 
            color="negative" 
            class="header-btn-premium logout"
            @click="logout"
          >
            <div class="row items-center no-wrap">
              <q-icon name="logout" size="xs" class="q-mr-sm" />
              <span>Salir</span>
            </div>
          </q-btn>
        </div>
      </header>

      <!-- Analytics Section -->
      <div class="analytics-grid q-mb-xl">
        <div class="stat-card-premium primary">
          <div class="stat-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Total Solicitudes</span>
            <h2 class="stat-value text-primary">{{ stats.total }}</h2>
          </div>
        </div>
      </div>

      <!-- Scraper Configuration Section -->
      <div class="config-section-premium q-mb-xl">
        <div class="config-card">
          <div class="row items-center q-gutter-x-md no-wrap">
            <div class="config-icon-box">
              <q-icon name="vpn_key" size="24px" color="primary" />
            </div>
            <div class="config-info col">
              <div class="row items-center">
                <h3 class="config-title">Configuración de Solución de Captchas</h3>
                <q-btn flat dense color="primary" label="¿Cómo obtenerla?" class="info-link q-ml-sm" @click="showApiKeyHelp = true" />
              </div>
              <p class="config-subtitle">Ingrese su API Key de 2Captcha para automatizar procesos (Opcional)</p>
            </div>
            <div class="config-action row items-center q-gutter-x-sm">
              <q-input 
                outlined 
                v-model="profile.apiKey" 
                placeholder="Introduzca su API Key" 
                class="api-key-input"
                dense
                hide-bottom-space
              />
              <q-btn 
                color="primary" 
                unelevated 
                class="save-config-btn"
                :loading="savingApiKey"
                @click="updateApiKey"
              >
                Guardar
              </q-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- History Section -->
      <section class="history-section">
        <div class="history-card-premium">
          <div class="card-header row items-center justify-between q-pa-lg">
            <div class="header-info">
              <h3 class="card-title">Historial de Certificados</h3>
              <p class="card-subtitle">Listado completo de trámites realizados</p>
            </div>
            <div class="header-search">
              <q-input 
                outlined 
                dense 
                v-model="searchFilter" 
                placeholder="Buscar por contratista o documento..." 
                class="premium-search-input"
                color="primary"
                clearable
              >
                <template v-slot:prepend>
                  <q-icon name="search" size="xs" color="grey-6" />
                </template>
              </q-input>
            </div>
          </div>

          <q-separator color="grey-1" />

          <div class="q-pa-md">
            <q-table
              flat
              :rows="reports"
              :columns="columns"
              row-key="_id"
              :loading="loading"
              v-model:pagination="pagination"
              @request="onRequest"
              hide-pagination
              class="premium-table"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <div :class="['status-chip', props.row.status]">
                    <span class="dot"></span>
                    {{ formatStatus(props.row.status) }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-driveUrl="props">
                <q-td :props="props">
                  <q-btn 
                    v-if="props.row.driveUrl" 
                    flat 
                    dense 
                    color="primary" 
                    class="table-action-btn"
                    icon-right="open_in_new" 
                    label="Ver PDF" 
                    type="a" 
                    :href="props.row.driveUrl" 
                    target="_blank" 
                  />
                  <div v-else-if="props.row.status === 'error'" class="text-error-action cursor-pointer" @click="showError(props.row.errorReason)">
                    <q-icon name="info_outline" size="xs" class="q-mr-xs" /> Ver Error
                  </div>
                  <span v-else class="text-grey-4">-</span>
                </q-td>
              </template>

              <template v-slot:loading>
                <q-inner-loading showing color="primary" />
              </template>
            </q-table>
            
            <div class="row justify-center q-mt-xl" v-if="pagination.totalPages > 1">
              <q-pagination
                v-model="pagination.page"
                :max="pagination.totalPages"
                :max-pages="6"
                direction-links
                flat
                color="primary"
                class="premium-pagination"
                @update:model-value="loadReports"
              />
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- Settings Dialog Premium -->
    <q-dialog v-model="showSettings" persistent backdrop-filter="blur(10px)">
      <q-card class="settings-card-premium shadow-24">
        <q-card-section class="row items-center q-pa-lg">
          <div class="dialog-header">
            <h3 class="dialog-title">Mi Perfil</h3>
            <p class="dialog-subtitle">Información técnica del supervisor</p>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
        </q-card-section>

        <q-card-section class="q-pa-lg q-pt-none">
          <div class="q-gutter-y-lg">
            <div class="field-group">
              <label class="field-label">Nombre Completo</label>
              <q-input 
                outlined 
                v-model="profile.name" 
                readonly
                dense
                class="premium-input-readonly"
              >
                <template v-slot:prepend>
                  <q-icon name="person_outline" color="primary" />
                </template>
              </q-input>
            </div>

            <div class="field-group">
              <label class="field-label">Número de Documento</label>
              <q-input 
                outlined 
                v-model="profile.documentNumber" 
                readonly
                dense
                class="premium-input-readonly"
              >
                <template v-slot:prepend>
                  <q-icon name="badge" color="primary" />
                </template>
              </q-input>
            </div>

            <div class="info-notice row items-start no-wrap q-pa-md">
              <q-icon name="lock_outline" color="grey-6" size="sm" class="q-mr-md" />
              <p class="notice-text">
                Esta información es gestionada por el administrador. <br>
                Si requiere cambios, por favor realice una solicitud formal.
              </p>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

      <!-- API Key Help Dialog -->
      <q-dialog v-model="showApiKeyHelp">
        <q-card class="help-card-premium">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6 fw-800">¿Cómo obtener mi API Key?</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup color="grey-7" />
          </q-card-section>

          <q-card-section class="q-pa-lg">
            <div class="help-steps">
              <div class="step-item">
                <div class="step-number">1</div>
                <div class="step-text">
                  <strong>Regístrese:</strong> Cree una cuenta en <a href="https://2captcha.com?from=19102432" target="_blank" class="text-primary fw-700">2captcha.com</a>.
                </div>
              </div>
              <div class="step-item">
                <div class="step-number">2</div>
                <div class="step-text">
                  <strong>Cargue saldo:</strong> Ingrese fondos (el mínimo de $1 USD es suficiente para cientos de captchas).
                </div>
              </div>
              <div class="step-item">
                <div class="step-number">3</div>
                <div class="step-text">
                  <strong>Dashboard:</strong> En su panel principal, busque la sección <strong>"Account Settings"</strong> o <strong>"Dashboard"</strong>.
                </div>
              </div>
              <div class="step-item">
                <div class="step-number">4</div>
                <div class="step-text">
                  <strong>Copie la clave:</strong> Verá un código largo llamado <strong>"API Key"</strong>. Cópielo y péguelo en el panel de Repfora.
                </div>
              </div>
            </div>

            <q-banner dense class="bg-blue-1 text-blue-9 rounded-borders q-mt-md">
              <template v-slot:avatar>
                <q-icon name="info" color="blue-8" />
              </template>
              Esta clave permite que el sistema resuelva los retos visuales de las plataformas de forma automática.
            </q-banner>
          </q-card-section>
        </q-card>
      </q-dialog>

    </q-page>
</template>


<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/store/auth'
import api from '@/plugins/axios'

const $q = useQuasar()
const router = useRouter()
const searchFilter = ref('')
const showApiKeyHelp = ref(false)
const loading = ref(false)
const showSettings = ref(false)

const logout = () => {
  const authStore = useAuthStore()
  authStore.clearToken()
  router.push('/login')
}

const stats = ref({
  total: 0,
  success: 0,
  pending: 0,
  processing: 0,
  error: 0,
  downloaded: 0
})

const profile = ref({ 
  name: '', 
  documentNumber: '',
  role: 'supervisor',
  apiKey: ''
})

const fetchProfile = async () => {
  try {
    const res = await api.get('/supervisors/profile')
    if (res.data.success) {
      profile.value = res.data.supervisor
    }
  } catch (error) {
    console.error('Error loading profile:', error)
  }
}

const savingApiKey = ref(false)
const updateApiKey = async () => {
  savingApiKey.value = true
  try {
    const res = await api.put('/supervisors/profile', { apiKey: profile.value.apiKey })
    if (res.data.success) {
      $q.notify({
        color: 'positive',
        message: 'Configuración guardada correctamente',
        icon: 'check_circle',
        position: 'top'
      })
    }
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: 'Error al guardar la configuración',
      icon: 'warning',
      position: 'top'
    })
  } finally {
    savingApiKey.value = false
  }
}


const reports = ref([])
const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
  totalPages: 1
})

const columns = [
  { name: 'createdAt', label: 'Fecha Solicitud', align: 'left', field: row => new Date(row.createdAt).toLocaleString(), sortable: true },
  { name: 'contractor', label: 'Contratista', align: 'left', field: row => row.contractorId?.fullName || 'Desconocido' },
  { name: 'document', label: 'Documento', align: 'left', field: row => `${row.contractorId?.documentType} ${row.contractorId?.documentNumber}` },
  { name: 'platform', label: 'Plataforma', align: 'left', field: row => formatPlatform(row.platform) },
  { name: 'status', label: 'Estado', align: 'center', field: 'status' },
  { name: 'driveUrl', label: 'PDF Original', align: 'center', field: 'driveUrl' }
]

const formatPlatform = (str) => {
  if (!str) return 'N/A'
  const map = {
    'soi': 'SOI',
    'asopagos': 'ASOPAGOS',
    'mi_planilla': 'MI PLANILLA',
    'aportes_en_linea': 'APORTES EN LÍNEA'
  }
  return map[str] || str.toUpperCase()
}

const getStatusColor = (status) => {
  switch (status) {
    case 'success': case 'downloaded': return 'positive'
    case 'pending': case 'processing': return 'warning'
    case 'error': return 'negative'
    default: return 'grey'
  }
}

const formatStatus = (status) => {
  switch (status) {
    case 'success': case 'downloaded': return 'COMPLETADO'
    case 'pending': return 'PENDIENTE'
    case 'processing': return 'EN PROCESO'
    case 'error': return 'FALLIDO'
    default: return status.toUpperCase()
  }
}

const showError = (reason) => {
  $q.dialog({
    title: 'Motivo del Error',
    message: reason || 'El scraper falló por un problema desconocido en la plataforma.',
    color: 'negative'
  })
}

const loadStats = async () => {
  try {
    const res = await api.get('/dashboard/stats')
    if (res.data.success) {
      stats.value = res.data.stats
    }
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

const loadReports = async (page = pagination.value.page) => {
  loading.value = true
  try {
    let url = `/dashboard/reports?page=${page}&limit=${pagination.value.rowsPerPage}`
    if (searchFilter.value) {
      url += `&search=${encodeURIComponent(searchFilter.value)}`
    }
    const res = await api.get(url)
    if (res.data.success) {
      reports.value = res.data.data
      pagination.value.page = res.data.pagination.page
      pagination.value.rowsNumber = res.data.pagination.total
      pagination.value.totalPages = res.data.pagination.totalPages
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Error cargando historial de certificados', icon: 'error' })
  } finally {
    loading.value = false
  }
}

// Recargar cuando cambie el filtro (con debounce manual o directo)
watch(searchFilter, () => {
  pagination.value.page = 1
  loadReports(1)
})

const onRequest = (props) => {
  pagination.value.page = props.pagination.page
  loadReports(props.pagination.page)
}

onMounted(() => {
  loadStats()
  loadReports(1)
  fetchProfile()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.supervisor-page-premium {
  font-family: 'Inter', sans-serif;
  background-color: #f8fafc;
  min-height: 100vh;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
}


/* Header */
.dashboard-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.logo-container-mini {
  background: white;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
}

.mini-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.dashboard-subtitle {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0.15rem 0 0;
}

.header-btn-premium {
  border-radius: 12px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  font-size: 0.8rem;
  transition: all 0.2s;
  background: white;
  border: 1px solid #e2e8f0;
}


/* Scraper Config Section */
.config-card {
  background: white;
  border-radius: 20px;
  padding: 1.5rem 2rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}
.config-icon-box {
  background: #f0f9ff;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.config-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.config-subtitle {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
}
.api-key-input {
  width: 300px;
}
:deep(.api-key-input .q-field__control) {
  border-radius: 10px !important;
}
.save-config-btn {
  border-radius: 10px;
  font-weight: 700;
  padding: 0 1.5rem;
  height: 40px;
}

/* Help Dialog Styles */
.help-card-premium {
  width: 500px;
  max-width: 90vw;
  border-radius: 24px;
}
.help-steps {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.step-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
.step-number {
  background: #0f172a;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 2px;
}
.step-text {
  font-size: 0.95rem;
  line-height: 1.5;
  color: #334155;
}
.fw-800 { font-weight: 800; }
.fw-700 { font-weight: 700; }

.header-btn-premium.admin:hover {
  background-color: #f0f9ff;
  border-color: #bae6fd;
}

.header-btn-premium.logout:hover {
  background-color: #fef2f2;
  border-color: #fee2e2;
}

.header-btn-premium.secondary:hover {
  background-color: #f1f5f9;
  border-color: #e2e8f0;
}

/* Analytics */
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.stat-card-premium {
  background: white;
  border-radius: 24px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}

.stat-icon-box {
  width: 56px;
  height: 56px;
  background-color: #ecfdf4;
  color: #2e7d32;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  line-height: 1;
}

/* History Card */
.history-card-premium {
  background: white;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
  overflow: hidden;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.card-subtitle {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0.2rem 0 0;
}

/* Search Input */
:deep(.premium-search-input .q-field__control) {
  border-radius: 12px !important;
  background-color: #f8fafc;
}

:deep(.premium-search-input .q-field__control:before) {
  border: 1px solid #e2e8f0 !important;
}

/* Table */
.premium-table {
  background: transparent;
}

:deep(.premium-table .q-table__card) {
  box-shadow: none;
}

:deep(.premium-table thead tr) {
  height: 50px;
}

:deep(.premium-table thead th) {
  font-weight: 700;
  color: #64748b;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:deep(.premium-table tbody tr:hover) {
  background-color: #f8fafc;
}

:deep(.premium-table tbody td) {
  font-size: 0.85rem;
  color: #1e293b;
  font-weight: 500;
  padding: 0.75rem 1rem;
}


/* Chips */
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-chip.success, .status-chip.downloaded { background: #f0fdf4; color: #166534; }
.status-chip.pending, .status-chip.processing { background: #fffbeb; color: #92400e; }
.status-chip.error { background: #fef2f2; color: #991b1b; }

.status-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-chip.success .dot, .status-chip.downloaded .dot { background: #22c55e; }
.status-chip.pending .dot, .status-chip.processing .dot { background: #f59e0b; }
.status-chip.error .dot { background: #ef4444; }

.table-action-btn {
  font-weight: 700;
  border-radius: 8px;
}

/* Dialog */
.settings-card-premium {
  width: 500px;
  max-width: 90vw;
  border-radius: 28px;
  background: white;
}

.dialog-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.dialog-subtitle {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  margin-left: 0.25rem;
}

:deep(.premium-input-readonly .q-field__control) {
  border-radius: 12px !important;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}

.info-notice {
  background-color: #f1f5f9;
  border-radius: 16px;
}

.notice-text {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 600px) {
  .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
  .history-card-premium { border-radius: 0; border-left: none; border-right: none; }
}
</style>

