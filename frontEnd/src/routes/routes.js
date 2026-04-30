import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import HomeView from '@/views/HomeView.vue'
import UnifiedForm from '@/components/UnifiedForm.vue'
import LoginView from '@/views/LoginView.vue'
import SupervisorView from '@/views/SupervisorView.vue'
import AdminSupervisorsView from '@/views/AdminSupervisorsView.vue'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: LoginView,
        meta: { guestOnly: true }
    },
    {
        path: '/',
        component: MainLayout,
        // The main layout and forms are public
        children: [
            { path: '', name: 'Home', component: HomeView },
            { 
                path: 'form/:platform', 
                name: 'UnifiedForm', 
                component: UnifiedForm,
                props: true 
            },
            {
                path: 'supervisor',
                name: 'Supervisor',
                component: SupervisorView,
                meta: { requiresAuth: true }
            },
            {
                path: 'admin/supervisors',
                name: 'AdminSupervisors',
                component: AdminSupervisorsView,
                meta: { requiresAuth: true }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Authentication Guard
router.beforeEach((to, from) => {
    const isAuthenticated = !!localStorage.getItem('auth_token');

    if (to.meta.requiresAuth && !isAuthenticated) {
        // Redirigir al login si no está autenticado intentando entrar a zona segura
        return { name: 'Login' };
    } else if (to.meta.guestOnly && isAuthenticated) {
        // Evitar que usuarios logueados vean la página de login
        return { name: 'Supervisor' };
    }
    // Proceder normalmente (sin retorno o retornando undefined/true)
});

export default router
