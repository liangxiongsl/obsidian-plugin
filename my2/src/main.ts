/**
 * Import the modules.
 *
 * 导入模块.
 */
import {App, Modal, Plugin, Menu} from "obsidian";
import { SampleSettingTab } from "./tools/setting-tab";

/**
 * The plugin.
 *
 * Make a default export for Obsidian to load the plugin.
 *
 * 插件.
 *
 * 进行默认导出以作为 Obsidian 加载插件的入口.
 */

import {createApp,Component} from "vue";
import {createRouter, createWebHistory, createWebHashHistory, RouteRecordRaw} from "vue-router"
// vue 组件库
import ElementPlus from "element-plus";
import 'element-plus/dist/index.css'
// vue 自定义组件
import Explorer from "./tools/explorer.vue";
import Cxk from "./tools/Cxk.vue";
import Player from "./tools/player.vue";
import Settings from "./tools/SettingTabPage.vue";
import Postman from './tools/postman.vue'
// 自定义接口
interface Tool_cmd{ name: string; cmd: ()=>any; hotkeys: object[] }
interface Tool_component{ name: string; component: Component; hotkeys: object[]; routes: any[] }
export default class SamplePlugin extends Plugin {
    /**
     * This method runs when the plugin is enabled or updated.
     *
     * This is where you will configure most of the capabilities of the plugin.
     *
     * 此方法在插件被激活或更新时触发.
     *
     * 这将是您设置插件大部分功能的地方.
     */
    onload() {
        const app = this.app

        /**
         * Register the plugin setting-tab.
         *
         * 注册插件设置页.
         */
        this.addSettingTab(new SampleSettingTab(this.app, this));
        // const modal_explorer = new Modal_tool(this.app, Explorer)
        // this.add_cmds('tools', 'hammer', [
        //     {name: 'explorer', cmd: ()=>{modal_explorer.open()}, hotkeys: [{modifiers: ['Alt'], key: 'g'}] },
        // ])
        this.add_components('tools', 'hammer', [
            {name: '字符画工具', component: Explorer, hotkeys: [{modifiers: ['Alt'], key: 'g'}], routes: []},
            // {name: '播放器', component: Player, hotkeys: [{modifiers: ['Alt'], key: 'h'}], routes: []},
            {name: 'postman', component: Postman, hotkeys: [{modifiers: ['Alt'], key: 'p'}], routes: []},
        ])
    }
    /**
     * This method runs when the plugin is disabled.
     *
     * Any resources that the plugin is using must be released here to avoid affecting the performance of Obsidian after the plugin has been disabled.
     *
     * 此方法在插件被禁用时触发.
     *
     * 插件所调用的所有资源必须在这里得到释放, 以防止插件被禁用后对 Obsidian 的性能产生影响.
     */
    onunload() {

    }

    //
    addCMD(name: string, cb:()=>any, hotkeys?: any[]){
        this.addCommand({id: name, name, callback: cb, hotkeys: hotkeys})
    }
    /**
     * 添加多个指令和菜单项
     */
    add_cmds(name: string, icon: string, tools: Tool_cmd[]): Menu{
        const menu = new Menu()
        tools.forEach((x)=>{
            menu.addItem((item)=>item.setTitle(x.name).onClick(x.cmd))
            this.addCMD(`lx-${x.name}`, x.cmd, x.hotkeys)
        })
        this.addRibbonIcon(icon, name, (e)=>{
            menu.showAtMouseEvent(e)
        })

        return menu
    }


    /**
     * 添加工具组： ribbon -> context menu <-> command <-> modal <-> vue component
     * @param name ribbon 名
     * @param icon ribbon 图标 id
     * @param tools
     */
    add_components(name: string, icon: string, tools: Tool_component[]): Menu{
        const menu = new Menu()
        const app = this.app
        const plg = this

        tools.forEach((x)=>{
            const modal = new Modal(this.app)
            const vue = createApp(x.component, {plg: plg, obsidian: app, modal: modal})
            vue.use(ElementPlus)
            vue.use(createRouter({
                history: createWebHistory(),
                routes: x.routes
            }))
            vue.mount(modal.containerEl)

            menu.addItem((item)=>item.setTitle(x.name).onClick(()=>{modal.open()}))
            this.addCMD(`lx-${x.name}`, ()=>{modal.open()}, x.hotkeys)
        })
        this.addRibbonIcon(icon, name, (e)=>{
            menu.showAtMouseEvent(e)
        })
        return menu
    }

}

