<script setup>
import { defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps(['stl', 'pos'])

// Lazy-load vue-3d-loader + three.js (~700 KB raw / ~200 KB gz) on first mount,
// not as part of the parent route's chunk. Pages using <StlComponent /> stay
// interactive while the 3D viewer loads in the background.
const vue3dLoader = defineAsyncComponent(() =>
  import('vue-3d-loader').then(m => m.vue3dLoader),
)

const stl = props.stl
const pos = props.pos
const light = [
  { type: 'AmbientLight', color: '#025e15' },
  { type: 'DirectionalLight', position: { x: 20, y: 20, z: 70 }, color: '#00FF33', intensity: 0.5 },
  { type: 'DirectionalLight', position: { x: -20, y: -20, z: -70 }, color: '#FF0033', intensity: 0.8 },
  { type: 'PointLight', color: '#ffffff', position: { x: -20, y: -90, z: -20 }, intensity: 0.1 },
]

const modelRotation = ref({ x: 0, y: 0, z: 0 })
const windowPosition = ref({ x: 0, y: 0, z: 0 })
const modelPosition = ref({ x: 0, y: 0, z: 0 })
// const cameraPosition = ref({ x: 0, y: 0, z: 0 })

function moved(event) {
  try {
    windowPosition.value.x = event.clientX
    windowPosition.value.y = event.clientY
  }
  catch {
    windowPosition.value.x = window.innerWidth / 2
    windowPosition.value.y = window.innerHeight / 2
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
watch(windowPosition, (newValue) => {
  try {
    modelRotation.value.y = Math.PI / 2 * (newValue.x / window.innerWidth - 0.5)
    modelRotation.value.x = Math.PI / 2 * (newValue.y / window.innerHeight - 0.5)
  }
  catch {
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
      :rotation="modelRotation"
      :position="modelPosition"
    />
    <!--      :enableAxesHelper="true" -->
  </div>
<!--  <div>cam x:{{pos.x.toFixed(1)}} y:{{pos.y.toFixed(1)}} z:{{pos.z.toFixed(1)}}</div> -->
<!--  <div>rot x:{{modelRotation.x.toFixed(1)}} y:{{modelRotation.y.toFixed(1)}} z:{{modelRotation.z.toFixed(1)}}</div> -->
<!--  <div>pos x:{{modelPosition.x.toFixed(1)}} y:{{modelPosition.y.toFixed(1)}} z:{{modelPosition.z.toFixed(1)}}</div> -->
</template>

<style scoped>
.view3d {
  display: flex;
  justify-content: center;
}
</style>
