<template>
  <q-page class="change-password-page-premium">
    <div class="change-password-container fade-in">
      
      <!-- Left Side: Security Message -->
      <div class="info-side">
        <div class="info-content">
          <div class="security-icon-box q-mb-lg">
            <q-icon name="security" size="48px" color="white" />
          </div>
          <h1 class="info-title">Actualice su <br> Contraseña</h1>
          <p class="info-description">
            Por su seguridad, es obligatorio cambiar la contraseña en su primer inicio de sesión. 
            Use una clave que no haya utilizado anteriormente.
          </p>
          <div class="security-checklist">
            <div class="check-item">
              <q-icon name="check_circle" color="green-4" size="xs" class="q-mr-sm" />
              <span>Mínimo 6 caracteres</span>
            </div>
            <div class="check-item">
              <q-icon name="check_circle" color="green-4" size="xs" class="q-mr-sm" />
              <span>Combine letras y números</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side: Form -->
      <div class="form-side">
        <q-form @submit="onSubmit" class="change-form">
          <header class="form-header">
            <h2 class="form-title">Nueva Clave</h2>
            <p class="form-subtitle">Configure su acceso personal</p>
          </header>

          <div class="field-group">
            <label class="field-label">Nueva Contraseña</label>
            <q-input 
              outlined 
              v-model="newPassword" 
              placeholder="••••••••"
              class="premium-input"
              dense
              :type="showPassword ? 'text' : 'password'"
              :rules="[
                val => val && val.length >= 6 || 'La contraseña debe tener al menos 6 caracteres'
              ]"
            >
              <template v-slot:prepend>
                <q-icon name="lock_outline" color="primary" />
              </template>
              <template v-slot:append>
                <q-btn 
                  flat round dense 
                  :icon="showPassword ? 'visibility_off' : 'visibility'" 
                  @click="showPassword = !showPassword"
                  color="grey-6"
                />
              </template>
            </q-input>
          </div>

          <div class="field-group">
            <label class="field-label">Confirmar Contraseña</label>
            <q-input 
              outlined 
              v-model="confirmPassword" 
              placeholder="••••••••"
              class="premium-input"
              dense
              :type="showConfirmPassword ? 'text' : 'password'"
              :rules="[
                val => val === newPassword || 'Las contraseñas no coinciden'
              ]"
            >
              <template v-slot:prepend>
                <q-icon name="lock_reset" color="primary" />
              </template>
              <template v-slot:append>
                <q-btn 
                  flat round dense 
                  :icon="showConfirmPassword ? 'visibility_off' : 'visibility'" 
                  @click="showConfirmPassword = !showConfirmPassword"
                  color="grey-6"
                />
              </template>
            </q-input>
          </div>

          <q-btn 
            type="submit" 
            color="primary" 
            class="submit-btn-premium q-mt-md" 
            unelevated
            :loading="loading"
          >
            <div class="row items-center no-wrap">
              <span class="q-mr-md">Guardar y Continuar</span>
              <q-icon name="chevron_right" />
            </div>
          </q-btn>

          <p class="security-footer">
            <q-icon name="verified_user" size="14px" class="q-mr-xs" />
            Sus datos están encriptados mediante protocolos de seguridad.
          </p>
        </q-form>
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { postData } from '@/services/apiClient'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)

const onSubmit = async () => {
  loading.value = true
  try {
    const response = await postData('/auth/change-password', {
      newPassword: newPassword.value
    })

    if (response.success) {
      // Actualizar el token en el store para que el guard vea mustChangePassword: false
      if (response.token) {
        authStore.setToken(response.token)
      }

      $q.notify({
        color: 'positive',
        message: 'Contraseña actualizada correctamente',
        icon: 'check_circle'
      })
      router.push('/supervisor')
    }
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al cambiar la contraseña'
    $q.notify({
      color: 'negative',
      message: msg,
      icon: 'report_problem'
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.change-password-page-premium {
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1.5rem;
}

.change-password-container {
  width: 100%;
  max-width: 900px;
  height: 520px;
  background: white;
  border-radius: 32px;
  display: flex;
  overflow: hidden;
  box-shadow: 0 30px 60px -12px rgba(15, 23, 42, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.info-side {
  flex: 0 0 40%;
  background-color: #0f172a;
  padding: 3rem;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.security-icon-box {
  background: rgba(255, 255, 255, 0.1);
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-title {
  font-size: 1.85rem;
  font-weight: 800;
  line-height: 1.2;
}

.info-description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
}

.security-checklist {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.check-item {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: #94a3b8;
}

.form-side {
  flex: 1;
  padding: 3rem 4.5rem;
  display: flex;
  align-items: center;
  background-color: #ffffff;
}

.change-form {
  width: 100%;
}

.form-header {
  margin-bottom: 2rem;
}

.form-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.form-subtitle {
  color: #64748b;
  font-size: 0.9rem;
}

.field-group {
  margin-bottom: 1.25rem;
}

.field-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 0.5rem;
  margin-left: 0.25rem;
}

:deep(.premium-input .q-field__control) {
  border-radius: 14px !important;
  background-color: #f8fafc;
}

.submit-btn-premium {
  width: 100%;
  border-radius: 16px;
  padding: 0.8rem;
  font-weight: 800;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.submit-btn-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.1);
}

.security-footer {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fade-in {
  animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 850px) {
  .change-password-container {
    flex-direction: column;
    height: auto;
    max-width: 450px;
  }
  .info-side {
    padding: 2.5rem;
  }
  .form-side {
    padding: 2.5rem 2rem;
  }
}
</style>
