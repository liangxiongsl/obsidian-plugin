import {
	App,
	Editor,
	ItemView, MarkdownEditView,
	MarkdownView,
	Menu,
	MenuItem,
	Modal,
	PluginSettingTab,
	setIcon,
	Setting, TFile,
	View
} from 'obsidian';
import {Notice, Plugin, addIcon, WorkspaceLeaf, moment, Command} from "obsidian";
import {StateEffect,StateField} from "@codemirror/state"


interface MyPluginSettings{
	githubUrl: string
	description: string
	color: string
	level: number
	ok: boolean
	drop: string
	stack: Array<Position>
	pos: number
}
const DEFAULT_SETTINGS: Partial<MyPluginSettings> = {
	githubUrl: "liangxiongsl",
	description: "jiba",
	stack: new Array<Position>(),
	pos: -1
}
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings
	async loadSettings(){
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}
	async saveSettings(){
		await this.saveData(this.settings)
	}

	async onload() {
		await this.loadSettings()
		const setting = new MyPluginSettingTab(this.app, this)
		this.addSettingTab(setting)

		const menu_coder = new EncodeMenu();
		this.addRibbonIcon("file-code","coder",(evt) => {
			menu_coder.showAtMouseEvent(evt)
		})

		const menu_position = new PositionMenu(this)
		this.addRibbonIcon("route", "position recurser", async evt => {
			menu_position.showAtMouseEvent(evt)
		})

		const menu_editor = new EditorMenu(this)
		this.addRibbonIcon("spline", "editor manager", evt => {
			menu_editor.showAtMouseEvent(evt)
		})

	}
}

class EncodeMenu extends Menu{
	a = "view"
	b = "encode"
	c = "decode"
	first = true
	constructor() {
		super();
		this
			.addItem((item) => item.setTitle(this.a).onClick(async () => {
				const text = await navigator.clipboard.readText()
				await navigator.clipboard.writeText(text)
				new Notice(text)
			}))
			.addItem((item) => item.setTitle(this.b).onClick(async () => {
				let text = await navigator.clipboard.readText()
				text = Buffer.from(text).toString("base64")
				await navigator.clipboard.writeText(text)
				console.log(text)
			}))
			.addItem((item) => item.setTitle(this.c).onClick(async () => {
				let text = await navigator.clipboard.readText()
				text = Buffer.from(text, 'base64').toString()
				await navigator.clipboard.writeText(text)
				console.log(text)
			}))
	}
}

class Position{left: number; top: number; description: string}
class PositionMenu extends Menu{
	plugin: MyPlugin

	constructor(plugin: MyPlugin) {
		super();
		this.plugin = plugin

		const locate = () => {
			const { workspace } = this.plugin.app
			const { stack, pos } = this.plugin.settings
			const view = workspace.getActiveViewOfType(MarkdownView)
			if (view){
				const editor = view.editor
				editor.scrollTo(stack[pos].left, stack[pos].top)
			}
		}
		const switch_to = () => {
			new PositionModal(this.plugin.app, this.plugin).open()
		}
		const add_pos = () => {
			const { workspace } = this.plugin.app
			const { stack } = this.plugin.settings
			const view = workspace.getActiveViewOfType(MarkdownView)
			if (view){
				const editor = view.editor
				this.plugin.settings.pos = stack.length
				const position = Object.assign({}, editor.getScrollInfo())
				stack.push(position as Position)
				new Notice(`${stack.length}`)
				stack.forEach(val => new Notice(`${val.left} ${val.top}`))
			}
		}
		const undo = () => {
			const { workspace } = this.plugin.app
			const { stack } = this.plugin.settings
			const view = workspace.getActiveViewOfType(MarkdownView)
			if (view){
				const editor = view.editor
				if (this.plugin.settings.pos > 0){
					-- this.plugin.settings.pos
				}
				new Notice(`${this.plugin.settings.pos} (${stack[this.plugin.settings.pos].left}, ${stack[this.plugin.settings.pos].top})`)
				editor.scrollTo(stack[this.plugin.settings.pos].left, stack[this.plugin.settings.pos].top)
			}
		}
		const redo = () => {
			const { workspace } = this.plugin.app
			const { stack } = this.plugin.settings
			const view = workspace.getActiveViewOfType(MarkdownView)
			if (view){
				const editor = view.editor
				if (this.plugin.settings.pos < stack.length-1){
					++ this.plugin.settings.pos
				}
				new Notice(`${this.plugin.settings.pos} (${stack[this.plugin.settings.pos].left}, ${stack[this.plugin.settings.pos].top})`)
				editor.scrollTo(stack[this.plugin.settings.pos].left, stack[this.plugin.settings.pos].top)
			}
		}


		plugin.settings.pos = this.plugin.settings.stack.length-1
		this
			.addItem(item => item.setTitle("locate").onClick(locate))
			.addItem(item => item.setTitle("switch to ...").onClick(switch_to))
			.addSeparator()
			.addItem(item => item.setTitle("add position").onClick(add_pos))
			.addItem(item => item.setTitle("undo").onClick(undo))
			.addItem(item => item.setTitle("redo").onClick(redo))
		plugin
			.addCommand({id:"switch", name: "switch to ...", callback: switch_to, hotkeys: [{modifiers:["Alt"], key: "d"}]})
	}
}
class PositionModal extends Modal{
	plugin: MyPlugin
	constructor(app: App, plugin: MyPlugin) {
		super(app);
		this.plugin = plugin
	}

