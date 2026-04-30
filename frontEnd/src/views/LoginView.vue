<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="login-page-premium">

        <div class="login-container fade-in">

          <!-- Left Side: Information -->
          <div class="login-info-side">
            <div class="info-content">
              <div class="logo-container-login">
                <img src="@/assets/logo-sena.png" alt="SENA Logo" class="login-logo" />
              </div>
              <h1 class="info-title">Sistema de <br> Automatización</h1>
              <p class="info-description">
                Plataforma diseñada para optimizar la radicación, validación y procesamiento de certificados de seguridad social de forma autónoma.
              </p>
            </div>

            <q-btn
              flat
              round
              dense
              icon="arrow_back"
              color="white"
              class="back-btn"
              @click="router.push('/')"
            />
          </div>

          <!-- Right Side: Form -->
          <div class="login-form-side">
            <q-form @submit="onSubmit" class="login-form">
              <header class="form-header">
                <h2 class="form-title">Bienvenido</h2>
                <p class="form-subtitle">Ingrese sus credenciales de acceso</p>
              </header>

              <div class="row q-col-gutter-md q-mb-md">
                <div class="col-4">
                  <div class="field-group">
                    <label class="field-label">Tipo</label>
                    <q-select
                      outlined
                      v-model="documentType"
                      :options="['CC', 'CE', 'PA', 'TI', 'CD', 'PE', 'PT', 'RC', 'SC']"
                      dense
                      class="premium-input"
                      :rules="[val => !!val || 'Requerido']"
                    />
                  </div>
                </div>
                <div class="col-8">
                  <div class="field-group">
                    <label class="field-label">Número de Documento</label>
                    <q-input
                      outlined
                      v-model="documentNumber"
                      label="Ingrese su documento"
                      class="premium-input"
                      dense
                      lazy-rules
                      :rules="[val => val && val.length > 0 || 'Campo obligatorio']"
                    >
                      <template v-slot:prepend>
                        <q-icon name="person_outline" color="grey-6" />
                      </template>
                    </q-input>
                  </div>
                </div>
              </div>

              <div class="field-group">
                <label class="field-label">Contraseña</label>
                <q-input
                  outlined
                  v-model="password"
                  label="••••••••"
                  class="premium-input"
                  dense
                  :type="showPassword ? 'text' : 'password'"
                  lazy-rules
                  :rules="[val => val && val.length > 0 || 'Campo obligatorio']"
                >
                  <template v-slot:prepend>
                    <q-icon name="lock_outline" color="grey-6" />
                  </template>
                  <template v-slot:append>
                    <q-btn
                      flat
                      round
                      dense
                      :icon="showPassword ? 'visibility_off' : 'visibility'"
                      color="grey-6"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </q-input>
              </div>

              <div class="form-extras">
                <q-checkbox v-model="rememberMe" label="Recordarme" class="remember-check" />
              </div>

              <q-btn
                type="submit"
                class="submit-btn-premium"
                unelevated
                :loading="loading"
              >
                <div class="row items-center no-wrap">
                  <span class="q-mr-md">Iniciar Sesión</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
              </q-btn>

              <p class="security-footer">
                <q-icon name="security" size="14px" class="q-mr-xs" />
                Acceso restringido para personal autorizado.
              </p>
            </q-form>
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
import { useAuthStore } from '@/store/auth'
import { postData } from '@/services/apiClient'

const documentType = ref('CC')
const documentNumber = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const loading = ref(false)
const router = useRouter()
const $q = useQuasar()

const onSubmit = async () => {
  loading.value = true
  try {
    const response = await postData('/auth/login', {
      documentType: documentType.value,
      documentNumber: documentNumber.value,
      password: password.value
    })
    const authStore = useAuthStore()
    authStore.setToken(response.token)

    $q.notify({
      color: 'positive',
      position: 'top',
      icon: 'check_circle',
      message: 'Inicio de sesión exitoso'
    })

    if (response.supervisor.mustChangePassword) {
      router.push('/change-password')
    } else {
      router.push('/supervisor')
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || 'Error al iniciar sesión'
    $q.notify({
      color: 'negative',
      position: 'top',
      icon: 'warning',
      message: errorMsg
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page-premium {
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, var(--bg-light) 0%, var(--border) 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1.5rem;
}

.login-container {
  width: 100%;
  max-width: 900px;
  height: 560px;
  background: var(--white);
  border-radius: 28px;
  display: flex;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

/* Left Side: Info */
.login-info-side {
  flex: 0 0 40%;
  background-color: var(--color_button);
  padding: 3rem;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.back-btn {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.back-btn:hover { opacity: 1; }

.logo-container-login {
  margin-bottom: 2rem;
  background: var(--white);
  width: 70px;
  height: 70px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.login-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.info-title {
  font-size: 1.85rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}

.info-description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 2.5rem;
}

/* Right Side: Form */
.login-form-side {
  flex: 1;
  padding: 3rem 4rem;
  display: flex;
  align-items: center;
  background-color: var(--white);
}

.login-form {
  width: 100%;
}

.form-header {
  margin-bottom: 2.5rem;
}

.form-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-dark);
  margin-bottom: 0.5rem;
}

.form-subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 500;
}

.field-group {
  margin-bottom: 1.5rem;
}

.field-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: 0.5rem;
  margin-left: 0.25rem;
}

:deep(.premium-input .q-field__control) {
  border-radius: 12px !important;
  background-color: var(--bg-light);
}

:deep(.premium-input .q-field__control:before) {
  border: 1px solid var(--border) !important;
}

:deep(.premium-input.q-field--focused .q-field__control) {
  background-color: var(--white);
  box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.08);
}

.form-extras {
  margin-bottom: 2rem;
}

.remember-check {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.submit-btn-premium {
  width: 100%;
  border-radius: 14px;
  padding: 0.75rem;
  font-weight: 800;
  font-size: 1rem;
  background: var(--color_button);
  color: var(--color_text_button);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.submit-btn-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(46, 125, 50, 0.25);
}

.security-footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fade-in {
  animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 800px) {
  .login-container {
    flex-direction: column;
    height: auto;
    max-width: 450px;
  }
  .login-info-side {
    flex: 0 0 auto;
    padding: 2rem;
  }
  .login-form-side {
    padding: 2.5rem 2rem;
  }
}
</style>
