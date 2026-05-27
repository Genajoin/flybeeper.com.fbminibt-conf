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
// FlyBeeper enclosures are matte black plastic. Pure black would crush
// without form; we tint the default white MeshPhongMaterial to a warm
// near-black inside onSceneLoad. Light rig keeps a single key + a
// signal-orange rim so the silhouette reads against ck-bg.
const light = [
  { type: 'AmbientLight', color: '#8a8a82', intensity: 0.55 },
  { type: 'DirectionalLight', position: { x: 30, y: 25, z: 60 }, color: '#ffffff', intensity: 0.65 },
  { type: 'DirectionalLight', position: { x: -30, y: -10, z: -40 }, color: '#ff6a00', intensity: 0.3 },
  { type: 'PointLight', position: { x: -20, y: -90, z: -20 }, color: '#ece9dd', intensity: 0.15 },
]

function onSceneLoad(scene) {
  scene.traverse((node) => {
    if (!node.isMesh || !node.material)
      return
    const m = node.material
    if (m.color)
      m.color.set('#2a2724')
    if (m.specular)
      m.specular.set('#3a3835')
    if ('shininess' in m)
      m.shininess = 18
    m.needsUpdate = true
  })
}

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
      :background-color="isDark ? '#0a0a0a' : '#ffffff'"
      :camera-position="pos"
      :lights="light"
      :rotation="modelRotation"
      :position="modelPosition"
      @load="onSceneLoad"
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
