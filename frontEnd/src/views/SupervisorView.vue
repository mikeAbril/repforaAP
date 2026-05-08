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
            <h1 class="dashboard-title">Bienvenido, {{ profile.name }}</h1>
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
              <q-icon name="sym_o_admin_panel_settings" size="18px" class="q-mr-sm" />
              <span>Gestión Admin</span>
            </div>
          </q-btn>
          <q-btn
            flat
            class="header-btn-premium secondary"
            round
          >
            <q-icon name="sym_o_person" size="20px" />
            <q-menu>
              <div class="profile-menu">
                <div class="profile-header">
                  <div class="profile-icon">
                    <q-icon name="sym_o_person" size="28px" color="white" />
                  </div>
                  <div class="profile-info">
                    <p class="profile-name">{{ profile.name }}</p>
                    <p class="profile-role">{{ profile.role === 'admin' ? 'Administrador' : 'Supervisor' }}</p>
                  </div>
                </div>
                <q-separator />
                <div class="profile-details">
                  <div class="detail-item">
                    <q-icon name="sym_o_badge" size="18px" color="grey-6" class="q-mr-sm" />
                    <span>{{ profile.documentNumber }}</span>
                  </div>
                </div>
                <q-separator />
                <div class="profile-notice">
                  <q-icon name="sym_o_lock" size="16px" color="grey-6" class="q-mr-sm" />
                  <span>Información gestionada por el administrador</span>
                </div>
              </div>
            </q-menu>
          </q-btn>
          <q-btn
            flat
            class="header-btn-premium logout"
            @click="logout"
            round
          >
            <q-icon name="sym_o_logout" size="20px" />
          </q-btn>
        </div>
      </header>

      <!-- Analytics Section -->
      <div class="analytics-grid q-mb-xl">
        <!-- Total Solicitudes -->
        <div class="stat-card-premium primary">
          <div class="stat-icon-box">
            <q-icon name="sym_o_description" size="24px" />
          </div>
          <div class="stat-content">
            <span class="stat-label">Total Solicitudes</span>
            <h2 class="stat-value text-primary">{{ filteredTotal }}</h2>
          </div>
        </div>

        <!-- Carpeta Drive -->
        <div class="stat-card-premium drive">
          <div class="stat-icon-box">
            <q-icon name="sym_o_folder" size="24px" />
          </div>
          <div class="stat-content">
            <span class="stat-label">Carpeta Drive</span>
            <a :href="driveFolderUrl" target="_blank" class="stat-link">
              Ver Carpeta
              <q-icon name="sym_o_open_in_new" size="16px" class="q-ml-xs" />
            </a>
          </div>
        </div>

        <!-- API Key (Solo supervisores) -->
        <div class="stat-card-premium api" v-if="profile.role !== 'admin'">
          <div class="stat-icon-box">
            <q-icon name="sym_o_key" size="24px" />
          </div>
          <div class="stat-content">
            <span class="stat-label">2Captcha API</span>
            <q-btn
              v-if="!profile.apiKey"
              flat
              dense
              size="sm"
              label="Configurar"
              @click="showApiKeyModal = true"
              class="api-btn"
            />
            <q-btn
              v-else
              flat
              dense
              size="sm"
              label="Editar"
              @click="openApiKeyModal"
              class="api-btn"
            />
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
                  <q-icon name="sym_o_search" size="18px" color="grey-6" />
                </template>
              </q-input>
            </div>
          </div>

          <div class="row q-px-lg q-py-sm q-gutter-sm items-center filter-row">
            <q-select
              outlined
              dense
              v-model="filterPlatform"
              :options="platformOptions"
              label="Plataforma"
              emit-value
              map-options
              clearable
              style="min-width: 180px"
              class="filter-select"
            />
            <q-select
              outlined
              dense
              v-model="filterStatus"
              :options="statusOptions"
              label="Estado"
              emit-value
              map-options
              clearable
              style="min-width: 150px"
              class="filter-select"
            />
            <q-select
              outlined
              dense
              v-model="filterYear"
              :options="yearOptions"
              label="Año"
              emit-value
              map-options
              clearable
              style="min-width: 120px"
              class="filter-select"
              @update:model-value="val => { if (!val) filterMonth = null }"
            />
            <q-select
              v-if="filterYear"
              outlined
              dense
              v-model="filterMonth"
              :options="monthOptions"
              label="Mes"
              emit-value
              map-options
              clearable
              style="min-width: 150px"
              class="filter-select"
            />
            <q-space />
            <q-btn
              flat
              dense
              no-caps
              label="Imprimir"
              class="print-btn"
              @click="printTable"
            >
              <q-icon name="sym_o_print" size="18px" class="q-mr-xs" />
            </q-btn>
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
                    <q-icon name="sym_o_open_in_new" size="16px" class="q-ml-sm" />
                  </q-btn>
                  <div v-else-if="props.row.status === 'error'" class="text-error-action cursor-pointer" @click="showError(props.row.errorReason)">
                    <q-icon name="sym_o_info" size="16px" class="q-mr-xs" color="negative" />
                    <span style="color: var(--negative, #C10015); font-size: 0.8rem; font-weight: 600;">Ver Error</span>
                  </div>
                  <span v-else class="text-grey-4">-</span>
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    v-if="props.row.status !== 'success' && props.row.status !== 'downloaded'"
                    flat
                    dense
                    round
                    size="sm"
                    color="red"
                    @click="confirmDelete(props.row)"
                  >
                    <q-icon name="sym_o_delete" size="18px" />
                    <q-tooltip>Eliminar reporte</q-tooltip>
                  </q-btn>
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

      <!-- API Key Modal -->
      <q-dialog v-model="showApiKeyModal" persistent>
        <q-card style="min-width: 450px; border-radius: 16px;">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Configuración 2Captcha</div>
            <q-space />
            <q-btn icon="sym_o_close" flat round dense v-close-popup />
          </q-card-section>
          <q-card-section class="q-pt-md">
            <q-input
              outlined
              v-model="editApiKeyValue"
              label="Tu API Key"
              dense
              class="q-mb-md"
            />
            <div class="api-help-text q-mt-md">
              <p class="q-mb-sm text-grey-7" style="font-size: 0.85rem;">
                <strong>¿Cómo obtenerla?</strong>
              </p>
              <ol style="font-size: 0.8rem; color: #666; margin-left: 1rem; padding-left: 0.5rem;">
                <li>Regístrate en <a href="https://2captcha.com?from=19102432" target="_blank" style="color: var(--color_button);">2captcha.com</a></li>
                <li>Carga saldo ($1 USD es suficiente)</li>
                <li>Copia tu API Key desde el Dashboard</li>
              </ol>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Eliminar" color="negative" @click="deleteApiKey" class="q-mr-auto" :loading="savingApiKey" v-if="profile.apiKey" />
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn
              class="bg-green-9 text-white"
              unelevated
              :loading="savingApiKey"
              label="Guardar"
              @click="saveApiKeyFromModal"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

    </q-page>
