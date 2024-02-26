<script setup>
import { vue3dLoader } from 'vue-3d-loader'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps(['stl', 'pos'])
const stl = props.stl
const pos = props.pos
const light = [
  { type: 'AmbientLight', color: '#025e15' },
  { type: 'DirectionalLight', position: { x: 20, y: 20, z: 70 }, color: '#00FF33', intensity: 0.5 },
  { type: 'DirectionalLight', position: { x: -20, y: -20, z: -70 }, color: '#FF0033', intensity: 0.8 },
  { type: 'PointLight', color: '#ffffff', position: { x: -20, y: -90, z: -20 }, intensity: 0.1 },
]

const rotation = ref({ x: -200, y: 0, z: 0 })
const position = ref({ x: 0, y: 0, z: 0 })

function moved(event) {
  try {
    position.value.x = event.clientX
    position.value.y = event.clientY
  }
  catch (e) {
    position.value.x = window.innerWidth / 2
    position.value.y = window.innerHeight / 2
  }
}

// Listen to mousemove event
onMounted(() => {
  window.addEventListener('mousemove', moved)
})

// Stop listening to mousemove event when component unmounted
onUnmounted(() => {
  window.removeEventListener('mousemove', moved)
})

// Watch position changes
watch(position, (newValue) => {
  try {
    rotation.value.y = Math.PI / 2 * (newValue.x / window.innerWidth - 0.5)
    rotation.value.x = Math.PI / 2 * (newValue.y / window.innerHeight - 0.5) - 200
  }
  catch (e) {
    // Handle error if needed
  }
}, { deep: true })
</script>

<template>
  <div class="view3d">
    <vue3dLoader
      :height="400"
      :width="400"
      :show-fps="false"
      :file-path="stl"
      :background-color="isDark ? '#121212' : '#ffffff'"
      :camera-position="pos"
      :lights="light"
      :rotation="rotation"
    />
  </div>
</template>

<style scoped>
.view3d {
  display: flex;
  justify-content: center;
}
</style>
