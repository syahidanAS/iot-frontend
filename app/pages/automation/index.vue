<script setup lang="ts">
const automations = ref<any[]>([])

// =====================
// CONFIG
// =====================
const config = useRuntimeConfig()
const token = useCookie('token')
const toggling = ref<number | null>(null)
const deleting = ref<number | null>(null)

// =====================
// DEVICE STATE
// =====================
const devices = ref<any[]>([])
const selectedDeviceId = ref<number | null>(null)

const selectedDevice = computed(() =>
    devices.value.find(d => d.id === selectedDeviceId.value)
)

const availablePins = computed(() =>
    selectedDevice.value?.virtual_pin || []
)

// =====================
// UI STATE
// =====================
const showModal = ref(false)
const loadingDevices = ref(false)
const loadingAutomations = ref(false)
const saving = ref(false)

// =====================
// TOAST STATE
// =====================
const toast = reactive({
    show: false,
    type: 'success' as 'success' | 'error',
    message: ''
})

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toast.message = message
    toast.type = type
    toast.show = true

    setTimeout(() => {
        toast.show = false
    }, 2500)
}

// =====================
// FORM
// =====================
const form = reactive({
    type: 'sensor',
    name: '',
    sensor: 'temperature',
    operator: '>',
    value: '',
    time: '',
    pin: '',
    actionValue: '1'
})

// =====================
// ERROR STATE
// =====================
const errors = reactive({
    name: '',
    device: '',
    pin: '',
    value: '',
    time: ''
})

// =====================
// VALIDATION
// =====================
const validateForm = () => {
    let valid = true

    errors.name = form.name ? '' : 'Nama wajib diisi'
    errors.device = selectedDeviceId.value ? '' : 'Device wajib dipilih'
    errors.pin = form.pin ? '' : 'Pin wajib dipilih'

    if (form.type === 'sensor') {
        errors.value = form.value ? '' : 'Value wajib diisi'
        errors.time = ''
    } else {
        errors.time = form.time ? '' : 'Time wajib diisi'
        errors.value = ''
    }

    Object.values(errors).forEach(e => {
        if (e) valid = false
    })

    return valid
}

// realtime validation
watch(form, validateForm, { deep: true })
watch(selectedDeviceId, validateForm)

// reset pin saat device berubah
watch(selectedDeviceId, () => {
    form.pin = ''
})

// reset field saat type berubah
watch(() => form.type, () => {
    form.value = ''
    form.time = ''
})

// =====================
// FETCH DEVICES
// =====================
const fetchDevices = async () => {
    loadingDevices.value = true

    try {
        const res: any = await $fetch('automation/device-infos', {
            baseURL: config.public.apiBase,
            headers: {
                Authorization: `Bearer ${token.value}`
            }
        })

        devices.value = res.data || []

        if (devices.value.length > 0) {
            selectedDeviceId.value = devices.value[0].id
        }

    } catch (err) {
        showToast('Gagal mengambil device', 'error')
    } finally {
        loadingDevices.value = false
    }
}

// =====================
// FETCH AUTOMATIONS (INI YANG KAMU BUTUH)
// =====================
const fetchAutomations = async () => {
    loadingAutomations.value = true

    try {
        const res: any = await $fetch('automation', {
            baseURL: config.public.apiBase,
            headers: {
                Authorization: `Bearer ${token.value}`
            }
        })

        automations.value = (res.data || []).map((item: any) => {
            const condition = item.conditions?.[0]
            const action = item.actions?.[0]

            return {
                id: item.id,
                name: item.name,
                active: item.is_active,
                trigger:
                    condition?.type === 'sensor'
                        ? `${condition.sensor_tag} ${condition.operator} ${condition.value}`
                        : `Time = ${condition?.time}`,
                action: `Pin ${action?.target_pin} = ${action?.value ? 'ON' : 'OFF'}`
            }
        })

    } catch (err) {
        showToast('Gagal mengambil automation', 'error')
    } finally {
        loadingAutomations.value = false
    }
}