</template>


<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/store/auth'
import api from '@/plugins/axios'
import * as XLSX from 'xlsx'

const $q = useQuasar()
const router = useRouter()
const searchFilter = ref('')

const printTable = () => {
  if (reports.value.length === 0) {
    $q.notify({
      color: 'negative',
      message: 'No hay datos para exportar',
      icon: 'sym_o_warning',
      position: 'top'
    })
    return
  }

  // Preparar datos para Excel
  const excelData = reports.value.map(row => ({
    'Fecha Solicitud': new Date(row.createdAt).toLocaleString('es-CO'),
    'Contratista': row.instructorId?.fullName || 'Desconocido',
    'Documento': row.instructorId ? `${row.instructorId.documentType} ${row.instructorId.documentNumber}` : 'N/A',
    'Plataforma': formatPlatform(row.platform),
    'Estado': formatStatus(row.status),
    'URL PDF': row.driveUrl || 'N/A'
  }))

  // Crear hoja de trabajo
  const worksheet = XLSX.utils.json_to_sheet(excelData)

  // Ajustar ancho de columnas
  const columnWidths = [
    { wch: 25 }, // Fecha Solicitud
    { wch: 35 }, // Contratista
    { wch: 20 }, // Documento
    { wch: 20 }, // Plataforma
    { wch: 15 }, // Estado
    { wch: 50 }  // URL PDF
  ]
  worksheet['!cols'] = columnWidths

  // Crear libro de trabajo
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificados')

  // Generar nombre del archivo
  const fileName = `certificados_${filterYear.value || 'todos'}_${filterMonth.value || 'todos'}.xlsx`

  // Descargar archivo
  XLSX.writeFile(workbook, fileName)

  $q.notify({
    color: 'positive',
    message: 'Archivo Excel exportado correctamente',
    icon: 'sym_o_check_circle',
    position: 'top'
  })
}
const filterPlatform = ref(null)
const filterMonth = ref(null)
const filterYear = ref(null)
const filterStatus = ref(null)

