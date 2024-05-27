<script setup lang="ts">
import {defineProps, ref} from 'vue'
import MyPlugin from 'main'
let props = defineProps(['ob'])
let ob = props.ob as MyPlugin

let mds = ob.app.vault.getMarkdownFiles().map(v=>v.path)

let e = []
mds.forEach((v)=>{
	Object.keys(ob.app.metadataCache.resolvedLinks[v]).forEach((w)=>{
		if (w.endsWith('.md')){
			e.push({from: v, to: w})
		}
	})
})

import { DataSet, Network } from "vis/index-network"
let nodes = new DataSet(mds.map((v,i)=>({id: v, label: v})))
let edges = new DataSet(e)
import {nextTick} from 'vue'
nextTick(()=>{
	setTimeout(()=>{
		let el = document.getElementById("mynetwork")
		let network = new Network(el, {nodes, edges}, {})
	},0)
})

</script>

<template>
	<div id="mynetwork"></div>
</template>

<style scoped>
#mynetwork {
	width: 1000px;
	height: 500px;
	margin: 0 auto;
	border: 1px solid lightgray;
	canvas {
		cursor: pointer;
	}
}
</style>
