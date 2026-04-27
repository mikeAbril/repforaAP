import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        // Token simulado o real, inicializado vacío por ahora o desde localStorage
        token: localStorage.getItem('auth_token') || null,
    }),
    actions: {
        setToken(newToken) {
            this.token = newToken;
            localStorage.setItem('auth_token', newToken);
        },
        clearToken() {
            this.token = null;
            localStorage.removeItem('auth_token');
        }
    }
});