const platformOptions = [
  { label: 'SOI', value: 'soi' },
  { label: 'Aportes en Línea', value: 'aportes_en_linea' },
  { label: 'Asopagos', value: 'asopagos' },
  { label: 'Mi Planilla', value: 'mi_planilla' }
]
const monthOptions = [
  { label: 'Enero', value: '1' }, { label: 'Febrero', value: '2' },
  { label: 'Marzo', value: '3' }, { label: 'Abril', value: '4' },
  { label: 'Mayo', value: '5' }, { label: 'Junio', value: '6' },
  { label: 'Julio', value: '7' }, { label: 'Agosto', value: '8' },
  { label: 'Septiembre', value: '9' }, { label: 'Octubre', value: '10' },
  { label: 'Noviembre', value: '11' }, { label: 'Diciembre', value: '12' }
]
const yearOptions = ['2024', '2025', '2026']
const statusOptions = [
  { label: 'Completado', value: 'success' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'En Proceso', value: 'processing' },
  { label: 'Fallido', value: 'error' }
]

const showApiKeyModal = ref(false)
const editApiKeyValue = ref('')
const loading = ref(false)

const filteredTotal = computed(() => {
  return pagination.value.rowsNumber
})

// URL de la carpeta de Drive del supervisor
const driveFolderUrl = computed(() => {
  return 'https://drive.google.com/drive/folders/143XVr4u9HYk77Erx4Dq9uVjMm8Jjh1EW'
})

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

const openApiKeyModal = async () => {
  try {
    const res = await api.get('/supervisors/profile/apikey')
    editApiKeyValue.value = res.data.apiKey || ''
    showApiKeyModal.value = true
  } catch {
    showApiKeyModal.value = true
  }
}

const saveApiKeyFromModal = async () => {
  if (!editApiKeyValue.value || editApiKeyValue.value.trim() === '') {
    $q.notify({
      color: 'negative',
      message: 'API Key inválida',
      icon: 'sym_o_warning'
    })
    return
  }

  savingApiKey.value = true
  try {
    await api.put('/supervisors/profile', { apiKey: editApiKeyValue.value.trim() })
    showApiKeyModal.value = false
    profile.value.apiKey = true
    $q.notify({
      color: 'positive',
      message: 'API Key guardada',
      icon: 'sym_o_check_circle'
    })
  } catch {
    $q.notify({
      color: 'negative',
      message: 'Error al guardar',
      icon: 'sym_o_warning'
    })
  } finally {
    savingApiKey.value = false
  }
}

