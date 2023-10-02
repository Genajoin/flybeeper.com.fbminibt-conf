<template>
  <vue3d-loader
      :height="300"
      :width="300"
      :showFps="false"
      :filePath="'/stl/mini-bt.stl'"
      :backgroundColor="0xFFFFFF"
      :cameraPosition="{ x: -30, y: -20, z: 70 }"
      :textureImage="'/stl/texture.png'"
      :lights="light"
      :rotation="rotation"
  ></vue3d-loader>
</template>


<script>
import {vue3dLoader} from "vue-3d-loader";

export default {
    name: 'FlybeeperMini',
    components: {vue3dLoader},

    data() {
        return {
          light: [
              { type: "AmbientLight", color: 0xaaaaaa},
              { type: "DirectionalLight", position: { x: 20, y: 20, z: 70 }, color: 0xffffff, intensity: 1},
              { type: "PointLight", color: "#ffffff", position: { x: 100, y: -100, z: -10 },intensity: .8}
          ],
          rotation: {
            x: 0,
            y: 0,
            z: 0,
          },
          position: [0, 0],
          controls: null,
        }
    },

    mounted() {
      window.addEventListener('mousemove', this.moved);
    },
    watch: {
      position(newValue, ) {
        try {
          this.rotation.y = Math.PI/2 * (newValue[0]/window.innerWidth - 0.5);
          this.rotation.x = Math.PI/2 * (newValue[1]/window.innerHeight - 0.5);
        } catch (e) {
        }
      },
    },
    methods: {
      moved: function (event) {
        try {
          this.position = [event.clientX, event.clientY];
        } catch (e) {
          this.position = [window.innerWidth / 2, window.innerHeight / 2];
        }
      },
    },

}
</script>

<style scoped>
</style>
