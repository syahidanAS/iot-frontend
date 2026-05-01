<script setup lang="ts">
const config = useRuntimeConfig()
const router = useRouter()

const devices = ref<any[]>([])
const loading = ref(true)

const token = useCookie('token')

const fetchDevices = async () => {
    try {
        const res: any = await $fetch('secret-keys', {
            baseURL: config.public.apiBase,
            headers: {
                Authorization: `Bearer ${token.value}`
            }
        })

        devices.value = res.data

    } catch (err: any) {
        console.error('Fetch error:', err)

        // 🔥 INTERCEPT 401
        const status = err?.response?.status

        if (status === 401) {
            // hapus token
            token.value = null
            localStorage.removeItem('token')

            // redirect login
            await router.push('/login')
        }

    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchDevices()
})
</script>

<template>
    <div>
        <h2 class="text-lg font-semibold mb-4">Devices</h2>

        <!-- Loading -->
        <div v-if="loading" class="text-gray-500 text-center">
            Loading devices...
        </div>

        <!-- Empty -->
        <div v-else-if="devices.length === 0" class="text-gray-500 text-center">
            No devices found
        </div>

        <!-- List -->
        <div v-else class="space-y-3">

            <NuxtLink v-for="device in devices" :key="device.id" :to="{
                path: `/device/${device.id}`,
                query: {
                    device_name: device.device_name,
                }
                }"
                class="neumorph p-4 flex justify-between items-center">
                <div>
                    <p class="font-medium">
                        {{ device.device_name }}
                    </p>
                    <p class="text-xs text-gray-500">
                        ID: {{ device.id }}
                    </p>
                </div>

                <span class="text-sm text-gray-400">
                    →
                </span>
            </NuxtLink>

        </div>
    </div>
</template>

<style scoped>
.neumorph {
    background: #e0e5ec;
    border-radius: 14px;
    box-shadow:
        6px 6px 12px #babecc,
        -6px -6px 12px #ffffff;
    transition: 0.2s;
}

.neumorph:hover {
    box-shadow:
        inset 3px 3px 6px #babecc,
        inset -3px -3px 6px #ffffff;
}
</style>