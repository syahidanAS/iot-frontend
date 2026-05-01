<script setup lang="ts">
import mqtt from 'mqtt'
import { toast } from 'vue-sonner'

const route = useRoute()
const config = useRuntimeConfig()
const router = useRouter()

const token = useCookie('token')
const deviceId = route.params.id

// =====================
// AUDIO
// =====================
const audioUnlocked = ref(false)

const onSound = ref<HTMLAudioElement | null>(null)
const offSound = ref<HTMLAudioElement | null>(null)
const dangerSound = ref<HTMLAudioElement | null>(null)

// =====================
// STATE
// =====================
const loading = ref(true)

const pins = ref<any[]>([])
const device = ref<any>(null)

const sensors = reactive<Record<string, number>>({})

const dangerTemperature = ref(false)

let client: any = null

// =====================
// DEVICE NAME
// =====================
const deviceName = computed(() =>
    device.value?.device_name ?? 'Loading...'
)

// =====================
// NOTIFICATION
// =====================
const requestNotificationPermission = async () => {

    if (!('Notification' in window)) {
        console.log('Browser tidak support notification')
        return
    }

    if (Notification.permission === 'default') {

        const permission =
            await Notification.requestPermission()

        console.log(
            'Notification permission:',
            permission
        )
    }
}

// =====================
// RELAY PINS
// =====================
const filteredPins = computed(() => {
    return pins.value.filter(
        pin => pin.data_streams?.tag === 'relay'
    )
})

// =====================
// SENSOR PINS
// =====================
const sensorPins = computed(() => {
    return pins.value.filter(
        pin => pin.data_streams?.tag !== 'relay'
    )
})

// =====================
// AUDIO UNLOCK
// =====================
const unlockAudio = async () => {

    if (audioUnlocked.value) return

    try {

        if (onSound.value) {

            onSound.value.volume = 0

            await onSound.value.play()

            onSound.value.pause()

            onSound.value.currentTime = 0

            onSound.value.volume = 1
        }

        audioUnlocked.value = true

        console.log('AUDIO UNLOCKED')

    } catch (err) {

        console.error(
            'UNLOCK AUDIO ERROR:',
            err
        )
    }
}

// =====================
// PLAY SOUND
// =====================
const playSound = async (
    type: 'on' | 'off'
) => {

    if (!audioUnlocked.value) return

    try {

        const audio =
            type === 'on'
                ? onSound.value
                : offSound.value

        if (!audio) return

        audio.pause()

        audio.currentTime = 0

        await audio.play()

    } catch (err) {

        console.error(
            'SOUND ERROR:',
            err
        )
    }
}

// =====================
// PLAY DANGER SOUND
// =====================
const playDangerSound = async () => {

    if (!audioUnlocked.value) return

    try {

        if (!dangerSound.value) return

        dangerSound.value.loop = true

        await dangerSound.value.play()

    } catch (err) {

        console.error(
            'DANGER SOUND ERROR:',
            err
        )
    }
}

// =====================
// STOP DANGER SOUND
// =====================
const stopDangerSound = () => {

    if (!dangerSound.value) return

    dangerSound.value.pause()

    dangerSound.value.currentTime = 0
}

// =====================
// UNIT
// =====================
const getUnit = (tag: string) => {

    switch (tag) {

        case 'temperature':
            return '°C'
        case 'temprature':
            return '°C'

        case 'humidity':
            return '%'

        case 'pressure':
            return 'hPa'

        default:
            return ''
    }
}

// =====================
// FETCH DEVICE
// =====================
const fetchDevice = async () => {

    try {

        const res: any = await $fetch(
            `secret-keys/find/${deviceId}`,
            {
                baseURL: config.public.apiBase,
                headers: {
                    Authorization: `Bearer ${token.value}`
                }
            }
        )

        device.value = res.data

    } catch (err: any) {

        if (err?.response?.status === 401) {

            token.value = null

            localStorage.removeItem('token')

            await router.push('/login')
        }
    }
}

// =====================
// FETCH PINS
// =====================
const fetchPins = async () => {

    const start = Date.now()

    try {

        const res: any = await $fetch(
            'get-device-state',
            {
                baseURL: config.public.apiBase,
                params: {
                    device_id: deviceId
                },
                headers: {
                    Authorization: `Bearer ${token.value}`
                }
            }
        )

        pins.value =
            res.data.virtual_pin || []

    } catch (err: any) {

        if (err?.response?.status === 401) {

            token.value = null

            localStorage.removeItem('token')

            await router.push('/login')
        }

    } finally {

        const elapsed =
            Date.now() - start

        const delay =
            Math.max(600 - elapsed, 0)

        setTimeout(() => {
            loading.value = false
        }, delay)
    }
}

