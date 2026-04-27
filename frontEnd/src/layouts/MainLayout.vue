<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <!-- Logo simulado o título -->

        <q-toolbar-title class="text-center">
          Certificados de Seguridad Social
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <!-- Transition for smooth navigation -->
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

const logout = () => {
  localStorage.removeItem('auth_token')
  $q.notify({
    color: 'info',
    textColor: 'white',
    icon: 'info',
    message: 'Has cerrado sesión'
  })
  router.push('/login')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
 Riverside
