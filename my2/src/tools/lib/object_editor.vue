<script type="module">
export default {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  computed: {
    obj: {
      get() {
        return this.modelValue
      },
      set(new_value) {
        this.$emit('update:modelValue', new_value)
      }
    }
  },
  data(){
    return{key: '', val: '', select: 1}
  },
  methods:{
    item_add(){
      this.obj[this.key]=JSON.parse(this.val);
      this.key='';
      this.val=null
    },
    on_keydown(e){
      if (e.keyCode===13) this.item_add()
    }
  }
}
</script>

<template>
  edit mode:
  <select v-model="select">
    <option :value="1">key-val</option>
    <option :value="2">text</option>
  </select>
  <div v-if="select===1">
    <table>
    <tr v-for="(v,k,i) in this.obj" :ref="i">
      <td><input :value="k" disabled></td>
      <td><input :value="JSON.stringify(v)"  @input="(e)=>this.obj[k]=JSON.parse(e.target.value)"></td>
      <td><button @click="delete this.obj[k]">del</button></td>
    </tr>
  </table>
  <tr ref="new">
    <td><input placeholder="new key" v-model="key" @keydown="on_keydown"></td>
    <td><input placeholder="new value" v-model="val" @keydown="on_keydown"></td>
    <td><button @click="item_add">add</button></td>
  </tr>
  </div>
  <div v-else>
    <textarea :value="JSON.stringify(this.obj)" @input="(e)=>this.obj=JSON.parse(e.target.value)"></textarea>
  </div>
</template>

<style scoped>
textarea{
  width: 350px; height: 60px
}
</style>