// =====================
// PUBLISH RELAY
// =====================
const publishRelay = (
    pin: any,
    value: string
) => {

    if (!client || !device.value) return

    const topic =
        `device/${device.value.device_name}/${pin.pin_name}`

    client.publish(
        topic,
        value,
        {
            qos: 1,
            retain: true
        }
    )
}

// =====================
// TOGGLE PIN
// =====================
const togglePin = async (
    pin: any
) => {

    await unlockAudio()

    if (!client) return

    const newValue =
        pin.state === '1'
            ? '0'
            : '1'

    publishRelay(pin, newValue)
}

// =====================
// MQTT INIT
// =====================
const initMqtt = () => {

    if (!device.value) return

    const baseTopic =
        `device/${device.value.device_name}`

    client = mqtt.connect(
         config.public.mqttHost as string,
        {
            username: device.value.device_name,
            password: device.value.key,
            reconnectPeriod: 2000,
            clean: true
        }
    )

    // =====================
    // CONNECT
    // =====================
    client.on('connect', () => {

        console.log('MQTT CONNECTED')

        const wildcardTopic =
            `${baseTopic}/#`

        client.subscribe(
            wildcardTopic,
            { qos: 1 },
            (err: any) => {

                if (err) {

                    console.error(
                        'SUBSCRIBE ERROR:',
                        err
                    )

                } else {

                    console.log(
                        'SUBSCRIBED:',
                        wildcardTopic
                    )
                }
            }
        )
    })

    // =====================
    // MESSAGE
    // =====================
    client.on(
        'message',
        (
            topic: string,
            message: Buffer
        ) => {

            const value =
                message.toString()

            const pinName =
                topic.split('/').pop()

            if (!pinName) return

            const foundPin =
                pins.value.find(
                    p => p.pin_name === pinName
                )

            if (!foundPin) return

            // =====================
            // RELAY
            // =====================
            if (
                foundPin.data_streams?.tag === 'relay'
            ) {

                const oldState =
                    foundPin.state

                foundPin.state = value

                if (oldState !== value) {

                    const isOn =
                        value === '1'

                    toast.success(
                        `${foundPin.data_streams.name} ${isOn
                            ? 'ON'
                            : 'OFF'
                        }`,
                        {
                            duration: 2000
                        }
                    )

                    playSound(
                        isOn
                            ? 'on'
                            : 'off'
                    )
                }
            }

            // =====================
            // SENSOR
            // =====================
            else {

                const numericValue =
                    Number(value)

                sensors[pinName] =
                    numericValue

                // =====================
                // TEMPERATURE ALERT
                // =====================
                if (
                    foundPin.data_streams?.tag === 'temperature' ||
                    foundPin.data_streams?.tag === 'temprature'
                ) {

                    if (numericValue >= 100) {

                        if (!dangerTemperature.value) {

                            dangerTemperature.value = true

                            toast.error(
                                'DANGER! Temperature reached 100°C',
                                {
                                    duration: 5000
                                }
                            )

                            playDangerSound()

                            if (
                                Notification.permission === 'granted'
                            ) {

                                new Notification(
                                    '🔥 DANGER TEMPERATURE',
                                    {
                                        body:
                                            `Temperature is ${numericValue}°C`
                                    }
                                )
                            }
                        }

                    } else {

                        dangerTemperature.value = false

                        stopDangerSound()
                    }
                }
            }
        }
    )

    // =====================
    // ERROR
    // =====================
    client.on('error', (err: any) => {
        console.error(
            'MQTT ERROR:',
            err
        )
    })

    client.on('reconnect', () => {
        console.log(
            'MQTT RECONNECTING...'
        )
    })

    client.on('close', () => {
        console.log(
            'MQTT CLOSED'
        )
    })
}

// =====================
// LIFECYCLE
// =====================
onMounted(async () => {

    // =====================
    // REQUEST NOTIFICATION
    // =====================
    await requestNotificationPermission()

    // =====================
    // PRELOAD SOUND
    // =====================
    onSound.value =
        new Audio('/sounds/power-on.mp3')

    offSound.value =
        new Audio('/sounds/power-off.mp3')

    dangerSound.value =
        new Audio('/sounds/danger.mp3')

    await fetchDevice()

    await fetchPins()

    initMqtt()

    // =====================
    // UNLOCK AUDIO
    // =====================
    const unlock = async () => {

        await unlockAudio()

        window.removeEventListener(
            'click',
            unlock
        )
    }

    window.addEventListener(
        'click',
        unlock
    )
})

onBeforeUnmount(() => {

    stopDangerSound()

    if (client) {

        client.end(true)
    }
})
</script>