const deleteApiKey = async () => {
  savingApiKey.value = true
  try {
    await api.put('/supervisors/profile', { apiKey: '' })
    showApiKeyModal.value = false
    profile.value.apiKey = false
    editApiKeyValue.value = ''
    $q.notify({
      color: 'positive',
      message: 'API Key eliminada',
      icon: 'sym_o_check_circle'
    })
  } catch {
    $q.notify({
      color: 'negative',
      message: 'Error al eliminar',
      icon: 'sym_o_warning'
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
  { name: 'contractor', label: 'Contratista', align: 'left', field: row => row.instructorId?.fullName || 'Desconocido' },
  { name: 'document', label: 'Documento', align: 'left', field: row => `${row.instructorId?.documentType} ${row.instructorId?.documentNumber}` },
  { name: 'platform', label: 'Plataforma', align: 'left', field: row => formatPlatform(row.platform) },
  { name: 'status', label: 'Estado', align: 'center', field: 'status' },
  { name: 'driveUrl', label: 'PDF Original', align: 'center', field: 'driveUrl' },
  { name: 'actions', label: 'Acciones', align: 'center', field: 'status' }
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

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Eliminar reporte',
    message: `¿Está seguro de que desea eliminar el reporte de ${row.instructorId?.fullName || 'desconocido'}? Esta acción no se puede deshacer.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/dashboard/reports/${row._id}`)
      $q.notify({ color: 'positive', message: 'Reporte eliminado correctamente', icon: 'sym_o_check_circle' })
      loadReports(1)
      loadStats()
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al eliminar el reporte'
      $q.notify({ color: 'negative', message: msg, icon: 'sym_o_warning' })
    }
  })
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
    if (filterPlatform.value) {
      url += `&platform=${encodeURIComponent(filterPlatform.value)}`
    }
    if (filterStatus.value) {
      url += `&status=${encodeURIComponent(filterStatus.value)}`
      console.log('Filtrando por estado:', filterStatus.value)
    }
    if (filterMonth.value) {
      url += `&month=${encodeURIComponent(filterMonth.value)}`
    }
    if (filterYear.value) {
      url += `&year=${encodeURIComponent(filterYear.value)}`
    }
    console.log('URL final:', url)
    const res = await api.get(url)
    if (res.data.success) {
      reports.value = res.data.data
      pagination.value.page = res.data.pagination.page
      pagination.value.rowsNumber = res.data.pagination.total
      pagination.value.totalPages = res.data.pagination.totalPages
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Error cargando historial de certificados', icon: 'sym_o_error' })
  } finally {
    loading.value = false
  }
}

watch(searchFilter, () => {
  pagination.value.page = 1
  loadReports(1)
})
watch([filterPlatform, filterMonth, filterYear, filterStatus], () => {
  pagination.value.page = 1
  loadReports(1)
})

const onRequest = (props) => {
  pagination.value.page = props.pagination.page
  loadReports(props.pagination.page)
}

onMounted(async () => {
  // Intentar cargar datos. Si falla (backend reconectando a MongoDB),
  // reintentar automáticamente después de 2 segundos.
  try {
    await Promise.all([loadStats(), loadReports(1), fetchProfile()])
  } catch {
    setTimeout(async () => {
      await Promise.all([loadStats(), loadReports(1), fetchProfile()])
    }, 2000)
  }
})

</script>

<style scoped>
.filter-row {
  background: var(--bg-light, #f5f5f5);
  border-bottom: 1px solid var(--border, #e0e0e0);
}

:deep(.filter-select .q-field__control) {
  border-radius: 8px !important;
  height: 36px;
  background: var(--white, #fff);
}
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
  line-height: 3rem;
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
  margin: 0 0 0;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }
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

.stat-card-premium.drive {
  border-left: 4px solid #4285f4;
}

.stat-card-premium.api {
  border-left: 4px solid var(--color_button);
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

.stat-card-premium.drive .stat-icon-box {
  background-color: #e8f0fe;
  color: #4285f4;
}

.stat-card-premium.api .stat-icon-box {
  background-color: var(--primary-light);
  color: var(--color_button);
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

.stat-link {
  display: inline-flex;
  align-items: center;
  color: #4285f4;
  font-weight: 600;
  font-size: 1.1rem;
  text-decoration: none;
  transition: opacity 0.2s;
}

.stat-link:hover {
  opacity: 0.8;
}

.api-btn {
  background: var(--color_button);
  color: white;
  border-radius: 8px;
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

/* Profile Menu */
.profile-menu {
  min-width: 280px;
  padding: 0;
}

.profile-header {
  background: var(--primary, #2e7d32);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile-icon {
  background: rgba(255, 255, 255, 0.2);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-info {
  flex: 1;
}

.profile-name {
  color: white;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.profile-role {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  margin: 0.2rem 0 0;
}

.profile-details {
  padding: 1rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-dark);
  font-size: 0.9rem;
}

.profile-notice {
  padding: 1rem;
  background: var(--bg-light, #f4f7f5);
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
