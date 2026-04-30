<template>
  <q-page class="admin-page-premium q-pa-lg">
    <div class="page-container">
      
      <header class="admin-header row items-center justify-between q-mb-xl">
        <div class="header-left row items-center no-wrap">
          <q-btn flat round icon="arrow_back" color="primary" @click="router.push('/supervisor')" class="q-mr-md" />
          <div>
            <h1 class="admin-title">Gestión de Supervisores</h1>
            <p class="admin-subtitle">Administración total de cuentas y permisos</p>
          </div>
        </div>
        <q-btn 
          color="primary" 
          class="add-btn-premium"
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
            :rows="supervisors"
            :columns="columns"
            row-key="_id"
            :loading="loading"
            class="premium-table"
          >
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn flat round color="primary" icon="edit" size="sm" @click="editSupervisor(props.row)">
                  <q-tooltip>Editar Todo</q-tooltip>
                </q-btn>
              </q-td>
            </template>
            
            <template v-slot:body-cell-role="props">
              <q-td :props="props">
                <q-badge :color="props.row.role === 'admin' ? 'purple' : 'blue-grey'" class="role-badge">
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
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">{{ isEditing ? 'Editar Supervisor' : 'Nuevo Supervisor' }}</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section>
            <q-form @submit="saveSupervisor" class="q-gutter-md">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-4">
                  <q-select
                    outlined
                    v-model="formData.documentType"
                    :options="['CC', 'CE', 'PA', 'TI', 'CD', 'PE', 'PT', 'RC', 'SC']"
                    label="Tipo Doc"
                    dense
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-12 col-md-8">
                  <q-input
                    outlined
                    v-model="formData.documentNumber"
                    label="Número Documento"
                    dense
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-12">
                  <q-input
                    outlined
                    v-model="formData.name"
                    label="Nombre Completo"
                    dense
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-12">
                  <q-input
                    outlined
                    v-model="formData.email"
                    label="Correo Electrónico"
                    dense
                    type="email"
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-12">
                  <q-input
                    outlined
                    v-model="formData.password"
                    label="Contraseña"
                    dense
                    :placeholder="isEditing ? 'Dejar en blanco para no cambiar' : 'Por defecto su documento'"
                    :rules="[!isEditing && !formData.password || !!formData.password || 'Requerido']"
                  />
                </div>
                <div class="col-12">
                  <q-select
                    outlined
                    v-model="formData.role"
                    :options="['admin', 'supervisor']"
                    label="Rol"
                    dense
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-12">
                  <q-input
                    outlined
                    v-model="formData.apiKey"
                    label="2Captcha API Key"
                    dense
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div class="row justify-end q-mt-md">
                <q-btn label="Cancelar" flat color="grey" v-close-popup />
                <q-btn :label="isEditing ? 'Actualizar' : 'Crear'" color="primary" type="submit" :loading="saving" />
              </div>
            </q-form>
          </q-card-section>
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
  name: '',
  email: '',
  password: '',
  role: 'supervisor',
  apiKey: ''
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
    name: '',
    email: '',
    password: '',
    role: 'supervisor',
    apiKey: ''
  }
  showDialog.value = true
}

const editSupervisor = (supervisor) => {
  isEditing.value = true
  currentId.value = supervisor._id
  formData.value = {
    documentType: supervisor.documentType,
    documentNumber: supervisor.documentNumber,
    name: supervisor.name,
    email: supervisor.email,
    password: '', // Password stays empty unless changed
    role: supervisor.role,
    apiKey: supervisor.apiKey || ''
  }
  showDialog.value = true
}

const saveSupervisor = async () => {
  saving.value = true
  try {
    const payload = { ...formData.value }
    if (isEditing.value && !payload.password) {
      delete payload.password
    }

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
  background-color: #f8fafc;
  min-height: 100vh;
}
.page-container {
  max-width: 1200px;
  margin: 0 auto;
}
.admin-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}
.admin-subtitle {
  color: #64748b;
  font-size: 0.9rem;
}
.table-card-premium {
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}
.form-card-premium {
  width: 500px;
  max-width: 90vw;
  border-radius: 20px;
}
.add-btn-premium {
  border-radius: 12px;
  padding: 0.6rem 1.5rem;
  font-weight: 700;
}
.role-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.7rem;
}
</style>
