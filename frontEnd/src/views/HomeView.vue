<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="val => { if (!val) closeModal() }"
  >
    <q-card class="form-modal-card">
      <q-bar class="bg-primary text-white modal-bar">
        <div class="bar-logo">
          <img src="@/assets/logo-sena.png" alt="SENA" class="bar-logo-img" />
        </div>
        <div class="bar-title">
          <span class="bar-title-main">Solicitud de Certificado</span>
          <span class="bar-title-sub">Seguridad Social</span>
        </div>
        <q-space />
        <q-btn dense flat icon="close" @click="closeModal" />
      </q-bar>

      <q-card-section class="modal-body q-pa-md">
        <q-form @submit="onSubmit" class="q-gutter-y-md">

          <!-- Sección: Selección de Plataforma -->
          <div class="form-section-container">
            <div class="section-header q-mb-sm">
              <q-icon name="cloud_queue" color="primary" size="xs" class="q-mr-sm" />
              <span class="section-label">Plataforma de Seguridad Social</span>
            </div>
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <div class="field-group">
                  <label class="field-label">Seleccione la plataforma</label>
                  <q-select
                    outlined
                    v-model="selectedPlatform"
                    :options="platformOptions"
                    label="Seleccione una plataforma..."
                    color="primary"
                    dense
                    emit-value
                    map-options
                    class="premium-input"
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
                <q-icon :name="section.icon" color="primary" size="xs" class="q-mr-sm" />
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
                      outlined
                      v-model="formData[field.name]"
                      :options="filteredOptions[field.name] || getOptions(field.options)"
                      :label="formData[field.name] ? undefined : 'Seleccione una opción...'"
                      color="primary"
                      dense
                      emit-value
                      map-options
                      use-input
                      input-debounce="0"
                      @filter="(val, update) => filterFn(val, update, field.name, field.options)"
                      :new-value-mode="field.allowNewValue ? 'add-unique' : undefined"
                      @new-value="(val, done) => { if (field.allowNewValue) done(val, 'add-unique') }"
                      lazy-rules
                      :rules="[val => (val !== null && val !== undefined && val !== '') || 'Este campo es obligatorio']"
                      class="premium-input"
                    >
                      <template v-slot:no-option>
                        <q-item>
                          <q-item-section class="text-grey">
                            {{ field.allowNewValue ? 'Presione Enter para usar este valor' : 'No hay resultados' }}
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>

                    <q-input
                      v-else-if="field.type === 'input'"
                      outlined
                      v-model="formData[field.name]"
                      :placeholder="field.mask ? undefined : 'Ingrese el valor...'"
                      color="primary"
                      dense
                      :type="field.isNumber ? 'tel' : 'text'"
                      :mask="field.mask"
                      @keypress="field.isNumber && !field.mask ? (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); } : null"
                      lazy-rules
                      :rules="[
                        val => (val !== null && val !== undefined && val !== '') || 'Este campo es obligatorio',
                        val => !field.isNumber || field.mask || /^\d+$/.test(val) || 'Solo se permiten números'
                      ]"
                      class="premium-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Botón de enviar -->
          <div class="q-mt-md row justify-center">
            <q-btn
              type="submit"
              color="primary"
              class="submit-btn-premium"
              unelevated
              :loading="isSubmitting"
              :disable="!selectedPlatform"
            >
              <div class="row items-center no-wrap">
                <span class="q-mr-md">Enviar Solicitud</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </div>
            </q-btn>
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.form-modal-card {
  font-family: 'Inter', sans-serif;
  width: 100%;
  max-width: 900px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  max-height: 100vh;
  border-radius: 0;
}

.modal-bar {
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bar-logo {
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.bar-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bar-title {
  display: flex;
  flex-direction: column;
}

.bar-title-main {
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.2;
}

.bar-title-sub {
  font-size: 0.6rem;
  font-weight: 800;
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
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #1e293b;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  margin-left: 0.25rem;
}

:deep(.premium-input .q-field__control) {
  border-radius: 10px !important;
  background-color: #f8fafc;
  transition: all 0.2s ease;
  height: 40px !important;
  min-height: 40px !important;
}

:deep(.premium-input .q-field__control:before) {
  border: 1px solid #e2e8f0 !important;
}

:deep(.premium-input .q-field__control:after) {
  border-width: 2px !important;
}

:deep(.premium-input.q-field--focused .q-field__control) {
  background-color: white;
  box-shadow: 0 0 0 4px rgba(57, 169, 0, 0.08);
}

:deep(.premium-input .q-field__native),
:deep(.premium-input .q-field__input) {
  font-weight: 500;
  color: #0f172a;
  font-size: 0.85rem;
}

.submit-btn-premium {
  border-radius: 12px;
  padding: 0.6rem 2.5rem;
  font-weight: 800;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.submit-btn-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(57, 169, 0, 0.2);
}

.fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .form-section-container { padding: 0.75rem; border-radius: 12px; }
}
</style>