<template>

    <!-- ===================== -->
    <!-- LOADING -->
    <!-- ===================== -->
    <div v-if="loading" class="space-y-4">

        <!-- SENSOR -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div v-for="i in 3" :key="i" class="neumorph p-4">
                <div class="skeleton h-3 w-20 mx-auto mb-3"></div>

                <div class="skeleton h-6 w-16 mx-auto"></div>
            </div>
        </div>

        <!-- RELAY -->
        <div v-for="i in 3" :key="'r' + i" class="neumorph p-4 flex justify-between">
            <div>
                <div class="skeleton h-4 w-32 mb-2"></div>

                <div class="skeleton h-3 w-16"></div>
            </div>

            <div class="skeleton h-6 w-12 rounded-full"></div>
        </div>

    </div>

    <!-- ===================== -->
    <!-- CONTENT -->
    <!-- ===================== -->
    <div v-else>

        <!-- ===================== -->
        <!-- DANGER ALERT -->
        <!-- ===================== -->
        <div v-if="dangerTemperature" class="danger-alert">
            <div class="danger-content">

                <h1>
                    DANGER !
                </h1>

                <p>
                    TEMPERATURE ABOVE 100°C
                </p>

            </div>
        </div>

        <!-- SENSOR -->
        <div v-if="sensorPins.length === 0" class="neumorph p-4 text-center text-gray-500 mb-6">
            No sensor data available
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div v-for="pin in sensorPins" :key="pin.pin_name" class="neumorph p-4 text-center">
                <p class="text-xs text-gray-500">
                    {{ pin.data_streams.name }}
                </p>

                <p class="text-xl font-bold">
                    {{ sensors[pin.pin_name] ?? '-' }}
                    {{ getUnit(pin.data_streams.tag) }}
                </p>
            </div>
        </div>

        <!-- DEVICE -->
        <h2 class="text-lg font-semibold mb-4">
            Device: {{ deviceName }}
        </h2>

        <!-- EMPTY -->
        <div v-if="filteredPins.length === 0" class="text-gray-500 text-center py-6">
            No relay pins found
        </div>

        <!-- RELAY -->
        <div v-else class="space-y-3">

            <div v-for="pin in filteredPins" :key="pin.pin_name" class="neumorph p-4 flex justify-between">
                <div>

                    <p class="font-medium">
                        {{ pin.data_streams.name }}
                    </p>

                    <p class="text-xs text-gray-500">
                        {{ pin.pin_name }}
                    </p>

                </div>

                <div class="flex items-center gap-3">

                    <span :class="pin.state == '1'
                        ? 'text-green-500'
                        : 'text-gray-400'
                        ">
                        {{
                            pin.state == '1'
                                ? 'ON'
                                : 'OFF'
                        }}
                    </span>

                    <button @click="togglePin(pin)" class="toggle" :class="{
                        active:
                            pin.state == '1'
                    }" />

                </div>
            </div>

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
}

/* ===================== */
/* SKELETON */
/* ===================== */

.skeleton {

    border-radius: 8px;

    background: #d1d9e6;

    position: relative;

    overflow: hidden;
}

.skeleton::after {

    content: "";

    position: absolute;

    inset: 0;

    transform: translateX(-100%);

    background:
        linear-gradient(90deg,
            transparent,
            rgba(255, 255, 255, 0.6),
            transparent);

    animation:
        shimmer 1.5s infinite;
}

@keyframes shimmer {

    100% {
        transform:
            translateX(100%);
    }
}

/* ===================== */
/* TOGGLE */
/* ===================== */

.toggle {

    width: 46px;
    height: 24px;

    border-radius: 999px;

    position: relative;

    cursor: pointer;

    background: #cfd6e1;

    transition: 0.25s;

    box-shadow:
        inset 2px 2px 5px #babecc,
        inset -2px -2px 5px #ffffff;
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

    box-shadow:
        2px 2px 5px #babecc,
        -2px -2px 5px #ffffff;

    transition: 0.25s;
}

.toggle.active {
    background: #4ade80;
}

.toggle.active::after {

    transform:
        translateX(20px);
}

/* ===================== */
/* DANGER ALERT */
/* ===================== */

.danger-alert {

    width: 100%;

    padding: 30px;

    margin-bottom: 20px;

    border-radius: 20px;

    background:
        linear-gradient(135deg,
            #ff0000,
            #b30000);

    color: white;

    text-align: center;

    animation:
        pulseDanger 1s infinite;

    box-shadow:
        0 0 25px rgba(255, 0, 0, 0.6);
}

.danger-content h1 {

    font-size: 42px;

    font-weight: bold;

    margin-bottom: 10px;
}

.danger-content p {

    font-size: 20px;

    font-weight: 600;
}

.danger-icon {

    font-size: 60px;

    margin-bottom: 10px;
}

@keyframes pulseDanger {

    0% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.02);
    }

    100% {
        transform: scale(1);
    }
}
</style>