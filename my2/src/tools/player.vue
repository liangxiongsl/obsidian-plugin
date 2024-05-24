<template>
<div id="main">
  <el-container>
    <el-container id="up">
      <el-aside id="up-left">
        <el-scrollbar>
          <el-menu>
            <el-icon class="ml-4 mt-1"><Setting/></el-icon><span class="ml-3">liang xiong music</span>
            <el-menu-item-group v-for="group in aside">
              <template #title><el-button :icon="group.icon" link>{{group.title}}</el-button></template>

              <el-menu-item v-if="group.items" v-for="item in group.items">
                <el-button size="large" :icon="item.icon" link>{{item.title}}</el-button>
              </el-menu-item>
              <el-menu-item v-else v-for="album in group.albums">
                <el-button :icon="album.icon" link>{{album.title}}</el-button>
              </el-menu-item>

              <el-divider />
            </el-menu-item-group>
          </el-menu>
        </el-scrollbar>
      </el-aside>

      <el-container id="up-right">
        <el-header id="up-right-up">
          <el-row>
            <el-col :span="4" class="mt-5">
              <el-breadcrumb separator="/">
                <el-breadcrumb-item :to="{ path: './home.html' }">我的</el-breadcrumb-item>
                <el-breadcrumb-item>我喜欢的音乐</el-breadcrumb-item>
              </el-breadcrumb>
            </el-col>
            <el-col :span="4" class="mt-2">
              <el-autocomplete class="mt-1"
                               v-model="searched"
                               :fetch-suggestions="(str, ret) => {search(str); ret(suggestions)}"
                               :trigger-on-focus="true"
                               @select="item => selected=item"
                               clearable>
                <template #default="item">{{item.name}}</template>
                <template #prepend><el-button round :icon="Search"/></template>
              </el-autocomplete>
            </el-col>
            <el-col :span="1" class="mt-3 ml-3">
              <el-button :icon="Microphone" circle/>
            </el-col>
            <el-col :span="3" class="mt-3 ml-3">
              <el-button :icon="Avatar" round>liangxiong</el-button>
            </el-col>
            <el-col :span="3" class="mt-3 ml-3">
              <el-button :icon="Opportunity" round>成为 VIP</el-button>
            </el-col>
            <el-col :span="3" class="mt-5 ml-50">
              <el-icon><Message/></el-icon>
              <el-icon><Setting/></el-icon>
            </el-col>

          </el-row>
        </el-header>

        <el-container id="up-right-down">
          <el-scrollbar>
            <!--        {{suggestions}}-->

            <el-table :data="suggestions">
              <el-table-column v-for="col in cols" :label="col">
                <template #default="scope">
                  <el-icon><star/></el-icon>
                  <span v-if="col!=='artists'" class="ml-2">{{scope.row[col]}}</span>
                  <el-tag v-else v-for="x in scope.row[col]" class="ml-2" type="success">{{x}}</el-tag>
                </template>
              </el-table-column>

              <el-table-column label="play">
                <template #default="scope">
                  <el-button :icon="VideoPlay"
                             @click="()=>{$.refs.player.src=`https://music.163.com/outchain/player?type=2&id=${scope.row['id']}&auto=1&height=66`}">播放</el-button>
                </template>
              </el-table-column>
            </el-table>

          </el-scrollbar>
        </el-container>
      </el-container>
    </el-container>

    <el-footer id="down">
      <iframe ref="player"
              :src="`https://music.163.com/outchain/player?type=2&id=${selected.id}&auto=1&height=66`"></iframe>

    </el-footer>
  </el-container>
</div>
</template>


<script>
import {Setting,House,Aim,OfficeBuilding,Headset,MagicStick,Download,User,Box} from "@element-plus/icons-vue";
import {VideoPlay,VideoPause,VideoCameraFilled,Star,FolderOpened,MostlyCloudy,Message} from "@element-plus/icons-vue";


export default {
  components:{
    Setting,House,Aim,OfficeBuilding,Headset,MagicStick,Download,User,Box,
    VideoPlay,VideoPause,VideoCameraFilled,Star,FolderOpened,MostlyCloudy,Message
  }
  ,data(){
    return{
      aside:[
        {
          title: 'home', icon: House, items: [
            {title: '为我推荐', icon: Aim},
            {title: '云音乐精选', icon: Headset},
            {title: '播客', icon: VideoCameraFilled},
            {title: '私人漫游', icon: MagicStick},
            {title: '社区', icon: OfficeBuilding},
          ]
        },
        {
          title: '我的', icon: User, items: [
            {title: '我喜欢的音乐', icon: Star},
            {title: '最近播放', icon: VideoPlay},
            {title: '我的播客', icon: VideoPause},
            {title: '我的收藏', icon: Star},
            {title: '下载管理', icon: Download},
            {title: '本地音乐', icon: FolderOpened},
            {title: '我的音乐云盘', icon: MostlyCloudy},
          ]
        },
        {
          title: '创建的歌单', icon: Box, albums: [
            {title: '最近播放', icon: Setting},
            {title: '最近播放', icon: Setting},
          ]
        },
        {
          title: '收藏的歌单', icon: Box, albums: [
            {title: '【满级人类】常用歌曲', icon: Setting},
            {title: '蔡徐坤喜欢的歌曲', icon: Setting},
          ]
        },
      ],
      suggestions: null,
      selected: {id: 65766, name: '富士山下'},
      searched: null,
      cols: ['id','name','artists','album','duration']
    }
  },
  methods:{
    async myGet(url, func){
      await fetch(url)
          .then(res => res.json())
          .then(res => func(res))
    },
    async search(str){
      var ret = []
      await this.myGet(`https://www.travisblog.asia/search?keywords=${str}`,(js) => {
        for (var x of js['result']['songs']){
          var artists = []
          for (var y of x['artists']) artists.push(y['name'])
          // var url = null
          // // this.myGet(`https://www.travisblog.asia/song/url?id=${x['id']}`,(js1) => {
          // //   url = js1['data'][0]['url']
          // // }).then(res => {
          // // })
          ret.push({id: x['id'],name: x['name'],artists: artists,album: x['album']['name'],duration: x['duration']})
        }
        console.log(ret)
      })
      this.suggestions = ret
      // console.log(ret)
    },
  },
  async getMusic(id, ret){
    await this.myGet(`https://www.travisblog.asia/song/url?id=${id}`,(js) => {
      ret = js['data'][0]['url']
    })
  },
  mounted() {
    this.search('蔡徐坤')
  }
}
</script>

<style>
#main{
  height: 80%;
  width: 80%;
}
#main,#up,#down,#up-right,#up-right,#up-right-up,#up-right-down{

}
#up{
  height: 80%;
  width: 100%;
}
#down{
  height: 20%;
  width: 100%;
  background-color: #529b2e;
}
#up-left{
  width: 30%;
  background-color: #0c7cd5;
}
#up-right{
  width: 70%;
}
#up-right-up{
  background-color: brown;
}
#up-right-down{
  height: 90%;
  background-color: #b88230;
}
</style>
