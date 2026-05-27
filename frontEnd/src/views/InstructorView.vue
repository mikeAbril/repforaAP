<template>
  <q-page class="form-page">
    <div class="page-container">

      <header class="page-header text-center q-mb-lg">
        <div class="logo-container-home">
          <img src="@/assets/logo-sena.png" alt="SENA Logo" class="home-logo" />
        </div>
        <h1 class="hero-title">
          Gestión de <br>
          <span class="accent-text">Certificados de Seguridad Social</span>
        </h1>
        <p class="hero-desc">Seleccione la plataforma para procesar su certificado.</p>
      </header>

      <q-form ref="formRef" @submit="onSubmit" class="q-gutter-y-md form-content">

        <!-- Sección: Selección de Plataforma -->
        <div class="form-section-container fade-in">
          <div class="section-header q-mb-sm">
            <q-icon name="sym_o_cloud_queue" size="20px" color="primary" class="q-mr-sm" />
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
                  :popup-content-style="{ width: '350px' }"
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
              <q-icon :name="section.icon" color="primary" size="20px" class="q-mr-sm" />
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
                    :options="field.allowNewValue ? (filteredOptions[field.name] || getOptions(field.options)) : getOptions(field.options)"
                    :label="formData[field.name] ? undefined : getPlaceholder(field.name)"
                    dense
                    emit-value
                    map-options
                    :use-input="!!field.allowNewValue"
                    :input-debounce="field.allowNewValue ? 0 : undefined"
                    :filter="field.allowNewValue ? (val, update) => filterFn(val, update, field.name, field.options) : undefined"
                    :new-value-mode="field.allowNewValue ? 'add-unique' : undefined"
                    @new-value="(val, done) => { if (field.allowNewValue) done(val, 'add-unique') }"
                    :popup-content-style="{ width: '350px' }"
                    lazy-rules
                    :rules="[val => (val !== null && val !== undefined && val !== '') || 'El campo es requerido']"
                    class="style-select"
                  >
                    <template v-slot:prepend>
                      <q-icon :name="'sym_o_' + getIcon(field.name)" size="20px" />
                    </template>
                    <template v-slot:no-option>
                      <q-item>
                        <q-item-section class="text-grey">
                          Presione Enter para usar este valor
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>

                  <q-input
                    v-else-if="field.type === 'input'"
                    filled
                    v-model="formData[field.name]"
                    :label="field.mask ? undefined : getPlaceholder(field.name)"
                    dense
                    :type="field.isNumber ? 'tel' : 'text'"
                    :mask="field.mask"
                    @blur="field.name === 'documentNumber' ? onDocumentNumberBlur() : null"
                    @keypress="field.isNumber && !field.mask ? (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); } : null"
                    lazy-rules
                    :rules="[
                      val => (val !== null && val !== undefined && val !== '') || 'El campo es requerido',
                      val => !field.isNumber || field.mask || /^\d+$/.test(val) || 'Solo se permiten números'
                    ]"
                  >
                    <template v-slot:prepend>
                      <q-icon :name="'sym_o_' + getIcon(field.name)" size="20px" />
                    </template>
                  </q-input>

                  <q-input
                    v-else-if="field.type === 'date'"
                    filled
                    v-model="formData[field.name]"
                    :label="getPlaceholder(field.name)"
                    dense
                    readonly
                    input-class="cursor-pointer"
                    class="cursor-pointer"
                    lazy-rules
                    :rules="[val => (val !== null && val !== undefined && val !== '') || 'El campo es requerido']"
                    :ref="el => { if (el) inputRefs[field.name] = el }"
                  >
                    <template v-slot:prepend>
                      <q-icon :name="'sym_o_' + getIcon(field.name)" size="20px" class="cursor-pointer" />
                    </template>
                    <template v-slot:append>
                      <q-icon name="sym_o_event" class="cursor-pointer" />
                    </template>
                    <q-popup-proxy transition-show="scale" transition-hide="scale">
                      <q-date 
                        v-model="formData[field.name]" 
                        mask="YYYY-MM-DD"
                        @update:model-value="() => { setTimeout(() => { if (inputRefs[field.name]) inputRefs[field.name].validate(); }, 50) }"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Cerrar" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-input>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Botones -->
        <div class="q-mt-md row justify-center q-gutter-md">
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

      <!-- Overlay de carga tras enviar solicitud -->
      <div v-if="showSuccessOverlay" class="success-overlay">
        <div class="success-overlay-content">
          <q-spinner v-if="isProcessing" color="white" size="50px" />
          <q-icon v-else name="sym_o_check_circle" size="50px" color="white" />
          <p class="success-overlay-text">{{ overlayMessage }}</p>
        </div>
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { formConfigs, mesesOptions, mesesNombresOptions, aniosOptions, diasOptions } from '@/static/formConfigs';
import { postData, getData } from '@/services/apiClient';

