import {
	App,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	Menu,
} from 'obsidian';
import {WorkspaceLeaf,ItemView} from 'obsidian'
import {createApp} from 'vue'
import sfc from './modules/sfc.vue'
import http, {req} from "apis/anki-req";
import {propsToAttrMap} from "@vue/shared";
import {mode_action} from 'apis/els'


// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	example_setting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	example_setting: 'default'
}


export default class MyPlugin extends Plugin {

	async onload() {
		console.log('onload')


		this.settingTab = new MyPluginSettingTab(this.app, this)
		await this.load_settings()

		this.init_menu()

		this.init_modal()

		let rb = this.addRibbonIcon('', 'example ribbon icon', (e)=> {
			new Notice('example ribbon icon')
		})
		mode_action(rb.createEl('div'))
		let sb = this.addStatusBarItem()
		mode_action(sb.createEl('div'))
		let add_action = ()=>{
			let els = document.getElementsByClassName('view-actions')
			for (let i = 0; i < els.length; i++) {
				let el = els[i]
				// if (!el.getElementsByClassName('mode_action').length){
				// 	let action_el = document.createElement('div')
				// 	mode_action(action_el)
				// 	el.insertAdjacentElement('afterbegin', action_el)
				// }
				let setting_el = el.querySelector('[aria-label="更多选项"]')
				if (setting_el && !el.getElementsByClassName('mode_action').length){
					let action_el = document.createElement('div') as HTMLElement
					mode_action(action_el)
					setting_el.insertAdjacentElement('beforebegin', action_el)
				}
			}
		}
		this.registerEvent(this.app.workspace.on('file-open',()=>add_action()))
		add_action()

		new MyNotice((el)=>el.setText('example'))

		this.registerView('my-view-type', (leaf)=>new MyItemView(leaf, this))
		// let leaf = this.app.workspace.getRightLeaf(false)
		// leaf?.setViewState({type: 'my-view-type', state: {hello: 'world'}}).then(()=>leaf)
		this.register(()=>{
			console.log('unload')
			// console.log(this.app.workspace.getLeavesOfType('my-view-type'))
			this.app.workspace.getLeavesOfType('my-view-type').forEach(v=>v.detach())
			// this.app.workspace.detachLeavesOfType('my-views-type')
		})
		let f = this.app.vault.getFileByPath('word.md')
		if (f){
			// let l = this.app.workspace.getLeaf('tab')
			// await l.setViewState({type: 'my-view-type'})
			// this.app.workspace.setActiveLeaf(l)
		}


		// this.app.workspace.getLeavesOfType('my-view-id').forEach((v)=>v.detach())

		// await leaf.setViewState({type: 'my-view-id', active: true})
		// this.app.workspace.revealLeaf(leaf)
		// console.log(this.app.workspace.getLeafById('my-view-id'))


		// let leaf1 = this.app.workspace.createLeafBySplit(leaf, 'horizontal', true)
		// await leaf1.setViewState({type: 'my-view-id', active: true})
		// this.app.workspace.revealLeaf(leaf1)

		// this.app.workspace.iterateRootLeaves((leaf)=>leaf.setGroup('test'))
		// this.app.workspace.iterateAllLeaves((leaf)=>{
		// 	console.log(leaf.getViewState().type)
		// 	leaf.getViewState()
		// })

		this.addCommand({
			id: '',
			name: '',
			editorCallback: (editor, ctx)=>{
				editor.replaceRange(editor.getSelection().toUpperCase(), editor.getCursor('from'), editor.getCursor('to'))
				editor.replaceRange(`[`, editor.getCursor('from'))
				editor.replaceRange(`]`, editor.getCursor('to'))
			}
		})

		const ALL_EMOJIS: Record<string, string> = {
			"+1": "👍",
			"sunglasses": "😎",
			"smile": "😄",
		}

		this.registerMarkdownPostProcessor((el, ctx)=>{
			let codeblocks = el.findAll('code')
			let arr = []
			for (let cb of codeblocks){
				let text = cb.innerText.trim()
				arr.push(cb.innerText)
				cb.replaceWith(cb.createSpan({
					text: ALL_EMOJIS[text] ?? text
				}))
			}
			// console.log(arr)
		})

		// csv 转表格
		this.registerMarkdownCodeBlockProcessor('csv', (source, el, ctx)=>{
			let div = el.createEl('div')
			div.setAttr('style', 'width: 95%')
			let h1 = div.createEl('h1')
			h1.innerText = 'csv'
			h1.setAttr('style', 'text-align: center')

			let table = el.createEl('table')
			let tbody = table.createEl('tbody')

			source.split('\n')
				.filter((row) => row.length>0)
				.forEach((v)=>{
					let tr = tbody.createEl('tr')
					v.split(',').forEach((w)=>{
						tr.createEl('td', {text: w}, (el)=>{
							let c = [0,1,2,3,4,5,6,7,8,9,'a','b','c','d','e']
							let rd = ()=>c[Math.floor(Math.random()*16)]
							el.setAttr('style', `color: #${rd()}${rd()}${rd()}${rd()}${rd()}${rd()}; text-align: center`)
						})
					})
				})
			table.setAttr('style', 'width: 95%')
		})
	}

