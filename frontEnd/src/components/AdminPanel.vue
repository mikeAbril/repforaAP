<template>
  <div class="admin-panel">
    <div class="row items-center justify-between q-mb-md">
      <div class="header-info">
        <h3 class="card-title text-h5 text-weight-bold q-ma-none text-dark">Panel de Administración</h3>
        <p class="card-subtitle text-grey-7 q-mt-xs q-mb-none">Gestión de usuarios y configuración del sistema</p>
      </div>
    </div>

    <!-- Tabs para navegar entre secciones -->
    <q-card class="tabs-card-premium q-mb-md">
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey-7"
        active-color="var(--color_button)"
        indicator-color="var(--color_button)"
        align="left"
        no-caps
      >
        <q-tab name="users" icon="sym_o_people" label="Usuarios" />
        <q-tab name="drive" icon="sym_o_cloud" label="Google Drive" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <!-- Tab de Usuarios -->
        <q-tab-panel name="users" class="q-pa-none">
          <div class="q-pa-md">
            <div class="row items-center justify-between q-mb-md">
              <span class="text-subtitle1 text-weight-medium">Lista de Usuarios</span>
              <q-btn
                class="bg-green-9 text-white"
                unelevated
                @click="openCreateDialog"
                size="sm"
              >
                <q-icon name="sym_o_add" class="q-mr-sm" size="16px" />
                Nuevo Usuario
              </q-btn>
            </div>

            <q-table
              flat
              bordered
              :rows="supervisors"
              :columns="columns"
              row-key="_id"
              :loading="loading"
              no-data-label="Sin registros aún"
              class="premium-table"
            >
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn round size="xs" color="green-10" icon="sym_o_edit" class="q-mr-sm" @click="editSupervisor(props.row)">
                    <q-tooltip>Editar</q-tooltip>
                  </q-btn>
                  <q-btn round size="xs" color="negative" icon="sym_o_delete" @click="confirmDelete(props.row)">
                    <q-tooltip>Eliminar</q-tooltip>
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
        </q-tab-panel>

        <!-- Tab de Google Drive -->
        <q-tab-panel name="drive" class="q-pa-none">
          <DriveAuthPanel />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Dialog for Create/Edit -->
    <q-dialog v-model="showDialog" persistent backdrop-filter="blur(10px)">
      <q-card class="form-card-premium shadow-24">
        <q-card-section class="dialog-header">
          <div class="row items-center q-py-sm">
            <div class="header-icon">
              <q-icon :name="isEditing ? 'sym_o_edit' : 'sym_o_person_add'" size="24px" color="white" />
            </div>
            <div class="header-text">
              <h5 class="q-ma-none text-white text-weight-bold">
                {{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}
              </h5>
              <span class="dialog-subtitle">
                {{ isEditing ? 'Actualice la información del usuario' : 'Complete los datos para registrar un nuevo usuario' }}
              </span>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="dialog-content q-pa-xl">
          <q-form @submit="saveSupervisor" class="q-gutter-lg">
            <div class="row q-col-gutter-lg">
              <div class="col-12 col-md-5">
                <div class="field-group">
                  <label class="field-label">Tipo de Documento</label>
                  <q-select
                    filled
                    v-model="formData.documentType"
                    :options="documentTypeOptions"
                    label="Seleccione..."
                    emit-value
                    map-options
                    dense
                    class="style-select"
                    :rules="[val => !!val || 'El campo es requerido']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="sym_o_badge" size="20px" />
                    </template>
                  </q-select>
                </div>
              </div>
              <div class="col-12 col-md-7">
                <div class="field-group">
                  <label class="field-label">Número de Documento</label>
                  <q-input
                    filled
                    v-model="formData.documentNumber"
                    label="Ingrese el número..."
                    dense
                    lazy-rules
                    :rules="[val => (val && val.trim().length > 0) || 'El campo es requerido']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="sym_o_tag" size="20px" />
                    </template>
                  </q-input>
                </div>
              </div>

              <div class="col-12">
                <div class="field-group">
                  <label class="field-label">Nombre Completo</label>
                  <q-input
                    filled
                    v-model="formData.name"
                    label="Nombres y apellidos..."
                    dense
                    lazy-rules
                    :rules="[val => (val && val.trim().length > 0) || 'El campo es requerido']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="sym_o_person" size="20px" />
                    </template>
                  </q-input>
                </div>
              </div>

              <div class="col-12">
                <div class="field-group">
                  <label class="field-label">Correo Electrónico</label>
                  <q-input
                    filled
                    v-model="formData.email"
                    label="ejemplo@correo.com"
                    dense
                    type="email"
                    lazy-rules
                    :rules="[val => (val && val.trim().length > 0) || 'El campo es requerido']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="sym_o_email" size="20px" />
                    </template>
                  </q-input>
                </div>
              </div>

              <div class="col-12">
                <div class="field-group">
                  <label class="field-label">Rol de Acceso</label>
                  <q-select
                    filled
                    v-model="formData.role"
                    :options="roleOptions"
                    label="Seleccione el rol..."
                    emit-value
                    map-options
                    dense
                    class="style-select"
                    :rules="[val => !!val || 'El campo es requerido']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="sym_o_admin_panel_settings" size="20px" />
                    </template>
                  </q-select>
                </div>
              </div>
            </div>

            <q-separator class="q-mt-lg q-mb-md" />

            <div class="row justify-end q-gutter-md">
              <q-btn
                label="Cancelar"
                flat
                color="grey-7"
                class="cancel-btn"
                v-close-popup
              />
              <q-btn
                :label="isEditing ? 'Actualizar Usuario' : 'Crear Usuario'"
                class="save-btn bg-green-9 text-white"
                type="submit"
                :loading="saving"
                unelevated
              >
                <q-icon :name="isEditing ? 'sym_o_save' : 'sym_o_add'" class="q-ml-xs" size="18px" />
              </q-btn>
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import api from '@/plugins/axios'
import DriveAuthPanel from './DriveAuthPanel.vue'

const $q = useQuasar()
const activeTab = ref('users')
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

const documentTypeOptions = [
  { label: 'Cédula de Ciudadanía', value: 'CC' },
  { label: 'Cédula de Extranjería', value: 'CE' },
  { label: 'Pasaporte', value: 'PA' },
  { label: 'Tarjeta de Identidad', value: 'TI' },
  { label: 'Carné Diplomático', value: 'CD' },
  { label: 'Permiso Especial', value: 'PE' },
  { label: 'Permiso por Protección Temporal', value: 'PT' },
  { label: 'Registro Civil', value: 'RC' },
  { label: 'Salvo Conducto', value: 'SC' }
]

const roleOptions = [
  { label: 'Administrador', value: 'admin' },
  { label: 'Supervisor', value: 'supervisor' }
]

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
    $q.notify({ color: 'negative', message: 'Error cargando usuarios' })
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

const confirmDelete = (supervisor) => {
  $q.dialog({
    title: 'Eliminar usuario',
    message: `¿Está seguro de que desea eliminar a ${supervisor.name}? Esta acción no se puede deshacer.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      const res = await api.delete(`/supervisors/admin/${supervisor._id}`)
      if (res.data.success) {
        $q.notify({ color: 'positive', message: res.data.message, icon: 'sym_o_check_circle' })
        loadSupervisors()
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al eliminar el usuario'
      $q.notify({ color: 'negative', message: msg, icon: 'sym_o_warning' })
    }
  })
}

onMounted(loadSupervisors)
</script>

<style scoped>
.tabs-card-premium {
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.table-card-premium {
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.form-card-premium {
  width: 600px;
  max-width: 90vw;
  border-radius: 20px;
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, var(--color_button) 0%, #1b5e20 100%);
  padding: 1.5rem 2.5rem;
}

.header-icon {
  background: rgba(255, 255, 255, 0.2);
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
}

.header-text h5 {
  font-size: 1.3rem;
  letter-spacing: -0.02em;
}

.dialog-subtitle {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  font-weight: 500;
  margin-top: 0.25rem;
}

.dialog-content {
  padding: 2rem 2.5rem !important;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-left: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.style-select, .q-input {
  border-radius: 12px !important;
}

.cancel-btn {
  border-radius: 10px;
  font-weight: 600;
  padding: 0.5rem 1.5rem;
}

.save-btn {
  border-radius: 10px;
  font-weight: 700;
  padding: 0.5rem 1.5rem;
  letter-spacing: 0.01em;
}

.add-btn-premium {
  border-radius: var(--radius);
  padding: 0.6rem 1.5rem;
  font-weight: 700;
}

:deep(.q-tab-panel) {
  padding: 0;
}
</style>