// =====================
// TOGGLE (UI ONLY)
// =====================
const toggleAutomation = async (item: any) => {
    const oldState = item.active
    item.active = !item.active // optimistic UI

    toggling.value = item.id

    try {
        await $fetch(`automation/${item.id}/toggle`, {
            baseURL: config.public.apiBase,
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token.value}`
            },
            body: {
                state: item.active
            }
        })

        showToast(
            `Automation ${item.active ? 'enabled' : 'disabled'}`,
            'success'
        )

    } catch (err) {
        // rollback kalau gagal
        item.active = oldState
        showToast('Gagal update automation', 'error')
    } finally {
        toggling.value = null
    }
}

// =====================
// SAVE TO BACKEND
// =====================
const saveAutomation = async () => {
    if (!validateForm()) {
        showToast('Form belum lengkap', 'error')
        return
    }

    saving.value = true

    const conditions =
        form.type === 'sensor'
            ? [{
                type: 'sensor',
                sensor_tag: form.sensor,
                operator: form.operator,
                value: form.value
            }]
            : [{
                type: 'time',
                time: form.time
            }]

    const actions = [{
        target_pin: form.pin,
        value: Number(form.actionValue)
    }]

    const payload = {
        device_id: selectedDeviceId.value,
        name: form.name,
        conditions,
        actions
    }

    try {
        await $fetch('automation', {
            baseURL: config.public.apiBase,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token.value}`
            },
            body: payload
        })

        showToast('Automation berhasil ditambahkan', 'success')

        showModal.value = false

        form.name = ''
        form.sensor = 'temperature'
        form.operator = '>'
        form.value = ''
        form.time = ''
        form.pin = ''
        form.actionValue = '1'

        // 🔥 refresh list dari backend biar sinkron
        await fetchAutomations()

    } catch (err) {
        console.error(err)
        showToast('Gagal menyimpan automation', 'error')
    } finally {
        saving.value = false
    }
}

