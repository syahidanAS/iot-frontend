export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('token')

  // kalau belum login & bukan halaman login
  if (!token.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})