<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const config = useRuntimeConfig()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

const login = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    const res: any = await $fetch('login', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })

    const token = useCookie('token')
    token.value = res.token

    await navigateTo('/device')
  } catch (err) {
    errorMsg.value = 'Email atau password salah'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full text-gray-700">

    <!-- Title -->
    <div class="text-center mb-10">
      <h1 class="text-3xl font-semibold">ARZ Smarthome System</h1>
      <p class="text-sm text-gray-500 mt-1">
        Smart device monitoring system
      </p>
    </div>

    <!-- Card -->
    <div class="p-8 rounded-2xl neumorph">

      <!-- Error -->
      <div v-if="errorMsg" class="mb-4 text-red-500 text-sm text-center">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="login" class="space-y-6">

        <!-- Email -->
        <div>
          <label class="text-sm mb-1 block">Email</label>
          <input v-model="email" type="email" placeholder="you@example.com" class="input-neu" />
        </div>

        <!-- Password -->
        <div>
          <label class="text-sm mb-1 block">Password</label>

          <div class="relative">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••"
              class="input-neu pr-10" />

            <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-2 text-gray-400">
              👁
            </button>
          </div>
        </div>

        <!-- Button -->
        <button type="submit" :disabled="loading" class="btn-neu w-full">
          <span v-if="loading">Loading...</span>
          <span v-else>Login</span>
        </button>

      </form>

    </div>
  </div>
</template>

<style scoped>
/* Background (handled by auth layout, tapi kita pastikan tone sama) */
:deep(body) {
  background: #e0e5ec;
}

/* Card neumorphism */
.neumorph {
  background: #e0e5ec;
  box-shadow:
    8px 8px 16px #babecc,
    -8px -8px 16px #ffffff;
}

/* Input neumorphism */
.input-neu {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  background: #e0e5ec;
  outline: none;
  border: none;
  box-shadow:
    inset 4px 4px 8px #babecc,
    inset -4px -4px 8px #ffffff;
  transition: 0.2s;
}

.input-neu:focus {
  box-shadow:
    inset 2px 2px 4px #babecc,
    inset -2px -2px 4px #ffffff;
}

/* Button neumorphism */
.btn-neu {
  padding: 10px;
  border-radius: 10px;
  background: #e0e5ec;
  border: none;
  cursor: pointer;
  font-weight: 500;
  box-shadow:
    4px 4px 8px #babecc,
    -4px -4px 8px #ffffff;
  transition: 0.2s;
}

.btn-neu:hover {
  box-shadow:
    2px 2px 4px #babecc,
    -2px -2px 4px #ffffff;
}

.btn-neu:active {
  box-shadow:
    inset 2px 2px 4px #babecc,
    inset -2px -2px 4px #ffffff;
}
</style>