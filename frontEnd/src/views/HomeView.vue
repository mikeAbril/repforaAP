<template>
  <q-page class="home-page-premium">
    <div class="page-container">
      
      <!-- Título Seccion -->
      <header class="page-header text-center q-mb-xl">
        <div class="logo-container-home">
          <img src="@/assets/logo-sena.png" alt="SENA Logo" class="home-logo" />
        </div>
        <h1 class="hero-title">
          Gestión de <br>
          <span class="accent-text">Certificados de Seguridad Social</span>
        </h1>
      </header>


      <!-- PASO 1: Selección de Perfil -->
      <div class="action-cards-grid fade-in">
        <!-- Card Formulario -->
        <div class="action-card form-card" @click="goToInstructor">
          <div class="card-visual-side green">
            <div class="visual-icon-box green">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 8 20 8"/><path d="M10 13l2 2 4-4"/></svg>
            </div>
          </div>
          <div class="card-body">
            <h2 class="card-title">Formulario</h2>
            <p class="card-text">Solicite sus certificados de forma digital.</p>
            <button class="btn-action primary">
              Nueva Solicitud 
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        <!-- Card Supervisor -->
        <div class="action-card supervisor-card" @click="goToSupervisor">
          <div class="card-visual-side dark">
            <div class="visual-icon-box dark">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
          </div>
          <div class="card-body">
            <h2 class="card-title">Supervisor</h2>
            <p class="card-text">Acceso exclusivo para personal administrativo.</p>
            <button class="btn-action secondary">
              Área Administrativa <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 16h10"/><path d="M7 12h10"/><path d="M7 8h10"/></svg>
            </button>
          </div>
        </div>
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const router = useRouter();

const goToInstructor = () => {
  router.push('/instructor');
};

const goToSupervisor = () => {
  const authStore = useAuthStore();
  authStore.clearToken();
  router.push('/login');
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.home-page-premium {
  font-family: 'Inter', sans-serif;
  background-color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
}

.page-container {
  max-width: 1000px;
  width: 100%;
  padding: 2rem 2rem; /* Reduced padding for logo */
}

.logo-container-home {
  margin: 0 auto 2rem;
  background: white;
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
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
  letter-spacing: -0.02em;
  color: #0f172a;
}

.accent-text { color: #2e7d32; }

.hero-desc {
  color: #64748b;
  font-size: 1.1rem;
}

/* Action Cards */
.action-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-top: 2rem;
}

.action-card {
  background-color: white;
  border-radius: 32px;
  display: flex;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.03);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  cursor: pointer;
}

.action-card:hover { 
  transform: translateY(-8px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.08);
}

.card-visual-side {
  flex: 0 0 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-visual-side.green { background-color: #ecfdf4; }
.card-visual-side.dark { background-color: #f1f5f9; }

.visual-icon-box {
  width: 70px;
  height: 70px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.visual-icon-box.green { background-color: #2e7d32; color: white; }
.visual-icon-box.dark { background-color: #0f172a; color: white; }

.card-body {
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: #0f172a;
}

.card-text {
  color: #64748b;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

.btn-action {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: none;
  width: fit-content;
  transition: all 0.2s;
}

.btn-action.primary { background-color: #2e7d32; color: white; }
.btn-action.secondary { background-color: #0f172a; color: white; }

/* Platforms Grid */
.platforms-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  margin: 1rem auto 0;
  max-width: 600px;
}


.platform-card-premium {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.platform-card-premium:hover {
  transform: translateY(-4px);
  border-color: #2e7d32;
  box-shadow: 0 10px 20px rgba(0,0,0,0.04);
}

.bg-mi_planilla { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); }
.bg-aportes_en_linea { background: linear-gradient(135deg, #FF9800 0%, #1B5E20 100%); }


.platform-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.platform-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.platform-action {
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748b;
}

.btn-back {
  background: white;
  border: 1px solid #e2e8f0;
  color: #64748b;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 auto;
  transition: all 0.2s;
}

.btn-back:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .action-cards-grid, .platforms-grid {
    grid-template-columns: 1fr;
  }
}
</style>