	onOpen() {
		const { contentEl } = this
		const { stack, pos } = this.plugin.settings
		const { workspace } = this.plugin.app
		const view = workspace.getActiveViewOfType(MarkdownView)
		if (view){
			const editor = view.editor
			this.plugin.settings.stack.forEach((obj, idx) => new Setting(contentEl).setName(`(${obj.left}, ${Math.floor(obj.top)})`)
				.addText(txt =>{
					txt.setValue(obj.description).onChange(val => obj.description = val)
				})
				.addButton(btn => {
					btn.onClick(eve => {
						this.plugin.settings.stack.remove(obj)
						this.flush()
					}).setButtonText("delete")
				})
				.addButton(btn => {
					btn.onClick(eve => {
						Object.assign(obj, editor.getScrollInfo())
						this.flush()
					}).setButtonText("update")
				})
				.addButton(btn =>{
					btn.onClick(eve => {
						this.plugin.settings.pos = idx
						editor.scrollTo(stack[idx].left, stack[idx].top)
					}).setButtonText("switch")
				})
			)
			new Setting(contentEl)
				.addButton(btn => btn.setButtonText("reload").onClick(async mouse => {await this.plugin.loadSettings(); this.flush()}))
				.addButton(btn => btn.setButtonText("save").onClick(mouse => this.plugin.saveSettings()))
		}
	}
	onClose() {
		const { contentEl } = this
		contentEl.empty()
	}
	flush(){
		this.close()
		this.open()
	}
}

class EditorMenu extends Menu{
	constructor(plugin: MyPlugin) {
		super();
		this
			.addItem(item => item.setTitle("undo").onClick(eve => {
				const { workspace } = plugin.app
				const view = workspace.getActiveViewOfType(MarkdownView)
				if (view){
					const editor = view.editor
					editor.undo()
				}
			}))
			.addItem(item => item.setTitle("redo").onClick(eve => {
				const { workspace } = plugin.app
				const view = workspace.getActiveViewOfType(MarkdownView)
				if (view){
					const editor = view.editor
					editor.redo()
				}
			}))
			.addItem(item => item.setTitle("blur").onClick(eve => {
				const { workspace } = plugin.app
				const view = workspace.getActiveViewOfType(MarkdownView)
				if (view){
					const editor = view.editor
					editor.blur()
				}
			}))
			.addItem(item => item.setTitle("focus").onClick(eve => {
				const { workspace } = plugin.app
				const view = workspace.getActiveViewOfType(MarkdownView)
				if (view){
					const editor = view.editor
					editor.focus()
				}
			}))
	}
}

class MyPluginSettingTab extends PluginSettingTab{
	plugin: MyPlugin

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this
		new Setting(containerEl)
			.setName("github url")
			.addText((text) => {
				text
					.setValue(this.plugin.settings.githubUrl)
					.onChange((value) => this.plugin.settings.githubUrl = value )
			})
			.setDesc("您的url")
		new Setting(containerEl)
			.setName("描述")
			.setDesc("您的描述")
			.addTextArea((text) => { text
				.setValue(this.plugin.settings.description)
				.onChange((value) => this.plugin.settings.description = value )
			})
		new Setting(containerEl)
			.setName("color")
			.setDesc("颜色")
			.addColorPicker((color)=>color
				.setValue(this.plugin.settings.color)
				.onChange(value => this.plugin.settings.color = value)
			)
		new Setting(containerEl)
			.setName("level")
			.setDesc("等级")
			.addSlider(slider => slider
				.setValue(this.plugin.settings.level)
				.onChange(value => this.plugin.settings.level = value)
			)
		new Setting(containerEl)
			.setName("level")
			.setDesc("等级")
			.addProgressBar(bar =>{
				bar.setValue(this.plugin.settings.level)
			})
		new Setting(containerEl)
			.setName("toggle")
			.setDesc("开关")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.ok)
				.onChange(value => this.plugin.settings.ok = value)
			)
		new Setting(containerEl)
			.setName("drop")
			.setDesc("下拉框")
			.addDropdown(drop => drop
				.addOptions({a:"你干嘛", b:"我干嘛", c:"它干嘛？|_・)"})
				.setValue(this.plugin.settings.drop)
				.onChange(value => this.plugin.settings.drop = value)
			)
		new Setting(containerEl)
			.addButton((btn) => btn
				.setButtonText("重新加载")
				.onClick(async (eve) => { this.hide(); await this.plugin.loadSettings(); this.display() } )
			)
			.addButton((btn) => btn
				.setButtonText("保存")
				.onClick(async (eve) => await this.plugin.saveSettings() )
			)

	}
	hide(): void {
		const { containerEl } = this
		containerEl.empty()
	}
}



