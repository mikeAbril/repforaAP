import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';
import { authService } from '../services/authService';
import { supervisorService } from '../services/supervisorService';
import { notify } from '../plugins/notify';

export function useAuth() {
  const authStore = useAuthStore();
  const router = useRouter();

  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => !!authStore.token);
  const userName = computed(() => authStore.user?.name || 'Usuario');

  const login = async (email, password) => {
    try {
      const result = await authService.login(email, password);
      if (result.success) {
        notify('Bienvenido al sistema.');
        router.push('/dashboard');
        return { success: true };
      }
      notify(result.message || 'Error en la autenticación.', 'error');
      return { success: false, message: result.message };
    } catch (error) {
      notify('Error al conectar con el servidor.', 'error');
      return { success: false, message: 'Error de conexión' };
    }
  };

  const logout = () => {
    authService.logout();
    router.push('/login');
  };

  const updateProfile = async (profileData) => {
    try {
      await supervisorService.updateProfile(profileData);
      // Update local store name if changed
      if (profileData.name) {
        authStore.user.name = profileData.name;
      }
      notify('Perfil actualizado correctamente.');
      return { success: true };
    } catch (error) {
      notify('Error al actualizar el perfil.', 'error');
      return { success: false };
    }
  };

  const fetchProfile = async () => {
    try {
      const profile = await supervisorService.getProfile();
      if (profile.name) {
        authStore.user.name = profile.name;
      }
      return profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  return {
    user,
    isAuthenticated,
    userName,
    login,
    logout,
    updateProfile,
    fetchProfile
  };
}