const router = useRouter();
const $q = useQuasar();
const isSubmitting = ref(false);
const isProcessing = ref(false);
const overlayMessage = ref('Procesando solicitud...');
const showSuccessOverlay = ref(false);
const formRef = ref(null);
const selectedPlatform = ref(null);
const inputRefs = ref({});

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
  fechaPago: 'calendar_today',
  fechaExpedicion: 'edit_calendar'
};

const getIcon = (fieldName) => iconMap[fieldName] || 'input';

const placeholderMap = {
  documentType: 'Seleccione el tipo de documento...',
  documentNumber: 'Escribe tu número de documento...',
  documentIssueDate: 'Selecciona la fecha de expedición...',
  fullName: 'Escribe tu nombre completo...',
  email: 'Escribe tu correo electrónico...',
  eps: 'Selecciona tu EPS...',
  mes: 'Selecciona el mes...',
  anio: 'Selecciona el año...',
  supervisorId: 'Selecciona...',
  numeroPlanilla: 'Escribe el número de planilla...',
  valorPagado: 'Escribe el valor total pagado...',
  fechaPago: 'Selecciona la fecha de pago...',
  fechaExpedicion: 'Escribe la fecha de expedición...'
};

const getPlaceholder = (fieldName) => placeholderMap[fieldName] || 'Ingrese el valor...';

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

// Campos que nunca se autocompletan
const SKIP_FIELDS_ALWAYS = ['mes', 'anio'];
const SKIP_FIELDS_MI_PLANILLA = ['numeroPlanilla', 'valorPagado', 'fechaPago'];

const onDocumentNumberBlur = async () => {
  if (!formData.documentType || !formData.documentNumber) return;

  try {
    const data = await getData(`/reports/instructors/lookup?documentType=${formData.documentType}&documentNumber=${formData.documentNumber}`);

    if (!data.success || !data.found) return;

    const instructor = data.instructor;

    // Formatear documentIssueDate a YYYY-MM-DD si existe
    if (instructor.documentIssueDate) {
      const date = new Date(instructor.documentIssueDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      instructor.documentIssueDate = `${year}-${month}-${day}`;
    }

    // Campos que no se llenan para esta plataforma
    const skipFields = [...SKIP_FIELDS_ALWAYS];
    if (selectedPlatform.value === 'mi_planilla') {
      skipFields.push(...SKIP_FIELDS_MI_PLANILLA);
    }

    // Llenar solo los campos que existan en el formData actual y no esten en skipFields
    Object.keys(instructor).forEach(key => {
      if (key in formData && !skipFields.includes(key) && instructor[key] !== null && instructor[key] !== undefined) {
        formData[key] = instructor[key];
      }
    });

    $q.notify({
      color: 'positive',
      position: 'top',
      message: 'Datos del instructor cargados correctamente',
      icon: 'sym_o_check_circle'
    });
  } catch (error) {
    console.error('Error buscando instructor:', error);
  }
};

const onPlatformChange = (platformId) => {
  initFormData(platformId);
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
  isProcessing.value = true;
  overlayMessage.value = 'Procesando solicitud...';
  showSuccessOverlay.value = true;
  try {
    const payload = {
      documentType: formData.documentType,
      documentNumber: formData.documentNumber,
      fullName: formData.fullName,
      email: formData.email,
      documentIssueDate: formData.documentIssueDate
        ? formData.documentIssueDate.replace(/\//g, '-')
        : null,
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
    delete payload.platformData.email;
    delete payload.platformData.documentIssueDate;
    delete payload.platformData.eps;
    delete payload.platformData.supervisorId;

    console.log('Enviando datos a /reports:', payload);
    await postData('/reports', payload);

    isProcessing.value = false;
    overlayMessage.value = '¡Solicitud enviada correctamente!';

    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('Error al enviar solicitud:', error);
    showSuccessOverlay.value = false;
    $q.notify({
      color: 'negative',
      position: 'top',
      message: 'Error al enviar la solicitud',
      icon: 'sym_o_report_problem'
    });
  } finally {
    isSubmitting.value = false;
  }
};

</script>

<style scoped>
.form-page {
  background-color: var(--bg-light);
  min-height: 100vh;
}

.page-container {
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
}

.logo-container-home {
  margin: 0 auto 1.5rem;
  background: var(--white);
  width: 70px;
  height: 70px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  border: 1px solid var(--border);
}

.home-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.hero-title {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 0.5rem;
  color: var(--text-dark);
}

.accent-text { color: var(--color_button); }

.hero-desc {
  color: var(--text-muted);
  font-size: 1rem;
}

.form-content {
  margin-top: 1.5rem;
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
  .page-container { padding: 1rem; }
  .hero-title { font-size: 1.5rem; }
  .form-section-container { padding: 0.75rem; }
}

.success-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
}

.success-overlay-content {
  background: var(--color_button);
  border-radius: 16px;
  padding: 2rem 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.success-overlay-text {
  color: white;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
</style>
