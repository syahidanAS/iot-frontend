export default defineNuxtPlugin(() => {
  const router = useRouter()

  const api = $fetch.create({
    baseURL: useRuntimeConfig().public.apiBase,

    onRequest({ options }) {
      const token = useCookie('token')

      if (token.value) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token.value}`
        }
      }
    },

    async onResponseError({ response }) {
      if (response.status === 401) {
        useCookie('token').value = null
        await router.push('/login')
      }
    }
  })

  return {
    provide: {
      $api: api   // 👈 INI FIX UTAMA
    }
  }
})