<script setup lang="ts">
import {defineProps} from 'vue'
import MyPlugin from './main'
let props = defineProps(['ob'])
let ob = props.ob as MyPlugin


</script>

<template>
</template>

<style scoped>
tr:nth-child(n){
	text-align: center;
}
div{
	width: 100%;
	background-color: white;
}
</style>
