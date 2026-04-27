<template>
  <q-page class="form-page-premium q-pa-md">
    <q-card class="unified-card-premium" flat v-if="config">
      
      <!-- Card Header -->
      <q-card-section class="header-section">
        <div class="row items-center no-wrap">
          <q-btn flat round dense icon="arrow_back" color="grey-7" class="q-mr-md" @click="goBack" />
          <div class="header-content">
            <h1 class="form-title">Solicitud de Certificado</h1>
            <p class="form-subtitle text-uppercase">{{ config.title }}</p>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" color="grey-4" @click="goBack" />
        </div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-form @submit="onSubmit" class="q-gutter-y-md">
          
          <div v-for="(section, sIdx) in config.sections" :key="sIdx" class="form-section-container">
            <div class="section-header q-mb-sm">
              <q-icon :name="section.icon" color="primary" size="xs" class="q-mr-sm" />
              <span class="section-label">{{ section.title }}</span>
            </div>
            
            <div class="row q-col-gutter-md">

              <div v-for="(field, fIdx) in section.fields" :key="fIdx" :class="`col-12 col-md-${field.col}`">
                
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

          <!-- Bottom Action -->
          <div class="q-mt-md row justify-center">
            <q-btn 
              type="submit" 
              color="primary" 
              class="submit-btn-premium" 
              unelevated
              :loading="isSubmitting"
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
  </q-page>
</template>


<script setup>
import { reactive, ref, computed, watchEffect } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { postData } from '@/services/apiClient';
import { formConfigs, mesesOptions, mesesNombresOptions, aniosOptions, diasOptions } from '@/static/formConfigs';

const props = defineProps({
  platform: {
    type: String,
    required: true
  }
});

const $q = useQuasar();
const router = useRouter();
const config = computed(() => formConfigs[props.platform]);
const isSubmitting = ref(false);

const goBack = () => {
  router.push('/');
};

const formData = reactive({});
const filteredOptions = reactive({});

// Inicializar data basado en campos
watchEffect(() => {
  if (config.value) {
    config.value.sections.forEach(section => {
      section.fields.forEach(field => {
        if (!(field.name in formData)) {
          formData[field.name] = null;
        }
      });
    });
  }
});

// Re-leído el backend: es GET en routes/supervisorRoutes.js
import { getData } from '@/services/apiClient';

const supervisorsList = ref([]);

const getOptions = (options) => {


  if (options === 'meses') return mesesOptions;
  if (options === 'mesesNombres') return mesesNombresOptions;
  if (options === 'anios') return aniosOptions;
  if (options === 'dias') return diasOptions;
  if (options === 'supervisors') return supervisorsList.value;
  return options;
};

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

const filterFn = (val, update, fieldName, originalOptions) => {
  if (val === '') {
    update(() => {
      filteredOptions[fieldName] = getOptions(originalOptions);
    });
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
  isSubmitting.value = true;
  try {
    // Estructurar el payload para que coincida con lo que espera el backend
    const payload = {
      documentType: formData.documentType,
      documentNumber: formData.documentNumber,
      fullName: formData.fullName,
      eps: formData.eps || 'N/A',
      supervisorId: formData.supervisorId,
      reportMonth: formData.mes,
      reportYear: formData.anio,
      platform: props.platform,
      platformData: {
        ...formData
      }
    };

    // Limpiar duplicados en platformData
    delete payload.platformData.documentType;
    delete payload.platformData.documentNumber;
    delete payload.platformData.fullName;
    delete payload.platformData.eps;
    delete payload.platformData.supervisorId;
    delete payload.platformData.reportMonth;
    delete payload.platformData.reportYear;

    const finalPayload = JSON.stringify(payload, null, 2);
    console.log(`🚀 Enviando datos a /reports:`, payload);
    const response = await postData('/reports', payload);
    
    // Resetear el formulario tras éxito
    if (config.value) {
      config.value.sections.forEach(section => {
        section.fields.forEach(field => {
          formData[field.name] = null;
        });
      });
    }
    
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

.form-page-premium {
  font-family: 'Inter', sans-serif;
  background-color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
}

.unified-card-premium {
  width: 100%;
  max-width: 900px;
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 40px rgba(0,0,0,0.03);
  overflow: hidden;
}

.header-section {
  border-bottom: 1px solid #f1f5f9;
  padding: 0.75rem 1.5rem;
}

.form-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  line-height: 1.2;
}

.form-subtitle {
  font-size: 0.7rem;
  font-weight: 800;
  color: #2e7d32;
  margin: 0;
  letter-spacing: 0.05em;
}

.form-section-container {
  background-color: #ffffff;
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

/* Field Styles */
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

/* Override Quasar Inputs */
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

/* Submit Button */
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

@media (max-width: 600px) {
  .page-container { padding: 0.5rem; }
  .unified-card-premium { border-radius: 0; border: none; }
  .form-section-container { padding: 0.75rem; border-radius: 12px; }
}

</style>

