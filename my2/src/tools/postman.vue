<script type="module" lang="ts">
import ObjectEditor from './lib/object_editor.vue'
import useClipboard from "vue-clipboard3";
const { toClipboard } = useClipboard();
import {Request } from './models'


export default {
  components: {ObjectEditor},
  props: ['plg', 'obsidian', 'modal'],
  data() {
    return {
      // 请求
      reqs: {
        'default': new Request('http://localhost:8000','GET','','',{'Content-Type': 'application/json'},{}),
        key: 'default'
      },
      ret: '',
      key_tmp: '',
    }
  },
  methods: {
    prt(x: any) { console.log(x) },
    async do_request(req: Request) {
      let ret = null
      // this.prt(5555)
      this.prt(`${req.domain}/${req.path}?${req.query}`)

      await fetch(`${req.domain}/${req.path}?${req.query}`,
          {
            method: req.method,
            headers: req.header,
            body: req.method === 'GET' ? null : JSON.stringify(req.body),
          }
      )
          .then(res => res.json())
          .then(data => console.log(this.ret = JSON.stringify(data, null, '  ')))
    },
    do_reset(){
      this.reqs[this.reqs.key] = new Request('','GET','','',{},{})
    },
    enter(e: KeyboardEvent){
      if (e.keyCode===13) this.do_request(this.reqs[this.reqs.key])
    },
    async reqs_save(){
      await this.plg.loadData().then(async (res: Record<string, any>) => {
        res = Object.assign({}, {requests: this.reqs})
        await this.plg.saveData(res)
      })
    },
    async req_save(key: string = ''){
      if (key === '') key = this.reqs.key

      await this.plg.loadData().then(async (res: Record<string, any>) => {
        res.requests[key] = Object.assign({}, this.reqs[this.reqs.key])
        this.reqs.key = key
        await this.plg.saveData(res)
      })
      await this.reqs_load()
    },
    async req_del(key: string = ''){
      if (key === '') key = this.key_tmp
      await this.reqs_save()

      await this.plg.loadData().then(async (res: Record<string, any>) => {
        if (res.requests[key] !== undefined){
          delete res.requests[key]
          this.reqs.key = Object.keys(res.requests)[0]
        }
        await this.plg.saveData(res)
      })
      await this.reqs_load()
    },
    async reqs_load(){
      await this.plg.loadData().then(async (res: Record<string, any>) => {
        console.log(12324)
        if (res.requests === undefined){
          res['requests'] = {
            default: new Request('https://example.com','GET','','',{'Content-Type': 'application/json'},{}),
            key: 'default'
          }
          this.prt('t1')
          this.prt(res)
          await this.plg.saveData(res)
        }
        if (res.requests.key === undefined || res.requests[res.requests.key] === undefined){
          res.requests['key'] = Object.keys(res.requests)[0]
          this.prt('t2')
          this.prt(res)
          await this.plg.saveData(res)
        }
        this.reqs = Object.assign({}, res.requests)
      })
    }
  },
  setup(){
    return{
      copy: async (text: string)=>{
        try {
          await toClipboard(text);  //实现复制
          console.log("Success");
        } catch (e) {
          console.error(e);
        }
      },
    }
  },
  created() {
    this.reqs_load()
    // this.prt(1145)
    // this.prt({'requests': {}})
    // this.prt({requests: {}})
  }
}
</script>

<template>
  <div id="main" @blur="modal.close">
    <!--    <h1>请求测试工具</h1>-->

    <button @click="reqs_load">reload</button>
    <button @click="reqs_save">save all</button>
    <select v-model="reqs.key" style="width: 85px">
      <option v-for="(v,k,i) in reqs" :value="k" v-show="k!=='key'" >{{k}}</option>
    </select>
    <button @dblclick="req_del(reqs.key)">del</button>
    <input v-model="key_tmp">
    <button @click="req_save(key_tmp)">save</button>
<!--    {{reqs.key}}-->

    <fieldset>
      <legend>request</legend>
      <table>
        <tr>
          <td>domain:</td>
          <td><input v-model="reqs[reqs.key].domain" @keydown="enter"><button @click="reqs[reqs.key].domain=''">clean</button></td>
        </tr>
        <tr>
          <td>path:</td>
          <td><input v-model="reqs[reqs.key].path" @keydown="enter"><button @click="reqs[reqs.key].path=''">clean</button></td>
        </tr>
        <tr>
          <td>query:</td>
          <td><input v-model="reqs[reqs.key].query" @keydown="enter"><button @click="reqs[reqs.key].query=''">clean</button></td>
        </tr>
        <tr>
          <td>method:</td>
          <td style="width: 350px">
            <select v-model="reqs[reqs.key].method">
              <option name="GET" value="GET">GET</option>
              <option name="POST" value="POST">POST</option>
              <option name="PATCH" value="PATCH">PATCH</option>
              <option name="PUT" value="PUT">PUT</option>
              <option name="DELETE" value="DELETE">DELETE</option>
            </select>
          </td>
        </tr>
        <tr>
          <td>headers:</td>
          <td><ObjectEditor v-model="reqs[reqs.key].header"></ObjectEditor></td>
        </tr>
        <tr>
          <td>body:</td>
          <td><ObjectEditor v-model="reqs[reqs.key].body"></ObjectEditor></td>
        </tr>
      </table>
        <button @click="do_request(reqs[reqs.key])">提交</button>
        <button @click="do_reset">重置</button>
        <button @click="modal.close">关闭</button>
        <button @click="req_save()">保存请求</button>
        <button @click="copy(ret)">复制结果</button>
    </fieldset>
<!--    {{this.reqs[this.reqs.key]}}-->

    <fieldset>
      <legend>response</legend>
      <textarea v-model="ret" onclick="this.style.height = this.scrollHeight+'px'"
        style="width: 400px"
      ></textarea>
    </fieldset>
  </div>

</template>

<style scoped>
#main {
  background-color: #f2f2f2;
  text-align: center;
  width: 520px;
  height: 550px;
  overflow: scroll;
}

textarea {
  height: 60px;
}

fieldset {
  width: 95%;
}
</style>
