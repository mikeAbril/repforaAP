<template>
  <q-page class="admin-page-premium q-pa-lg">
    <div class="page-container">

      <header class="admin-header row items-center justify-between q-mb-xl">
        <div class="header-left row items-center no-wrap">
          <q-btn flat round icon="arrow_back" class="q-mr-md back-btn-green" @click="router.push('/supervisor')" />
          <div>
            <h1 class="admin-title">Gestión de Supervisores</h1>
            <p class="admin-subtitle">Administración total de cuentas y permisos</p>
          </div>
        </div>
        <q-btn
          class="bg-green-9 text-white add-btn-premium"
          unelevated
          @click="openCreateDialog"
        >
          <q-icon name="add" class="q-mr-sm" />
          Nuevo Supervisor
        </q-btn>
      </header>

      <q-card class="table-card-premium">
        <div class="q-pa-md">
          <q-table
            flat
            bordered
            :rows="supervisors"
            :columns="columns"
            row-key="_id"
            :loading="loading"
            no-data-label="Sin registros aún"
            class="q-mx-md premium-table"
          >
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn round size="xs" color="green-10" icon="edit" @click="editSupervisor(props.row)">
                  <q-tooltip>Editar Supervisor</q-tooltip>
                </q-btn>
              </q-td>
            </template>

            <template v-slot:body-cell-role="props">
              <q-td :props="props">
                <q-badge v-if="props.row.role === 'admin'" class="bg-green-10">
                  {{ props.row.role.toUpperCase() }}
                </q-badge>
                <q-badge v-else class="bg-grey-6">
                  {{ props.row.role.toUpperCase() }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </div>
      </q-card>

      <!-- Dialog for Create/Edit -->
      <q-dialog v-model="showDialog" persistent>
        <q-card class="form-card-premium">
          <q-card-section class="bg-green-9 q-px-lg">
            <h5 class="q-mt-sm q-mb-sm text-white text-center text-weight-bold">
              {{ isEditing ? 'MODIFICA LA INFORMACIÓN' : 'DILIGENCIA LA INFORMACIÓN' }}
            </h5>
          </q-card-section>
          <div class="q-pa-md">
            <q-form @submit="saveSupervisor" class="q-gutter-md">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-4">
                  <q-select
                    filled
                    v-model="formData.documentType"
                    :options="['CC', 'CE', 'PA', 'TI', 'CD', 'PE', 'PT', 'RC', 'SC']"
                    label="Tipo Doc"
                    dense
                    class="style-select"
                    :rules="[val => !!val || 'El campo es requerido']"
                  />
                </div>
                <div class="col-12 col-md-8">
                  <q-input
                    filled
                    v-model="formData.documentNumber"
                    label="Número Documento"
                    dense
                    lazy-rules
                    :rules="[val => (val && val.trim().length > 0) || 'El campo es requerido']"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">badge</span>
                    </template>
                  </q-input>
                </div>
                <div class="col-12" v-if="isEditing">
                  <q-input
                    filled
                    v-model="formData.documentIssueDate"
                    label="Fecha Expedición (AAAA/MM/DD)"
                    dense
                    mask="####/##/##"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">edit_calendar</span>
                    </template>
                  </q-input>
                </div>

                <div class="col-12">
                  <q-input
                    filled
                    v-model="formData.name"
                    label="Nombre Completo"
                    dense
                    lazy-rules
                    :rules="[val => (val && val.trim().length > 0) || 'El campo es requerido']"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">person</span>
                    </template>
                  </q-input>
                </div>
                <div class="col-12">
                  <q-input
                    filled
                    v-model="formData.email"
                    label="Correo Electrónico"
                    dense
                    type="email"
                    lazy-rules
                    :rules="[val => (val && val.trim().length > 0) || 'El campo es requerido']"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">email</span>
                    </template>
                  </q-input>
                </div>
                <div class="col-12">
                  <q-select
                    filled
                    v-model="formData.role"
                    :options="['admin', 'supervisor']"
                    label="Rol"
                    dense
                    class="style-select"
                    :rules="[val => !!val || 'El campo es requerido']"
                  />
                </div>

              </div>

              <div class="row justify-end q-mt-md">
                <q-btn label="Cancelar" flat color="grey" v-close-popup />
                <q-btn :label="isEditing ? 'Actualizar' : 'Crear'" class="bg-green-9 text-white" type="submit" :loading="saving" />
              </div>
            </q-form>
          </div>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import api from '@/plugins/axios'

const $q = useQuasar()
const router = useRouter()
const supervisors = ref([])
const loading = ref(false)
const saving = ref(false)
const showDialog = ref(false)
const isEditing = ref(false)
const currentId = ref(null)

const formData = ref({
  documentType: 'CC',
  documentNumber: '',
  documentIssueDate: '',
  name: '',
  email: '',
  role: 'supervisor'
})

const columns = [
  { name: 'name', label: 'Nombre', align: 'left', field: 'name', sortable: true },
  { name: 'document', label: 'Documento', align: 'left', field: row => `${row.documentType} ${row.documentNumber}` },
  { name: 'email', label: 'Email', align: 'left', field: 'email' },
  { name: 'role', label: 'Rol', align: 'center', field: 'role' },
  { name: 'actions', label: 'Acciones', align: 'center' }
]

const loadSupervisors = async () => {
  loading.value = true
  try {
    const res = await api.get('/supervisors/admin/all')
    if (res.data.success) {
      supervisors.value = res.data.supervisors
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Error cargando supervisores' })
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEditing.value = false
  currentId.value = null
  formData.value = {
    documentType: 'CC',
    documentNumber: '',
    documentIssueDate: '',
    name: '',
    email: '',
    role: 'supervisor'
  }
  showDialog.value = true
}

const editSupervisor = (supervisor) => {
  isEditing.value = true
  currentId.value = supervisor._id
  formData.value = {
    documentType: supervisor.documentType,
    documentNumber: supervisor.documentNumber,
    documentIssueDate: supervisor.documentIssueDate || '',
    name: supervisor.name,
    email: supervisor.email,
    role: supervisor.role
  }
  showDialog.value = true
}

const saveSupervisor = async () => {
  saving.value = true
  try {
    const payload = { ...formData.value }
    
    let res
    if (isEditing.value) {
      res = await api.put(`/supervisors/admin/${currentId.value}`, payload)
    } else {
      res = await api.post('/supervisors/admin', payload)
    }

    if (res.data.success) {
      $q.notify({ color: 'positive', message: res.data.message })
      showDialog.value = false
      loadSupervisors()
    }
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al guardar'
    $q.notify({ color: 'negative', message: msg })
  } finally {
    saving.value = false
  }
}

onMounted(loadSupervisors)
</script>

<style scoped>
.admin-page-premium {
  background-color: var(--bg-light);
  min-height: 100vh;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
}

.admin-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-dark);
  margin: 0;
}

.admin-subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.back-btn-green {
  color: var(--color_button);
}

.table-card-premium {
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.form-card-premium {
  width: 500px;
  max-width: 90vw;
  border-radius: var(--radius);
}

.add-btn-premium {
  border-radius: var(--radius);
  padding: 0.6rem 1.5rem;
  font-weight: 700;
}
</style>
