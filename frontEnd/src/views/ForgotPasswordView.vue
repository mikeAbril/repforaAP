<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="forgot-password-page-premium">
        <div class="forgot-password-container fade-in">

          <!-- Left Side: Information -->
          <div class="info-side">
            <div class="info-content">
              <div class="security-icon-box q-mb-lg">
                <q-icon name="sym_o_key" size="48px" color="white" />
              </div>
              <h1 class="info-title">Recuperar <br> Contraseña</h1>
              <p class="info-description">
                <span v-if="step === 1">
                  Ingresa tu correo electrónico y te enviaremos un código de recuperación.
                </span>
                <span v-else>
                  Ingresa el código que recibiste en tu correo y establece tu nueva contraseña.
                </span>
              </p>
              <div class="security-checklist">
                <div class="check-item">
                  <q-icon name="sym_o_email" color="green-4" size="18px" class="q-mr-sm" />
                  <span>Revisa tu bandeja de entrada</span>
                </div>
                <div class="check-item">
                  <q-icon name="sym_o_schedule" color="green-4" size="18px" class="q-mr-sm" />
                  <span>El código expira en 1 hora</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Side: Form -->
          <div class="form-side">
            <!-- Paso 1: Solicitar código -->
            <q-form @submit="sendCode" class="forgot-form" v-if="step === 1">
              <header class="form-header">
                <h2 class="form-title">Paso 1 de 2</h2>
                <p class="form-subtitle">Ingresa tu correo registrado</p>
              </header>

              <div class="field-group">
                <label class="field-label">Correo Electrónico</label>
                <q-input
                  outlined
                  v-model="email"
                  placeholder="eduardo@gmail.com"
                  class="premium-input"
                  dense
                  type="email"
                  lazy-rules
                  :rules="[val => val && val.length > 0 || 'Campo obligatorio', val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Correo inválido']"
                >
                  <template v-slot:prepend>
                    <q-icon name="sym_o_email" color="primary" size="20px" />
                  </template>
                </q-input>
              </div>

              <q-btn
                type="submit"
                class="submit-btn-premium q-mt-md"
                unelevated
                :loading="loading"
              >
                <div class="row items-center no-wrap">
                  <span class="q-mr-md">Enviar Código</span>
                  <q-icon name="sym_o_check" size="20px" />
                </div>
              </q-btn>

              <div class="back-link q-mt-lg text-center">
                <q-btn flat no-caps color="grey-7" @click="router.push('/login')">
                  <q-icon name="sym_o_arrow_back" size="16px" class="q-mr-sm" />
                  Volver al inicio de sesión
                </q-btn>
              </div>
            </q-form>

            <!-- Paso 2: Verificar código y nueva contraseña -->
            <q-form @submit="resetPassword" class="forgot-form" v-else>
              <header class="form-header">
                <h2 class="form-title">Paso 2 de 2</h2>
                <p class="form-subtitle">Verifica el código y crea tu nueva contraseña</p>
              </header>

              <div class="field-group">
                <label class="field-label">Código de 6 dígitos</label>
                <q-input
                  outlined
                  v-model="code"
                  placeholder="123456"
                  class="premium-input"
                  dense
                  mask="######"
                  lazy-rules
                  :rules="[val => val && val.length === 6 || 'Ingresa los 6 dígitos']"
                >
                  <template v-slot:prepend>
                    <q-icon name="sym_o_key" color="primary" size="20px" />
                  </template>
                </q-input>
              </div>

              <div class="field-group">
                <label class="field-label">Nueva Contraseña</label>
                <q-input
                  outlined
                  v-model="newPassword"
                  placeholder="••••••••"
                  class="premium-input"
                  dense
                  :type="showPassword ? 'text' : 'password'"
                  lazy-rules
                  :rules="[val => val && val.length >= 6 || 'Mínimo 6 caracteres']"
                >
                  <template v-slot:prepend>
                    <q-icon name="sym_o_lock" color="primary" size="20px" />
                  </template>
                  <template v-slot:append>
                    <q-btn
                      flat round dense
                      :icon="showPassword ? 'sym_o_visibility_off' : 'sym_o_visibility'"
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
                  lazy-rules
                  :rules="[val => val === newPassword || 'Las contraseñas no coinciden']"
                >
                  <template v-slot:prepend>
                    <q-icon name="sym_o_lock_open" color="primary" size="20px" />
                  </template>
                  <template v-slot:append>
                    <q-btn
                      flat round dense
                      :icon="showConfirmPassword ? 'sym_o_visibility_off' : 'sym_o_visibility'"
                      @click="showConfirmPassword = !showConfirmPassword"
                      color="grey-6"
                    />
                  </template>
                </q-input>
              </div>

              <q-btn
                type="submit"
                class="submit-btn-premium q-mt-md"
                unelevated
                :loading="loading"
              >
                <div class="row items-center no-wrap">
                  <span class="q-mr-md">Restablecer Contraseña</span>
                  <q-icon name="sym_o_check" size="20px" />
                </div>
              </q-btn>

              <div class="back-link q-mt-lg text-center">
                <q-btn flat no-caps color="primary" @click="step = 1">
                  <q-icon name="sym_o_arrow_back" size="16px" class="q-mr-sm" />
                  Volver al paso anterior
                </q-btn>
              </div>
            </q-form>

            <p class="security-footer">
              <q-icon name="sym_o_security" size="14px" class="q-mr-xs" />
              Tus datos están protegidos.
            </p>
          </div>

        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { postData } from '@/services/apiClient'

const router = useRouter()
const $q = useQuasar()

const step = ref(1)
const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)

const sendCode = async () => {
  loading.value = true
  try {
    await postData('/auth/forgot-password', {
      email: email.value
    })

    $q.dialog({
      title: 'Código Enviado',
      message: 'Si el correo está registrado, recibirás un código de 6 dígitos. Revisa tu bandeja de entrada.',
      color: 'positive',
      ok: {
        label: 'Continuar',
        flat: true
      }
    }).onOk(() => {
      step.value = 2
    })
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al enviar el código'
    $q.notify({
      color: 'negative',
      message: msg,
      icon: 'sym_o_warning'
    })
  } finally {
    loading.value = false
  }
}

const resetPassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    $q.notify({
      color: 'negative',
      message: 'Las contraseñas no coinciden',
      icon: 'sym_o_warning'
    })
    return
  }

  loading.value = true
  try {
    await postData('/auth/verify-code', {
      email: email.value,
      code: code.value,
      newPassword: newPassword.value
    })

    $q.dialog({
      title: '¡Contraseña Restablecida!',
      message: 'Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión.',
      color: 'positive',
      ok: {
        label: 'Ir al Inicio de Sesión',
        flat: true
      }
    }).onOk(() => {
      router.push('/login')
    })
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al restablecer la contraseña'
    $q.notify({
      color: 'negative',
      message: msg,
      icon: 'sym_o_warning'
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.forgot-password-page-premium {
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1.5rem;
}

.forgot-password-container {
  width: 100%;
  max-width: 900px;
  min-height: 550px;
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
  flex-direction: column;
  background-color: #ffffff;
  justify-content: center;
}

.forgot-form {
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
  background: #2e7d32;
  color: white;
  transition: all 0.3s ease;
}

.submit-btn-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.1);
}

.back-link {
  margin-top: 1.5rem;
}

.security-footer {
  margin-top: auto;
  padding-top: 2rem;
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
  .forgot-password-container {
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