	onunload() {

	}


	// @设置
	settings: MyPluginSettings;
	settingTab: MyPluginSettingTab;
	async load_settings(){
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())

		this.settingTab.containerEl.empty()
		this.addSettingTab(this.settingTab)

		new Setting(this.settingTab.containerEl)
			.setName('example setting')
			.setDesc('example description')
			.addText((text) => {
				text.setPlaceholder('example placeholder')
					.setValue(this.settings.example_setting)
					.onChange(async (val)=>{
						this.settings.example_setting = val
						await this.saveData(this.settings)
					})
			})
	}

	// @ribbon-上下文菜单
	ribbon_menu: Menu;
	init_menu(){
		this.ribbon_menu = new Menu()
		this.ribbon_menu.addItem((item)=>{
			item.setTitle('example menu item')
				.onClick(()=>new Notice('example menu item'))
		})

		// this.addRibbonIcon('dice', 'example ribbon icon', (e)=>{
		// 	this.ribbon_menu.showAtMouseEvent(e)
		// })

	}

	// @模态
	modal: MyModal;
	init_modal(){
		this.modal = new MyModal(this.app)
		this.modal
			.setTitle('example modal')
			.setContent('example modal content')

		// this.addRibbonIcon('dice', 'example ribbon icon', (e)=>{
		// 	this.modal.open()
		// })
	}
}

class MyPluginSettingTab extends PluginSettingTab {
	plugin: MyPlugin
	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}
	async display() {
		await this.plugin.load_settings()
	}
}
class MyModal extends Modal {
	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}


class MyNotice extends Notice{
	constructor(cb: (el: HTMLElement)=>void, duration?: number) {
		super('', duration)
		cb(this.noticeEl)
	}
}

class MyItemView extends ItemView{
	ob: Plugin
	constructor(leaf: WorkspaceLeaf, ob: Plugin) {
		super(leaf);
		this.ob = ob
	}
	getDisplayText(): string {
		return "my-view-display";
	}
	getViewType(): string {
		return "my-view-type";
	}
	async onOpen(){
		// this.addAction('dice', 'jiba', ()=>0)
		createApp(sfc, {ob: this.ob}).mount(this.contentEl)


		// createApp(sfc, {ob: this.ob}).mount(h.children[2])

		// let tb = document.createElement('table')
		// for (let i = 0; i < 5; i++) {
		// 	let tr = document.createElement('tr')
		// 	for (let j = 0; j < 5; j++) {
		// 		let td = document.createElement('td')
		// 		td.setText(`${i}-${j}`)
		// 		tr.appendChild(td)
		// 	}
		// 	tb.appendChild(tr)
		// }
		// tb.setAttr('border', '1')
		// this.contentEl.append(tb)
	}
}

