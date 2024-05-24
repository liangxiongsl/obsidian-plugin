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
        // cur: new Request('http://localhost:8000','GET','items/123','',{'Content-Type': 'application/json'},
        //     {"item": {"name": "travis", "price": 1023.23, "id_offer": true},
        //       "item1": {"name": "liangxiongsl", "price": 20012.23, "id_offer": true}})
        'default': new Request('http://localhost:8000','GET','','',{'Content-Type': 'application/json'},{}),
        key: 'default'
      },
      ret: '',
    }
  },
  methods: {
    prt(x: any) { console.log(x) },
    async do_request(req: Request) {
      let ret = null
      this.prt(5555)
      this.prt(`${req.domain}/${req.path}?${req.query}`)

      await fetch(`${req.domain}/${req.path}?${req.query}`,
          {
            method: req.method,
            headers: req.header,
            body: req.method === 'GET' ? null : JSON.stringify(req.body),
          }
      )
          .then(res => res.json())
          .then(data => this.prt(ret = data))
      // ret =  JSON.stringify(ret, null, '  ')
      this.prt(ret)
      return ret
    },
    enter(e: KeyboardEvent){
      if (e.keyCode===13) this.ret = this.do_request(this.reqs[this.reqs.key])
    },
    reqs_save(){
      this.plg.loadData().then((res: Record<string, any>) => {
        Object.assign(res, {requests: this.reqs})
        // this.prt(res)
        // this.prt({requests: this.reqs})
        this.plg.saveData(res)
      })
    },
    req_save(){
      const key = this.reqs.key
      const tmp = {requests: {}}
      tmp.requests[key] = this.reqs[key]
      this.plg.loadData().then((res: Record<string, any>) => {
        Object.assign(tmp, res)
      })
      this.plg.saveData(tmp)
    },
    reqs_load(){
      console.log(12324)
      this.plg.loadData().then((res: Record<string, any>) => {
        console.log(res)
        Object.assign(this.reqs, res.requests)
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
  mounted() {
    this.reqs_load()

  }
}
</script>

<template>
  <div id="main" @blur="modal.close">
    <!--    <h1>请求测试工具</h1>-->

    <button @click="reqs_load">reload</button>
    <select v-model="reqs.key">
      <option v-for="(v,k,i) in reqs" :value="k" v-show="k!=='key'">{{k}}</option>
    </select>

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
      <el-button-group>
        <button @click="this.ret = this.do_request(this.reqs[this.reqs.key])">提交</button>
        <button @click="reqs[reqs.key] = new Request('','GET','','',{},{})">重置</button>
        <button @click="modal.close">关闭</button>
        <button @click="req_save">保存请求</button>
        <button @click="copy(ret)">复制结果</button>
      </el-button-group>
    </fieldset>
    {{this.reqs[this.reqs.key]}}


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