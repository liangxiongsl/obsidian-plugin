<template>
  <!--<link rel="stylesheet" href="../../../themes/my disco lights/theme.css">-->
  <n-divider title-placement="center">累加器</n-divider>
  <div>
    <n-button @click="add_one">+1</n-button>
    <span class="sample-class">{{ count }}</span>
  </div>


  <n-divider title-placement="center">下拉框</n-divider>
  <n-dropdown trigger="hover" :options="options" @select="on_selected">
    <n-button ref="sd">select an option</n-button>
  </n-dropdown>

  <n-divider title-placement="center">图片墙</n-divider>
  <n-carousel draggable>
    <img class="carousel-img" src="https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel1.jpeg">
    <img class="carousel-img" src="https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel2.jpeg">
    <img class="carousel-img" src="https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel3.jpeg">
    <img class="carousel-img" src="https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel4.jpeg">
  </n-carousel>

</template>

<script lang="ts">
import { defineComponent } from "vue";
import { NButton,NDropdown,NCarousel,NDivider } from "naive-ui";
export default defineComponent({
  components:{
    NButton,NDropdown,NCarousel,NDivider
  },
  name: "SampleSettingTabPage",
  data() {
    return {
      count: 0,
      options: [
        {label: 'Marina Bay Sands', key: 'marina bay sands',disabled: true},
        {label: "Brown's Hotel, London", key: "brown's hotel, london"},
        {label: 'Atlantis Bahamas, Nassau',key: 'atlantis nahamas, nassau'},
        {label: 'The Beverly Hills Hotel, Los Angeles',key: 'the beverly hills hotel, los angeles'}
      ],
    }
  },
  methods: {
    add_one() {
        this.count += 1;
    },
    on_selected(key: string | number){
      // useMessage().info(String(key))
      console.log(key)
    }
  },
  mounted() {
    console.log(this.$refs.sd)
  }
})
</script>