const deleteAutomation = async (item: any) => {
    const backup = [...automations.value] // backup list

    // optional confirm (simple version)
    if (!confirm(`Hapus automation "${item.name}"?`)) {
        return
    }

    // optimistic: langsung hapus dari UI
    automations.value = automations.value.filter(a => a.id !== item.id)
    deleting.value = item.id

    try {
        await $fetch(`automation/${item.id}`, {
            baseURL: config.public.apiBase,
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token.value}`
            }
        })

        showToast('Automation berhasil dihapus', 'success')

    } catch (err) {
        // rollback kalau gagal
        automations.value = backup
        showToast('Gagal menghapus automation', 'error')
    } finally {
        deleting.value = null
    }
}

// =====================
// INIT
// =====================
onMounted(() => {
    fetchDevices()
    fetchAutomations()
})
</script>

<template>
    <div>

        <!-- TOAST -->
        <div v-if="toast.show"
            class="fixed top-5 right-5 z-[99999] px-4 py-3 rounded-xl text-white shadow-lg transition-all duration-300"
            :class="toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'">
            {{ toast.message }}
        </div>

        <!-- HEADER -->
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-semibold">Automation</h2>

            <button class="btn" @click="showModal = true">
                + Add Automation
            </button>
        </div>

        <!-- LOADING -->
        <div v-if="loadingAutomations" class="text-gray-500 mb-4">
            Loading automation...
        </div>

        <!-- LIST -->
        <div class="space-y-4">
            <div v-for="item in automations" :key="item.id" class="card flex justify-between items-center">

                <div class="flex-1">
                    <p class="font-semibold">{{ item.name }}</p>
                    <p class="text-xs text-gray-500">IF {{ item.trigger }}</p>
                    <p class="text-xs text-gray-500">THEN {{ item.action }}</p>
                </div>

                <div class="flex items-center gap-3">

                    <!-- STATUS -->
                    <span class="text-xs" :class="item.active ? 'text-green-500' : 'text-gray-400'">
                        {{ item.active ? 'Active' : 'Disabled' }}
                    </span>

                    <!-- TOGGLE -->
                    <button class="toggle" :class="{ active: item.active }" :disabled="toggling === item.id"
                        @click="toggleAutomation(item)" />

                    <!-- DELETE -->
                    <button class="btn text-red-500" :disabled="deleting === item.id" @click="deleteAutomation(item)">
                        <span v-if="deleting === item.id">...</span>
                        <span v-else>Delete</span>
                    </button>

                </div>

            </div>
        </div>

        <!-- MODAL -->
        <Teleport to="body">
            <div v-if="showModal"
                class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                @click.self="showModal = false">

                <div class="modal card animate-scale">

                    <h3 class="font-semibold mb-4">Add Automation</h3>

                    <!-- DEVICE -->
                    <select v-if="!loadingDevices" v-model="selectedDeviceId" class="input mb-2">
                        <option disabled value="">Select Device</option>
                        <option v-for="d in devices" :key="d.id" :value="d.id">
                            {{ d.device_name }}
                        </option>
                    </select>

                    <div v-else class="input mb-2 animate-pulse text-gray-400">
                        Loading devices...
                    </div>

                    <p v-if="errors.device" class="text-xs text-red-500 mb-2">{{ errors.device }}</p>

                    <!-- NAME -->
                    <input v-model="form.name" class="input mb-1" placeholder="Automation Name" />
                    <p v-if="errors.name" class="text-xs text-red-500 mb-2">{{ errors.name }}</p>

                    <!-- TYPE -->
                    <select v-model="form.type" class="input mb-3">
                        <option value="sensor">Sensor</option>
                        <option value="time">Time</option>
                    </select>

                    <!-- SENSOR -->
                    <div v-if="form.type === 'sensor'" class="flex gap-2 mb-1">
                        <select v-model="form.sensor" class="input">
                            <option value="temperature">Temperature</option>
                            <option value="humidity">Humidity</option>
                            <option value="pressure">Pressure</option>
                        </select>

                        <select v-model="form.operator" class="input">
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value="=">=</option>
                        </select>

                        <input v-model="form.value" type="number" class="input" placeholder="Value" />
                    </div>

                    <p v-if="errors.value" class="text-xs text-red-500 mb-2">{{ errors.value }}</p>

                    <!-- TIME -->
                    <div v-else class="mb-3">
                        <input v-model="form.time" type="time" class="input" />
                    </div>

                    <p v-if="errors.time" class="text-xs text-red-500 mb-2">{{ errors.time }}</p>

                    <!-- PIN -->
                    <select v-model="form.pin" class="input mb-1">
                        <option disabled value="">Select Pin</option>
                        <option v-for="pin in availablePins" :key="pin.id" :value="pin.pin_name">
                            {{ pin.pin_name }} - {{ pin.data_streams?.name }}
                        </option>
                    </select>

                    <p v-if="errors.pin" class="text-xs text-red-500 mb-2">{{ errors.pin }}</p>

                    <!-- ACTION -->
                    <select v-model="form.actionValue" class="input mb-4">
                        <option value="1">ON</option>
                        <option value="0">OFF</option>
                    </select>

                    <!-- BUTTON -->
                    <div class="flex justify-end gap-2">
                        <button class="btn" @click="showModal = false">Cancel</button>

                        <button class="btn" :disabled="saving || !validateForm()"
                            :class="{ 'opacity-50 cursor-not-allowed': saving || !validateForm() }"
                            @click="saveAutomation">

                            <span v-if="saving">Saving...</span>
                            <span v-else>Save</span>

                        </button>
                    </div>

                </div>
            </div>
        </Teleport>

    </div>
</template>

<style scoped>
.card {
    background: #e0e5ec;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 6px 6px 12px #babecc,
        -6px -6px 12px #ffffff;
}

.modal {
    width: 600px;
}

.input {
    width: 100%;
    padding: 8px;
    border-radius: 10px;
    border: none;
    background: #e0e5ec;
    box-shadow: inset 2px 2px 4px #babecc,
        inset -2px -2px 4px #ffffff;
}

.btn {
    padding: 10px 14px;
    border-radius: 10px;
    background: #e0e5ec;
    cursor: pointer;
    box-shadow: 4px 4px 8px #babecc,
        -4px -4px 8px #ffffff;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.toggle {
    width: 46px;
    height: 24px;
    border-radius: 999px;
    background: #cfd6e1;
    position: relative;
}

.toggle::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    transition: 0.25s;
}

.toggle.active {
    background: #4ade80;
}

.toggle.active::after {
    transform: translateX(20px);
}

.animate-scale {
    animation: scaleIn 0.18s ease;
}

@keyframes scaleIn {
    from {
        transform: scale(0.9);
        opacity: 0;
    }

    to {
        transform: scale(1);
        opacity: 1;
    }
}
</style>