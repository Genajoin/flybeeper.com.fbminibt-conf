<template>
  <div class="update">
    <a v-if="jsonData" :href="'/download/' + lastVer.filename" download
       class="download-button">Download firmware
    </a>
    <h1>How to update</h1>
    <p>
      The best solution is to use the popular <a href="https://www.nordicsemi.com/Products/Development-tools/nrf-connect-for-mobile">nRF Connect for Mobile application</a>.
      Install and launch the application. On the tab <i>Scan</i>, look for a device with a name <i>FBminiBT</i> and click <i>connect</i> button.
      On the tab that opens, close to the button <i>disconnect</i>, click on the icon <i>DFU</i>. Select the previously downloaded firmware file <i>app_update.bin</i> in the file system.
      Select the <i>Test and Confirm</i> and press <i>Ok</i>. After 15 seconds the file will be transferred, verified and the device will reboot.
    </p>
    <h1>Changelog</h1>
    <div v-if="jsonData">

    <div v-if="jsonData" v-for="item in jsonData" :key="item.version">
      <h2>ver.{{ item.version }} - {{item.date}} <a v-if="item.filename" :href="'/download/' + item.filename" download>Download</a></h2>
      <ul>
        <li v-for="desc in item.description" :key="desc">{{ desc }}</li>
      </ul>

    </div>
    </div>
  </div>
</template>

<script>
const appLink = ""

export default {
  name: "Update",
  data() {
    return {
      jsonData: null, // Инициализируем переменную для хранения данных из JSON-файла
      lastVer: null,
    };
  },
  async beforeMount() {
    try {
      // Ваш код загрузки JSON-данных
      const response = await fetch('/download/update.conf');

      if (!response.ok) {
        throw new Error('Не удалось загрузить JSON-файл');
      }

      // Десериализуем JSON-данные и сохраняем их в переменной
      this.jsonData = await response.json();

      // Теперь jsonData содержит данные и компонент может их использовать
      console.log('Загруженные JSON-данные:', this.jsonData);
      this.lastVer = this.findLatestVersion(this.jsonData);

    } catch (error) {
      console.error('Ошибка при загрузке JSON-файла:', error);
    }
  },
  methods:{
    findLatestVersion(dataArray) {
      let latestVersion = null;

      dataArray.forEach((item) => {
        const version = parseFloat(item.version);
        if (latestVersion === null || version > latestVersion) {
          latestVersion = item;
        }
      });

      return latestVersion;
    }
  }
}
</script>

<style scoped>
.download-button {
  background-color: green;
  color: white;
  padding: 10px 20px;
  text-decoration: none;
  display: inline-block;
  border-radius: 5px;
  margin-top: 10px;
}
</style>