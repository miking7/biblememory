<template>
  <BaseModal :show="show" label="Sign in or create an account" @close="$emit('close')">
          <!-- Toggle between Login and Register -->
          <div class="flex gap-2 mb-6">
            <button
              @click="$emit('update:mode', 'login')"
              :class="mode === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'"
              class="flex-1 py-2 rounded-lg font-semibold transition-all">
              Login
            </button>
            <button
              @click="$emit('update:mode', 'register')"
              :class="mode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'"
              class="flex-1 py-2 rounded-lg font-semibold transition-all">
              Sign Up
            </button>
          </div>

          <!-- Login Form -->
          <form v-show="mode === 'login'" @submit.prevent="$emit('login')" class="space-y-4">
            <h3 class="text-2xl font-bold text-slate-800 mb-4">Welcome Back</h3>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                autocomplete="email"
                :value="form.email"
                @input="updateForm('email', ($event.target as HTMLInputElement).value)"
                placeholder="your@email.com"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                required>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                autocomplete="current-password"
                :value="form.password"
                @input="updateForm('password', ($event.target as HTMLInputElement).value)"
                placeholder="--------"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                required>
            </div>

            <!-- Error message -->
            <div v-show="form.error"
                 class="p-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg text-sm font-medium"
                 v-text="form.error"></div>

            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                <span v-show="!loading">Login</span>
                <span v-show="loading">Logging in...</span>
              </button>
              <button
                type="button"
                @click="$emit('close')"
                class="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all">
                Cancel
              </button>
            </div>
          </form>

          <!-- Register Form -->
          <form v-show="mode === 'register'" @submit.prevent="$emit('register')" class="space-y-4">
            <h3 class="text-2xl font-bold text-slate-800 mb-4">Create Account</h3>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                autocomplete="email"
                :value="form.email"
                @input="updateForm('email', ($event.target as HTMLInputElement).value)"
                placeholder="your@email.com"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                required>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                autocomplete="new-password"
                :value="form.password"
                @input="updateForm('password', ($event.target as HTMLInputElement).value)"
                placeholder="--------"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                required>
              <p class="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
              <input
                type="password"
                autocomplete="new-password"
                :value="form.confirmPassword"
                @input="updateForm('confirmPassword', ($event.target as HTMLInputElement).value)"
                placeholder="--------"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                required>
            </div>

            <!-- Error message -->
            <div v-show="form.error"
                 class="p-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg text-sm font-medium"
                 v-text="form.error"></div>

            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                <span v-show="!loading">Sign Up</span>
                <span v-show="loading">Creating account...</span>
              </button>
              <button
                type="button"
                @click="$emit('close')"
                class="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all">
                Cancel
              </button>
            </div>
          </form>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'

export interface AuthForm {
  email: string
  password: string
  confirmPassword: string
  error: string
}

const props = defineProps<{
  show: boolean
  mode: 'login' | 'register'
  form: AuthForm
  loading: boolean
}>()

const emit = defineEmits<{
  close: []
  login: []
  register: []
  'update:mode': [mode: 'login' | 'register']
  'update:form': [form: AuthForm]
}>()

const updateForm = (field: keyof AuthForm, value: string) => {
  emit('update:form', { ...props.form, [field]: value })
}
</script>
