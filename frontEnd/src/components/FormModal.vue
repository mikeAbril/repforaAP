<template>
  <q-dialog
    :model-value="modelValue"
    transition-show="slide-up"
    transition-hide="slide-down"
    persistent
    @update:model-value="val => { if (!val) closeModal() }"
  >
    <q-card class="form-modal-card">
      <q-card-section class="bg-green-9 q-px-lg">
        <div class="row items-center q-py-sm">
          <div class="bar-logo">
            <img src="@/assets/logo-sena.png" alt="SENA" class="bar-logo-img" />
          </div>
          <div class="col text-center">
            <h5 class="q-ma-none text-white text-weight-bold text-uppercase">Solicitud de Certificado</h5>
            <span class="dialog-subtitle">Seguridad Social</span>
          </div>
          <q-btn dense flat round icon="close" size="sm" class="text-white" @click="closeModal" />
        </div>
      </q-card-section>

      <q-card-section class="modal-body q-pa-md">
        <q-form @submit="onSubmit" class="q-gutter-y-md">

          <!-- Sección: Selección de Plataforma -->
          <div class="form-section-container">
            <div class="section-header q-mb-sm">
              <span class="material-symbols-outlined q-mr-sm" style="font-size: 20px; color: var(--color_button)">cloud_queue</span>
              <span class="section-label">Plataforma de Seguridad Social</span>
            </div>
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <div class="field-group">
                  <label class="field-label">Seleccione la plataforma</label>
                  <q-select
                    filled
                    v-model="selectedPlatform"
                    :options="platformOptions"
                    label="Seleccione una plataforma..."
                    dense
                    emit-value
                    map-options
                    class="style-select"
                    @update:model-value="onPlatformChange"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Secciones dinámicas de la plataforma seleccionada -->
          <template v-if="currentConfig">
            <div
              v-for="(section, sIdx) in currentConfig.sections"
              :key="sIdx"
              class="form-section-container fade-in"
            >
              <div class="section-header q-mb-sm">
                <span class="material-symbols-outlined q-mr-sm" style="font-size: 20px; color: var(--color_button)">{{ section.icon }}</span>
                <span class="section-label">{{ section.title }}</span>
              </div>

              <div class="row q-col-gutter-md">
                <div
                  v-for="(field, fIdx) in section.fields"
                  :key="fIdx"
                  :class="`col-12 col-md-${field.col}`"
                >
                  <div class="field-group">
                    <label class="field-label">{{ field.label }}</label>

                    <q-select
                      v-if="field.type === 'select'"
                      filled
                      v-model="formData[field.name]"
                      :options="filteredOptions[field.name] || getOptions(field.options)"
                      :label="formData[field.name] ? undefined : 'Seleccione una opción...'"
                      dense
                      emit-value
                      map-options
                      use-input
                      input-debounce="0"
                      @filter="(val, update) => filterFn(val, update, field.name, field.options)"
                      :new-value-mode="field.allowNewValue ? 'add-unique' : undefined"
                      @new-value="(val, done) => { if (field.allowNewValue) done(val, 'add-unique') }"
                      lazy-rules
                      :rules="[val => (val !== null && val !== undefined && val !== '') || 'El campo es requerido']"
                      class="style-select"
                    >
                      <template v-slot:prepend>
                        <span class="material-symbols-outlined" style="font-size: 20px">{{ getIcon(field.name) }}</span>
                      </template>
                      <template v-slot:no-option>
                        <q-item>
                          <q-item-section class="text-grey">
                            {{ field.allowNewValue ? 'Presione Enter para usar este valor' : 'Sin registros aún' }}
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>

                    <q-input
                      v-else-if="field.type === 'input'"
                      filled
                      v-model="formData[field.name]"
                      :placeholder="field.mask ? undefined : 'Ingrese el valor...'"
                      dense
                      :type="field.isNumber ? 'tel' : 'text'"
                      :mask="field.mask"
                      @keypress="field.isNumber && !field.mask ? (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); } : null"
                      lazy-rules
                      :rules="[
                        val => (val !== null && val !== undefined && val !== '') || 'El campo es requerido',
                        val => !field.isNumber || field.mask || /^\d+$/.test(val) || 'Solo se permiten números'
                      ]"
                    >
                      <template v-slot:prepend>
                        <span class="material-symbols-outlined" style="font-size: 20px">{{ getIcon(field.name) }}</span>
                      </template>
                    </q-input>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Botón de enviar -->
          <div class="q-mt-md row justify-center">
            <q-btn
              type="submit"
              class="bg-green-9 text-white q-px-xl"
              label="Enviar Solicitud"
              unelevated
              :loading="isSubmitting"
              :disable="!selectedPlatform"
            />
          </div>

        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { formConfigs, mesesOptions, mesesNombresOptions, aniosOptions, diasOptions } from '@/static/formConfigs';
