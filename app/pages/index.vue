<script setup lang="ts">
// dummy data dulu (nanti tinggal ganti API)
const stats = {
  devices: 12,
  online: 8,
  offline: 4,
  sensors: 24
}

const devices = [
  { name: 'alkha-device-013', status: 'online' },
  { name: 'gudang-01', status: 'offline' },
  { name: 'ruang-server', status: 'online' }
]
</script>

<template>
  <div>

    <!-- TITLE -->
    <h2 class="text-lg font-semibold mb-6">Dashboard</h2>

    <!-- ===================== -->
    <!-- SUMMARY -->
    <!-- ===================== -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">

      <div class="card">
        <p class="label">Devices</p>
        <h3 class="value">{{ stats.devices }}</h3>
      </div>

      <div class="card">
        <p class="label">Online</p>
        <h3 class="value text-green-500">{{ stats.online }}</h3>
      </div>

      <div class="card">
        <p class="label">Offline</p>
        <h3 class="value text-red-400">{{ stats.offline }}</h3>
      </div>

      <div class="card">
        <p class="label">Sensors</p>
        <h3 class="value">{{ stats.sensors }}</h3>
      </div>

    </div>

    <!-- ===================== -->
    <!-- REALTIME -->
    <!-- ===================== -->
    <div class="card mb-6">
      <h3 class="section-title">Realtime Overview</h3>

      <div class="grid grid-cols-3 gap-4 text-center mt-3">

        <div>
          <p class="label">Temperature</p>
          <p class="value">28°C</p>
        </div>

        <div>
          <p class="label">Humidity</p>
          <p class="value">60%</p>
        </div>

        <div>
          <p class="label">Pressure</p>
          <p class="value">1012 hPa</p>
        </div>

      </div>
    </div>

    <!-- ===================== -->
    <!-- GRID 2 COLUMN -->
    <!-- ===================== -->
    <div class="grid md:grid-cols-2 gap-6">

      <!-- DEVICE STATUS -->
      <div class="card">
        <h3 class="section-title">Device Status</h3>

        <div class="mt-3 space-y-3">

          <div v-for="d in devices" :key="d.name" class="flex justify-between items-center text-sm">
            <span>{{ d.name }}</span>

            <span :class="d.status === 'online'
              ? 'text-green-500'
              : 'text-red-400'">
              ● {{ d.status }}
            </span>
          </div>

        </div>
      </div>

      <!-- ALERT -->
      <div class="card">
        <h3 class="section-title">Alerts</h3>

        <div class="mt-3 space-y-2 text-sm">

          <p class="text-red-400">
            ⚠️ Suhu ruang server tinggi
          </p>

          <p class="text-yellow-500">
            ⚠️ Device gudang offline
          </p>

        </div>
      </div>

    </div>

    <!-- ===================== -->
    <!-- QUICK ACTION -->
    <!-- ===================== -->
    <div class="card mt-6">
      <h3 class="section-title">Quick Actions</h3>

      <div class="flex flex-wrap gap-3 mt-3">

        <button class="btn">+ Add Device</button>
        <button class="btn">Refresh</button>
        <button class="btn">View Logs</button>

      </div>
    </div>

  </div>
</template>

<style scoped>
.card {
  background: #e0e5ec;
  border-radius: 16px;
  padding: 16px;

  box-shadow:
    6px 6px 12px #babecc,
    -6px -6px 12px #ffffff;

  transition: 0.2s;
}

.card:hover {
  transform: translateY(-2px);
}

.label {
  font-size: 12px;
  color: #6b7280;
}

.value {
  font-size: 20px;
  font-weight: bold;
  margin-top: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
}

.btn {
  padding: 10px 14px;
  border-radius: 10px;
  background: #e0e5ec;
  cursor: pointer;
  font-size: 13px;

  box-shadow:
    4px 4px 8px #babecc,
    -4px -4px 8px #ffffff;

  transition: 0.2s;
}

.btn:hover {
  box-shadow:
    inset 2px 2px 4px #babecc,
    inset -2px -2px 4px #ffffff;
}
</style>