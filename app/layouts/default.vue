<script setup lang="ts">
const router = useRouter()
const config = useRuntimeConfig()

const isOpen = ref(false)
const token = useCookie('token')

// =====================
// USER STATE
// =====================
const user = ref<any>(null)

// =====================
// FETCH USER (FIXED)
// =====================
const fetchUser = async () => {
    try {
        const res: any = await $fetch('/profile', {
            baseURL: config.public.apiBase,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token.value}`
            }
        })

        // 🔥 FIX: ambil dari res.user
        user.value = res.user

        console.log('USER:', user.value)

    } catch (err: any) {
        console.error('Fetch user failed:', err)

        if (err?.response?.status === 401) {
            token.value = null
            localStorage.removeItem('token')
            router.push('/login')
        }
    }
}

// =====================
// LOGOUT
// =====================
const logout = () => {
    token.value = null
    localStorage.removeItem('token')
    router.push('/login')
}

// =====================
// LIFECYCLE
// =====================
onMounted(() => {
    fetchUser()
})
</script>

<template>
    <div class="min-h-screen flex bg-[#e0e5ec] text-gray-700">

        <!-- Sidebar -->
        <aside :class="[
            'fixed md:static z-50 h-full w-64 p-4 flex flex-col gap-4 transition-transform duration-300',
            isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        ]">
            <div class="p-4 text-xl font-semibold neumorph text-center">
                IoT Gateway
            </div>

            <nav class="flex-1 flex flex-col gap-3">
                <!-- <NuxtLink to="/" class="menu-neu" @click="isOpen = false">
                    Dashboard
                </NuxtLink> -->

                <NuxtLink to="/device" class="menu-neu" active-class="active-neu">
                    Devices
                </NuxtLink>
                <NuxtLink to="/automation" class="menu-neu" active-class="active-neu">
                    Automation
                </NuxtLink>
            </nav>

            <button @click="logout" class="btn-neu text-red-500">
                Logout
            </button>
        </aside>

        <!-- Overlay (mobile) -->
        <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 bg-black/20 md:hidden"></div>

        <!-- Main -->
        <div class="flex-1 flex flex-col">

            <!-- Topbar -->
            <header class="m-4 p-4 flex justify-between items-center neumorph">

                <!-- Toggle Button -->
                <button @click="isOpen = !isOpen" class="btn-neu px-3 py-1">
                    ☰
                </button>

                <h1 class="font-semibold">Dashboard</h1>

                <!-- ✅ USER NAME -->
                <div class="text-sm text-gray-500">
                    {{ user?.name || 'User' }}
                </div>

            </header>

            <!-- Content -->
            <main class="p-4">
                <div class="neumorph p-6 min-h-[80vh]">
                    <slot />
                </div>
            </main>

        </div>

    </div>
</template>

<style scoped>
.neumorph {
    background: #e0e5ec;
    border-radius: 16px;
    box-shadow:
        8px 8px 16px #babecc,
        -8px -8px 16px #ffffff;
}

.menu-neu {
    padding: 10px;
    border-radius: 10px;
    text-align: center;
    background: #e0e5ec;
    box-shadow:
        4px 4px 8px #babecc,
        -4px -4px 8px #ffffff;
    transition: 0.2s;
}

.menu-neu:hover {
    box-shadow:
        inset 2px 2px 4px #babecc,
        inset -2px -2px 4px #ffffff;
}

.active-neu {
    box-shadow:
        inset 3px 3px 6px #babecc,
        inset -3px -3px 6px #ffffff;
}

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