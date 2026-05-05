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
            class="header-btn-premium admin q-mr-md"
            @click="router.push('/admin/supervisors')"
          >
            <div class="row items-center no-wrap">
              <span class="material-symbols-outlined q-mr-sm" style="font-size: 18px">admin_panel_settings</span>
              <span>Gestión Admin</span>
            </div>
          </q-btn>
          <q-btn
            flat
            class="header-btn-premium secondary"
            @click="showSettings = true"
          >
            <div class="row items-center no-wrap">
              <span class="material-symbols-outlined q-mr-sm" style="font-size: 18px">person</span>
              <span>Mi Perfil</span>
            </div>
          </q-btn>
          <q-btn
            flat
            class="header-btn-premium logout"
            @click="logout"
          >
            <div class="row items-center no-wrap">
              <span class="material-symbols-outlined q-mr-sm" style="font-size: 18px">logout</span>
              <span>Salir</span>
            </div>
          </q-btn>
        </div>
      </header>

      <!-- Analytics Section -->
      <div class="analytics-grid q-mb-xl">
        <div class="stat-card-premium primary">
          <div class="stat-icon-box">
            <span class="material-symbols-outlined" style="font-size: 24px">description</span>
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
              <span class="material-symbols-outlined" style="font-size: 24px; color: var(--color_button)">key</span>
            </div>
            <div class="config-info col">
              <div class="row items-center">
                <h3 class="config-title">Configuración de Solución de Captchas</h3>
                <q-btn flat dense class="info-link q-ml-sm" @click="showApiKeyHelp = true">
                  <span style="color: var(--color_button); font-weight: 700; font-size: 0.85rem;">¿Cómo obtenerla?</span>
                </q-btn>
              </div>
              <p class="config-subtitle">Ingrese su API Key de 2Captcha para automatizar procesos (Opcional)</p>
            </div>
            <div class="config-action row items-center q-gutter-x-sm">
              <q-input
                outlined
                v-model="profile.apiKey"
                label="Introduzca su API Key"
                class="api-key-input"
                dense
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--text-muted)">vpn_key</span>
                </template>
              </q-input>
              <q-btn
                class="bg-green-9 text-white save-config-btn"
                unelevated
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
                label="Buscar por contratista o documento..."
                class="premium-search-input"
                clearable
              >
                <template v-slot:prepend>
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--text-muted)">search</span>
                </template>
              </q-input>
            </div>
          </div>

          <q-separator color="grey-1" />

          <div class="q-pa-md">
            <q-table
              flat
              bordered
              :rows="reports"
              :columns="columns"
              row-key="_id"
              :loading="loading"
              no-data-label="Sin registros aún"
              v-model:pagination="pagination"
              @request="onRequest"
              hide-pagination
              class="q-mx-md premium-table"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge v-if="props.row.status === 'success' || props.row.status === 'downloaded'" class="bg-green-10">
                    {{ formatStatus(props.row.status) }}
                  </q-badge>
                  <q-badge v-else-if="props.row.status === 'error'" class="bg-red">
                    {{ formatStatus(props.row.status) }}
                  </q-badge>
                  <q-badge v-else class="bg-amber-8">
                    {{ formatStatus(props.row.status) }}
                  </q-badge>
                </q-td>
              </template>

              <template v-slot:body-cell-driveUrl="props">
                <q-td :props="props">
                  <q-btn
                    v-if="props.row.driveUrl"
                    flat
                    dense
                    class="table-action-btn"
                    label="Ver PDF"
                    type="a"
                    :href="props.row.driveUrl"
                    target="_blank"
                  >
                    <span class="material-symbols-outlined q-ml-sm" style="font-size: 16px">open_in_new</span>
                  </q-btn>
                  <div v-else-if="props.row.status === 'error'" class="text-error-action cursor-pointer" @click="showError(props.row.errorReason)">
                    <span class="material-symbols-outlined q-mr-xs" style="font-size: 16px; color: var(--negative, #C10015)">info</span>
                    <span style="color: var(--negative, #C10015); font-size: 0.8rem; font-weight: 600;">Ver Error</span>
                  </div>
                  <span v-else class="text-grey-4">-</span>
                </q-td>
              </template>

              <template v-slot:loading>
                <q-inner-loading showing color="green-9" />
              </template>
            </q-table>

            <div class="row justify-center q-mt-xl" v-if="pagination.totalPages > 1">
              <q-pagination
                v-model="pagination.page"
                :max="pagination.totalPages"
                :max-pages="6"
                direction-links
                flat
                color="green-9"
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
        <q-card-section class="bg-green-9 q-px-lg">
          <div class="row items-center q-py-sm">
            <q-space />
            <div class="col text-center">
              <h5 class="q-ma-none text-white text-weight-bold text-uppercase">Mi Perfil</h5>
              <span class="dialog-subtitle">Información técnica del supervisor</span>
            </div>
            <q-space />
            <q-btn icon="close" flat round dense size="sm" class="text-white" v-close-popup />
          </div>
        </q-card-section>

        <q-card-section class="q-pa-lg">
          <div class="q-gutter-y-lg">
            <div class="field-group">
              <label class="field-label">Nombre Completo</label>
              <q-input
                filled
                v-model="profile.name"
                readonly
                dense
                class="premium-input-readonly"
              >
                <template v-slot:prepend>
                  <span class="material-symbols-outlined" style="font-size: 20px">person</span>
                </template>
              </q-input>
            </div>

            <div class="field-group">
              <label class="field-label">Número de Documento</label>
              <q-input
                filled
                v-model="profile.documentNumber"
                readonly
                dense
                class="premium-input-readonly"
              >
                <template v-slot:prepend>
                  <span class="material-symbols-outlined" style="font-size: 20px">badge</span>
                </template>
              </q-input>
            </div>

            <div class="info-notice row items-start no-wrap q-pa-md">
              <span class="material-symbols-outlined q-mr-md" style="font-size: 20px; color: var(--text-muted)">lock</span>
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
.supervisor-page-premium {
  font-family: 'Inter', sans-serif;
  background-color: var(--bg-light);
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
  color: var(--text-dark);
  margin: 0;
  letter-spacing: -0.02em;
}

