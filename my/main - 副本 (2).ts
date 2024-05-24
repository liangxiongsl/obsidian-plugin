import {App, Editor, MarkdownView, Menu, Modal, PluginSettingTab, setIcon, Setting} from 'obsidian';
import {Notice, Plugin, addIcon, WorkspaceLeaf, moment} from "obsidian";
import {MyView} from "./views/myView";
import {keys, values} from "builtin-modules";
import * as worker_threads from "worker_threads";

export default class MyPlugin_lx extends Plugin {

	async onload() {
		addIcon("icon",
			`<polygon points="50,5 20,99 95,39 5,39 80,99" style="fill:lime;stroke:purple;stroke-width:1;fill-rule:evenodd;" />`)

		this.addRibbonIcon("icon","example ribbon", () => { new Notice("你干嘛哈哈诶哟") })
		const st = this.addStatusBarItem();
		st.createEl("span", {text: "🍎"})

		this.addCommand({
			id: "my_command",
			name: "my first command",
			hotkeys: [{modifiers:["Alt"], key: "d"}],
			callback: ()=>{
				new Notice("呵呵s")
				new MyModal1(this.app, (res) => { new Notice(res) }).open()
			}
		})
		this.addCommand({
			id: "my command1",
			name: "display selected text",
			hotkeys: [{modifiers:["Alt"], key: "f"}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const text = editor.getSelection()
				new Notice(text)
				editor.replaceSelection("")
			}
		})
		this.addCommand({
			id: "my command2",
			name: "insert text after cursor",
			hotkeys: [{modifiers:["Alt"], key: "x"}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceRange(
					moment().format("YYYY-MM-DD"),
					editor.getCursor()
				)
			}
		})
		this.addCommand({
			id: "my command3",
			name: "change selected text",
			hotkeys: [{modifiers:["Alt"], key: "c"}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection(`[[${editor.getSelection()}]]`)
			}
		})

		this.addSettingTab(new MyPluginSettingTab(this.app, this))

		this.app.workspace.iterateAllLeaves((leaf) => {
			console.log(leaf.getViewState().type)
		})

		this.addRibbonIcon("twitter", "open menu", (eve) =>{
			const menu = new Menu()
			menu
				.addItem((item) =>
					item
						.setTitle("copy")
						.setIcon("book-open")
						.onClick(()=>{
							new Notice("Copied")
						})
				)
				.addSeparator()
				.addItem((item) =>
					item
						.setTitle("past")
						.setIcon("book-open")
						.onClick(()=>{
							new Notice("pasted")
						})
						.setDisabled(true)
				)
			menu.showAtMouseEvent(eve)
			// menu.showAtPosition({x:20, y:20})
		})


		const {workspace} = this.app
		const view = workspace.getActiveViewOfType(MarkdownView)
		if (view){
			const cursor = view.editor.getCursor()

		}else {
			new Notice("you are not editing!!!")
		}

		const {vault} = this.app
		let len = 0
		vault.getMarkdownFiles().forEach((file) =>{
			vault.process(file, (data) => {
				len += data.length
				return data
			})
		})
		await sleep(2000)
		new Notice(`${len/vault.getMarkdownFiles().length}`)
	}
}

class MyModal extends Modal{
	onOpen() {
		const { contentEl } = this;
		contentEl.setText("look at me, i'm a modal!")
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty()
	}
}

class MyModal1 extends Modal{
	onSubmit: (res: string) => void
	result: string;

	constructor(app:App, onSubmit: (res: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(){
		const { contentEl } = this;
		contentEl.setText("sdsd")

		contentEl.createEl("h1", {text: "what's your name?"})
		new Setting(contentEl)
			.setName("name")
			.addTextArea((text) =>
				text.onChange((value) => {
					this.result = value
				}))

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setIcon('icon')
					.setCta()
					.onClick(() => {
						this.close()
						this.onSubmit(this.result)
					})

			)

		new Setting(contentEl)
			.addColorPicker((color) =>
			color

			)
			.addSlider((sli)=>{console.log(sli.getValue())})
			.addToggle((tg)=>tg)
	}

	onClose() {
		let { contentEl } = this
		contentEl.empty()
	}
}

class MyPluginSettingTab extends PluginSettingTab{
	plugin: MyPlugin_lx

	constructor(app: App, plugin: MyPlugin_lx) {
		super(app,plugin);
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this
		containerEl.createEl("h1", {text: "heading 1"})
	}

	hide(): any {
		const { containerEl } = this
		containerEl.empty()
	}
}

