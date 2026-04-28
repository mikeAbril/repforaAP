<template>
  <q-page class="cards-page-premium">
    <div class="page-container">

      <header class="page-header text-center q-mb-xl">
        <div class="logo-container-home">
          <img src="@/assets/logo-sena.png" alt="SENA Logo" class="home-logo" />
        </div>
        <h1 class="hero-title">
          Gestión de <br>
          <span class="accent-text">Certificados de Seguridad Social</span>
        </h1>
        <p class="hero-desc">Seleccione la plataforma para procesar su certificado.</p>
      </header>

      <div class="cards-grid">
        <div class="platform-card-premium fade-in">
          <div class="card-header-bar">
            <span class="card-header-title">Planillas</span>
          </div>

          <div class="card-illustration">
            <img src="@/assets/card.png" alt="Planillas" class="card-img" />
          </div>

          <div class="card-action">
            <button class="btn-ver" @click="openModal()">
              VER
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="text-center q-mt-xl">
        <button class="btn-supervisor" @click="goToSupervisor">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Acceso Supervisor
        </button>
      </div>

    </div>

    <FormModal v-model="showModal" />
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import FormModal from '@/components/FormModal.vue';

const router = useRouter();
const showModal = ref(false);

const openModal = () => {
  showModal.value = true;
};

const goToSupervisor = () => {
  const authStore = useAuthStore();
  authStore.clearToken();
  router.push('/login');
};
</script>

<style scoped>
.cards-page-premium {
  background-color: var(--bg-light);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
}

.page-container {
  max-width: 1100px;
  width: 100%;
  padding: 2rem;
}

.logo-container-home {
  margin: 0 auto 2rem;
  background: var(--white);
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  border: 1px solid var(--border);
}

.home-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 1rem;
  color: var(--text-dark);
}

.accent-text { color: var(--color_button); }

.hero-desc {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.cards-grid {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.cards-grid .platform-card-premium {
  max-width: 380px;
  width: 100%;
}

.platform-card-premium {
  background: var(--white);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.platform-card-premium:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}

.card-header-bar {
  background: var(--color_card);
  padding: 1rem 1.5rem;
}

.card-header-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color_text_card);
  text-transform: capitalize;
  text-align: center;
}

.card-illustration {
  padding: 2rem 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.card-img {
  width: 50%;
  aspect-ratio: 4/3;
  object-fit: contain;
}

.card-action {
  padding: 0 1.5rem 1.5rem;
}

.btn-ver {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--radius);
  background: var(--color_button);
  color: var(--color_text_button);
  font-weight: 800;
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
  cursor: pointer;
}

.btn-ver:hover {
  opacity: 0.9;
}

.btn-supervisor {
  background: var(--white);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius);
  font-weight: 700;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  cursor: pointer;
}

.btn-supervisor:hover {
  background-color: var(--primary-light);
}

.fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .page-container { padding: 1rem; }
  .hero-title { font-size: 1.8rem; }
}
</style>