.logo-container-mini {
  background: var(--white);
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid var(--border);
}

.mini-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.dashboard-subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0.15rem 0 0;
}

.header-btn-premium {
  border-radius: 12px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  font-size: 0.8rem;
  transition: all 0.2s;
  background: var(--white);
  border: 1px solid var(--border);
  color: var(--text-dark);
}


/* Scraper Config Section */
.config-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 1.5rem 2rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
.config-icon-box {
  background: var(--primary-light);
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
  color: var(--text-dark);
  margin: 0;
}
.config-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
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
  border-radius: var(--radius);
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
  background: var(--color_button);
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
  color: var(--text-dark);
}

.header-btn-premium.admin:hover {
  background-color: var(--primary-light);
  border-color: var(--color_button);
}

.header-btn-premium.logout:hover {
  background-color: #fef2f2;
  border-color: #fee2e2;
}

.header-btn-premium.secondary:hover {
  background-color: var(--bg-light);
  border-color: var(--border);
}

/* Analytics */
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.stat-card-premium {
  background: var(--white);
  border-radius: var(--radius);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.stat-icon-box {
  width: 56px;
  height: 56px;
  background-color: var(--primary-light);
  color: var(--color_button);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
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
  background: var(--white);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-dark);
  margin: 0;
}

.card-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.2rem 0 0;
}

/* Search Input */
:deep(.premium-search-input .q-field__control) {
  border-radius: 12px !important;
  background-color: var(--bg-light);
}

:deep(.premium-search-input .q-field__control:before) {
  border: 1px solid var(--border) !important;
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
  color: var(--text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:deep(.premium-table tbody tr:hover) {
  background-color: var(--bg-light);
}

:deep(.premium-table tbody td) {
  font-size: 0.85rem;
  color: var(--text-dark);
  font-weight: 500;
  padding: 0.75rem 1rem;
}

.table-action-btn {
  font-weight: 700;
  border-radius: 8px;
  color: var(--color_button);
}

/* Dialog */
.settings-card-premium {
  width: 500px;
  max-width: 90vw;
  border-radius: var(--radius);
  background: var(--white);
}

.dialog-subtitle {
  font-size: 0.65rem;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-left: 0.25rem;
}

:deep(.premium-input-readonly .q-field__control) {
  border-radius: 12px !important;
  background-color: var(--bg-light);
  border: 1px solid var(--border);
}

.info-notice {
  background-color: var(--bg-light);
  border-radius: var(--radius);
}

.notice-text {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 600px) {
  .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
  .history-card-premium { border-radius: 0; border-left: none; border-right: none; }
}
</style>
