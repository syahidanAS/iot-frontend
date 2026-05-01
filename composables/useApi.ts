export const useApi = () => {
  const config = useRuntimeConfig()
  const token = useCookie('token')

  return $fetch.create({
    baseURL: config.public.apiBase,

    onRequest({ options }) {
      if (token.value) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token.value}`
        }
      }
    }
  })
}