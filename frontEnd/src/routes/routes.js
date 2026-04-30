import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import HomeView from '@/views/HomeView.vue'
import UnifiedForm from '@/components/UnifiedForm.vue'
import LoginView from '@/views/LoginView.vue'
import SupervisorView from '@/views/SupervisorView.vue'
import AdminSupervisorsView from '@/views/AdminSupervisorsView.vue'
import ChangePasswordView from '@/views/ChangePasswordView.vue'

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
                path: 'change-password',
                name: 'ChangePassword',
                component: ChangePasswordView,
                meta: { requiresAuth: true }
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

// Function to decode JWT (simple version for the guard)
const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

// Authentication Guard
router.beforeEach((to, from) => {
    const token = localStorage.getItem('auth_token');
    const isAuthenticated = !!token;
    let mustChange = false;

    if (isAuthenticated) {
        const decoded = parseJwt(token);
        mustChange = decoded?.mustChangePassword || false;
    }

    if (to.meta.requiresAuth && !isAuthenticated) {
        return { name: 'Login' };
    } 
    
    // Si debe cambiar contraseña y no está en la página de cambio de clave, forzar redirección
    if (isAuthenticated && mustChange && to.name !== 'ChangePassword') {
        return { name: 'ChangePassword' };
    }

    // Evitar que usuarios logueados vean la página de login
    if (to.meta.guestOnly && isAuthenticated) {
        return { name: 'Supervisor' };
    }
});

export default router
