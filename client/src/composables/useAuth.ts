import { ref } from 'vue';
import {
  isAuthenticated as checkAuthenticated,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUserEmail
} from '../sync';

export function useAuth() {
  // Authentication state
  const isAuthenticated = ref(false);
  const userEmail = ref('');
  const showAuthModal = ref(false);
  const authMode = ref<'login' | 'register'>('login');
  const authLoading = ref(false);
  const showUserMenu = ref(false);

  // Auth form state
  const authForm = ref({
    email: '',
    password: '',
    confirmPassword: '',
    error: ''
  });

  // Methods
  const checkAuth = async () => {
    try {
      isAuthenticated.value = await checkAuthenticated();
      if (isAuthenticated.value) {
        const userId = await getCurrentUserEmail();
        userEmail.value = userId || 'user@example.com';
      }
    } catch (error) {
      console.error("Failed to check auth:", error);
      isAuthenticated.value = false;
    }
  };

  const resetAuthForm = () => {
    authForm.value.email = '';
    authForm.value.password = '';
    authForm.value.confirmPassword = '';
    authForm.value.error = '';
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    authMode.value = mode;
    resetAuthForm();
    showAuthModal.value = true;
  };

  const closeAuthModal = () => {
    showAuthModal.value = false;
    authForm.value.error = '';
  };

  const handleLogin = async (
    onSuccess?: (localVerseCount: number) => Promise<void>
  ) => {
    authForm.value.error = '';

    if (!authForm.value.email || !authForm.value.password) {
      authForm.value.error = 'Please enter email and password';
      return;
    }

    authLoading.value = true;

    try {
      await apiLogin(authForm.value.email, authForm.value.password);

      isAuthenticated.value = true;
      userEmail.value = authForm.value.email;

      closeAuthModal();

      // Call success callback if provided
      if (onSuccess) {
        await onSuccess(0);
      }

      console.log("Login successful");
    } catch (error: any) {
      console.error("Login failed:", error);
      authForm.value.error = error.message || 'Login failed. Please try again.';
    } finally {
      authLoading.value = false;
    }
  };

  const handleRegister = async (
    localVerseCount: number = 0,
    onSuccess?: () => Promise<void>
  ) => {
    authForm.value.error = '';

    if (!authForm.value.email || !authForm.value.password) {
      authForm.value.error = 'Please enter email and password';
      return;
    }

    if (authForm.value.password.length < 8) {
      authForm.value.error = 'Password must be at least 8 characters';
      return;
    }

    if (authForm.value.password !== authForm.value.confirmPassword) {
      authForm.value.error = 'Passwords do not match';
      return;
    }

    authLoading.value = true;

    try {
      await apiRegister(authForm.value.email, authForm.value.password);

      isAuthenticated.value = true;
      userEmail.value = authForm.value.email;

      closeAuthModal();

      if (localVerseCount > 0) {
        console.log(`Migrating ${localVerseCount} local verses to server...`);
      }

      // Call success callback if provided
      if (onSuccess) {
        await onSuccess();
      }

      console.log("Registration successful");
      if (localVerseCount > 0) {
        alert(`Welcome! Your ${localVerseCount} verses are being synced to your account.`);
      }
    } catch (error: any) {
      console.error("Registration failed:", error);
      authForm.value.error = error.message || 'Registration failed. Please try again.';
    } finally {
      authLoading.value = false;
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout? Your local data will be preserved.')) {
      return;
    }

    try {
      await apiLogout();

      isAuthenticated.value = false;
      userEmail.value = '';

      console.log("Logout successful");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    }
  };

  return {
    // State
    isAuthenticated,
    userEmail,
    showAuthModal,
    authMode,
    authForm,
    authLoading,
    showUserMenu,

    // Methods
    checkAuth,
    openAuthModal,
    closeAuthModal,
    handleLogin,
    handleRegister,
    handleLogout
  };
}