import { postData, getData } from '@/services/apiClient';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  preselectedPlatform: { type: String, default: null }
});

const emit = defineEmits(['update:modelValue']);

const $q = useQuasar();
const isSubmitting = ref(false);
const selectedPlatform = ref(null);

const platformOptions = [
  { label: 'SOI', value: 'soi' },
  { label: 'ASOPAGOS', value: 'asopagos' },
  { label: 'COMPENSAR (Mi Planilla)', value: 'mi_planilla' },
  { label: 'APORTES EN LÍNEA', value: 'aportes_en_linea' }
];

const currentConfig = computed(() => {
  if (!selectedPlatform.value) return null;
  return formConfigs[selectedPlatform.value] || null;
});

const formData = reactive({});
const filteredOptions = reactive({});
const supervisorsList = ref([]);

const iconMap = {
  documentType: 'badge',
  documentNumber: 'pin',
  fullName: 'person',
  eps: 'local_hospital',
  mes: 'calendar_month',
  anio: 'event',
  supervisorId: 'supervised_user_circle',
  numeroPlanilla: 'receipt_long',
  valorPagado: 'payments',
  fechaPagoDia: 'calendar_today',
  fechaPagoMes: 'date_range',
  fechaPagoAnio: 'event_available',
  fechaExpedicion: 'edit_calendar'
};

const getIcon = (fieldName) => iconMap[fieldName] || 'input';

const fetchSupervisors = async () => {
  try {
    const data = await getData('/supervisors/list');
    if (data.success) {
      supervisorsList.value = data.supervisors.map(s => ({
        label: s.name,
        value: s._id
      }));
    }
  } catch (error) {
    console.error('Error cargando supervisores:', error);
  }
};
fetchSupervisors();

const initFormData = (platformId) => {
  Object.keys(formData).forEach(key => delete formData[key]);
  Object.keys(filteredOptions).forEach(key => delete filteredOptions[key]);
  if (platformId && formConfigs[platformId]) {
    formConfigs[platformId].sections.forEach(section => {
      section.fields.forEach(field => {
        formData[field.name] = null;
      });
    });
  }
};

watch(() => props.modelValue, (open) => {
  if (open) {
    selectedPlatform.value = props.preselectedPlatform || null;
    initFormData(selectedPlatform.value);
  }
});

const onPlatformChange = (platformId) => {
  initFormData(platformId);
};

const closeModal = () => {
  initFormData(null);
  selectedPlatform.value = null;
  emit('update:modelValue', false);
};

const getOptions = (options) => {
  if (options === 'meses') return mesesOptions;
  if (options === 'mesesNombres') return mesesNombresOptions;
  if (options === 'anios') return aniosOptions;
  if (options === 'dias') return diasOptions;
  if (options === 'supervisors') return supervisorsList.value;
  return options;
};

const filterFn = (val, update, fieldName, originalOptions) => {
  if (val === '') {
    update(() => { filteredOptions[fieldName] = getOptions(originalOptions); });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    const options = getOptions(originalOptions);
    filteredOptions[fieldName] = options.filter(v => {
      const label = typeof v === 'object' ? v.label : v;
      return label.toLowerCase().indexOf(needle) > -1;
    });
  });
};

const onSubmit = async () => {
  if (!selectedPlatform.value) return;
  isSubmitting.value = true;
  try {
    const payload = {
      documentType: formData.documentType,
      documentNumber: formData.documentNumber,
      fullName: formData.fullName,
      eps: formData.eps || 'N/A',
      supervisorId: formData.supervisorId,
      reportMonth: formData.mes,
      reportYear: formData.anio,
      platform: selectedPlatform.value,
      platformData: { ...formData }
    };
    delete payload.platformData.documentType;
    delete payload.platformData.documentNumber;
    delete payload.platformData.fullName;
    delete payload.platformData.eps;
    delete payload.platformData.supervisorId;
    delete payload.platformData.reportMonth;
    delete payload.platformData.reportYear;

    console.log('Enviando datos a /reports:', payload);
    await postData('/reports', payload);
    closeModal();

    $q.notify({
      color: 'positive',
      position: 'top',
      message: 'Solicitud enviada a la cola de procesamiento.',
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('Error al enviar solicitud:', error);
    $q.notify({
      color: 'negative',
      position: 'top',
      message: 'Error al enviar la solicitud',
      icon: 'report_problem'
    });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.form-modal-card {
  width: 100%;
  max-width: 60vw;
  max-height: 97vh;
  background: var(--bg-light);
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  overflow: hidden;
}

.bar-logo {
  width: 42px;
  height: 42px;
  background: var(--white);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  flex-shrink: 0;
}

.bar-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.dialog-subtitle {
  font-size: 0.65rem;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding-top: 1rem;
}

.form-section-container {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  border-bottom: 1px dashed var(--border);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--text-dark);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-left: 0.25rem;
}

.fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .form-section-container { padding: 0.75rem; }
}
</style>
