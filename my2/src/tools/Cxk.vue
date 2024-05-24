<script  lang="ts">
import {defineComponent} from "vue";

export default defineComponent({

})
</script>

<template>
<div style="width: 90%;height: 90%;background-color: darkred">
  <button><router-link to="/explorer">explorer</router-link></button>
  <button><router-link to="/player">player</router-link></button>
  <button><router-link to="/setting">setting</router-link></button>
  <router-view></router-view>
</div>
</template>

<style scoped>

</style>