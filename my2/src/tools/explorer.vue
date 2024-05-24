<script lang="ts">
import {defineComponent} from 'vue'
import $ from "jquery"


export default defineComponent({
  name: "explorer",
  data(vm) {
      return{
        url: '',
        history: {0: 'http://asciiflow.cn'} as Record<number,any>,
        cur: 0
      }
  },
  mounted(){
    $(()=>{
      $('#url').keydown((e: any)=>{
        if (e.keyCode === 13){
          console.log('jiba')
        }
        console.log(e.keyCode)
      })
    })
  },
  methods:{
    en(e: unknown){
      if (e.keyCode === 13){
        let url = `https://${this.url}`
        this.up(url)
        this.history[++this.cur] = url
        console.log(this.history)
      }
    },
    up(url: string){
      $('#frame').attr('src', url)
    }
  },
})
</script>

<template>


    <div id="main">
      <button @click="cur>0?up(history[--cur]):0">pre</button>
      <button @click="cur<Object.keys(history).length-1?up(history[++cur]):0">post</button>
      <input v-model="url" id="url" @keydown="en">
      <iframe src="http://asciiflow.cn/" id="frame"></iframe>
    </div>

</template>

<style scoped>
#main{
  height: 90%;
  width: 90%;
  background-color: #8aa4af;
}
#frame{
  height: 100%;
  width: 100%;
}
</style>