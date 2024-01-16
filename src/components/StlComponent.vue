<script>
import { vue3dLoader } from 'vue-3d-loader'

export default {
  components: { Vue3dLoader: vue3dLoader },

  data() {
    return {
      light: [
        { type: 'AmbientLight', color: '#025e15' },
        { type: 'DirectionalLight', position: { x: 20, y: 20, z: 70 }, color: '#00FF33', intensity: 0.5 },
        { type: 'DirectionalLight', position: { x: -20, y: -20, z: -70 }, color: '#FF0033', intensity: 0.8 },
        { type: 'PointLight', color: '#ffffff', position: { x: -20, y: -90, z: -20 }, intensity: 0.1 },
      ],
      rotation: { x: -200, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
    }
  },
  watch: {
    position(newValue) {
      try {
        this.rotation.y = Math.PI / 2 * (newValue[0] / window.innerWidth - 0.5)
        this.rotation.x = Math.PI / 2 * (newValue[1] / window.innerHeight - 0.5) - 200
      }
      catch (e) {
      }
    },
  },

  mounted() {
    window.addEventListener('mousemove', this.moved)
  },

  methods: {
    moved(event) {
      try {
        this.position = [event.clientX, event.clientY]
      }
      catch (e) {
        this.position = [window.innerWidth / 2, window.innerHeight / 2]
      }
    },
  },

}
</script>

<template>
  <div class="view3d">
    <Vue3dLoader
      :height="400"
      :width="400"
      :show-fps="false"
      file-path="/model.stl"
      :background-color="isDark ? '#121212' : '#ffffff'"
      :camera-position="{ x: 0, y: -80, z: 30 }"
      :lights="light"
      :rotation="rotation"
    />
    <!--      texture-image="/texture.png" -->
  </div>
</template>

<style scoped>
.view3d {
  display: flex;
  justify-content: center;
}
</style>
