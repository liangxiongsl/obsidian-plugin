import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	EditorSuggest,
	EditorPosition,
	TFile,
	EditorSuggestTriggerInfo,
	Editor,
	EditorSuggestContext,
	ButtonComponent, MarkdownRenderChild
} from 'obsidian';
import {WorkspaceLeaf,ItemView} from 'obsidian'
import {mode_action,action} from 'apis/els'
import {git, repos, git_conf, rest, get_tree_rec, get_tree_items, Node} from 'apis/github-req'
import './my.css'
import {loadOml2d} from 'oh-my-live2d'

// module_settings
type Module = 'default' | 'git' | 'file_manager'
type MySetting = Record<Module, Record<string, any>>

class MyPluginSettingTab extends PluginSettingTab {
	plugin: MyPlugin
	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}
	async display() {
		// console.log('display')
		await this.plugin.render_settings()
	}
}

export default class MyPlugin extends Plugin {
	async onload() {
		console.log('onload')

		// module_pdf_opender
		//@ts-ignore
		this.app.viewRegistry.typeByExtension['pdf'] = ''

		await this.module_settings()

		this.module_remote_file_manager()

		this.module_general_actions()

		await this.module_query_remote_repo()

		this.module_editor_render()

		this.module_code_complement()

		this.module_commands_register()
	}

	onunload() {
		console.log('unload')
	}

	// @设置
	settingTab: MyPluginSettingTab
	settings: MySetting = {
		default: {
			example: "example setting",
		},
		git: {

		},
		file_manager: {
			user: 'liangxiongsl',
			repo: 'obsidian-public'
		}
	}
	async module_settings(){
		await this.read_settings()
		await this.save_settings()
		this.settingTab = new MyPluginSettingTab(this.app, this)
		this.addSettingTab(this.settingTab)
		// console.log(this.settings)
	}
	async read_settings(){
		let local_settings = await this.loadData() || {}
		Object.keys(this.settings).forEach((v: Module)=>{
			this.settings[v] = Object.assign({}, this.settings[v], local_settings[v])
		})
		// console.log(this.settings)
		return this.settings
	}
	async save_settings(){
		await this.saveData(this.settings)
		return this.settings
	}
	async read_setting(module: Module){
		let local_settings = await this.loadData()
		return this.settings[module] = Object.assign({}, this.settings[module], local_settings[module])
	}
	async save_setting(module: Module){
		let local_settings = await this.loadData()
		local_settings[module] = Object.assign({}, local_settings[module], this.settings[module])
		await this.saveData(local_settings)
		return this.settings[module]
	}
	async render_settings(){
		await this.read_setting('default')
		this.settingTab.containerEl.empty()
		new Setting(this.settingTab.containerEl)
			.setName('example setting')
			.setDesc('example description')
			.addText((text) => {
				text.setPlaceholder('example placeholder')
					.setValue(this.settings.default.example)
					.onChange(async (val)=>{
						this.settings.default.example = val
						this.settings.git = {}
						await this.save_setting('default')
					})
			})
	}


	// 格式化当前时间
	cur(){
		const now = new Date()

		const year = now.getFullYear()
		const month = String(now.getMonth() + 1).padStart(2, '0') // getMonth() 返回值为 0-11，因此需要加 1
		const day = String(now.getDate()).padStart(2, '0')

		const hours = String(now.getHours()).padStart(2, '0')
		const minutes = String(now.getMinutes()).padStart(2, '0')
		const seconds = String(now.getSeconds()).padStart(2, '0')

		return {
			file: `${year}${month}${day}${hours}${minutes}${seconds}`,
			commit: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
		}
	}
	async upload_base64(repo: string, path: string, suf: string, base64_str: string, now = {file: '', commit: ''}){
		if (!now.file.length && !now.commit.length){
			now = this.cur()
		}
		let res = await repos.createOrUpdateFileContents({...git_conf,
			repo: repo,
			path: `${path}/${now.file}.${suf}`,
			content: base64_str,
			message: `upload file: ${now.commit}`
		})
		// console.log(res)
		return res.data.content
	}
	async file_to_base64(file: File, cb: (base64_str: string)=>any){
		let reader = new FileReader()
		reader.onload = ()=>{
			//@ts-ignore
			let str = reader?.result?.split(',')[1]
			cb(str)
		}
		reader.readAsDataURL(file)
	}
	async delete_linktext_file (name: string, suf: string){
		let assets_path = await this.app.fileManager.getAvailablePathForAttachment('')
		assets_path = assets_path.substring(0, assets_path.length-2)
		let path = await this.app.fileManager.getAvailablePathForAttachment(`${name}.${suf}`)
		path = path.replace(`${assets_path}/`,'')

		let num = parseInt(path.replace(`${name} `, '').replace(`.${suf}`, ''))
		name = num>=2 ? `${name} ${num-1}` : name
		let f = this.app.vault.getFileByPath(`${assets_path}/${name}.${suf}`)
		console.log(f?.path)
		if (f){
			await this.app.vault.delete(f)
		}
	}
	to_regex(str: string){
		return new RegExp(str.replace(/\//g, '\\/').replace(/\./g, '\\.').replace(/\?/g, '\\?'))
	}
	module_remote_file_manager(){
		let { user: USER, repo: REPO } = this.settings.file_manager
		// console.log(USER, REPO)

		// (2-1) 上传粘贴的文件
		this.registerEvent(this.app.workspace.on('editor-paste', async (e,editor,info)=>{
			let file = e.clipboardData?.files[0]
			// 仅上传第一个文件
			if (file){
				console.log(`uploading ${file.name}`)
				let upload = async (mime_prefix: string, paste_template: string, path = '')=>{
					if (!path.length){
						path = mime_prefix
					}
					if (file?.type.startsWith(mime_prefix)){
						let now = this.cur()
						let spl = file.name.split('.'), suf = spl[spl.length-1]

						// 阻止默认行为
						e.preventDefault()

						let cursor = editor.getCursor()
						let loading_url = `![${now.file}.${suf}#waiting...](https://raw.githubusercontent.com/${USER}/${REPO}/main/loading.png#${file.name})`
						editor.transaction({
							changes: [{text: loading_url, from: cursor}]
						})
						await this.file_to_base64(file, async (base64_str)=>{
							let content = await this.upload_base64(REPO, path, suf, base64_str)
							let paste_str = paste_template
								.replace(/{{now}}/g, now.file)
								.replace(/{{suf}}/g, suf)
								.replace(/{{url}}/g, `${content.download_url}?sha=${content.sha}`)
							// console.log(paste_template, paste_str)

							let cursor_after = editor.getCursor()
							editor.undo()
							editor.transaction({
								changes: [{text: paste_str, from: cursor}]
							})
							// 恢复文件上传完成前一刻的光标位置
							editor.setCursor(cursor_after)
							// 将文件 url 复制到粘贴板中，防止下次重复上传文件
							await navigator.clipboard.writeText(paste_str)

							await this.delete_linktext_file(`Pasted image ${now.file}`, suf)
							if (file){
								await this.delete_linktext_file(file.name.substring(0,file.name.length-suf.length-1), suf)
							}
						})


						return true
					}
					return false
				}
				let ok = await upload('image', '![{{now}}.{{suf}}]({{url}})')
					|| await upload('video', `<video controls width="300"><source src="{{url}}" type="video/mp4" /></video>`)
					|| await upload('audio', '<audio controls="" controlslist="" src="{{url}}"></audio>')
			}
			let type = e.clipboardData?.types[0]
			if (type?.startsWith('text/plain')){
				e.clipboardData?.items[0].getAsString(str=> {
					// console.log(str)
				})
			}
			// console.log(e.clipboardData?.dropEffect)
			// console.log(e.clipboardData?.files)
			// console.log(e.clipboardData?.types)
			// console.log(e.clipboardData?.items)
		}))
		this.registerEvent(this.app.workspace.on('url-menu',(menu, url)=>{
			// menu.setUseNativeMenu(false)

			// (2-2) url 上下文菜单中检索被引用的文件，及被引用的数量
			menu.addItem( (item)=>{
				item.setSection('file-url-manage').setTitle('query url dependencies')
					.onClick(async (e)=>{
						let notice = ''
						let files = this.app.vault.getMarkdownFiles()
						for (let i = 0; i < files.length; i++) {
							let v = files[i]
							let content = await this.app.vault.read(v)
							let regex_url = url.replace('/','\\/').replace('.','\\.').replace('?','\\?')
							let matches = content.match(new RegExp(`\\!\\[[^\\[\\]]*\\]\\(${regex_url}\\)`, 'g'))
							if (matches){
								notice += `${v===this.app.workspace.getActiveFile() ? '$ ' : ''}${v.path} => ${matches.length}\n`
							}
						}
						new Notice(notice)
					})
			})

			// (2-3) url 上下文菜单中删除文件
			// https://raw.githubusercontent.com/liangxiongsl/obsidian-public/main/images/20240604191255.png?sha=ba3da17313769f27c50388207631fc4716a861f5
			let regex = new RegExp(`https:\\/\\/raw\\.githubusercontent\\.com\\/([^\\/]*)\\/([^\/]*)\\/main\\/([^?]*)\\?sha=(\\w{40,40})`, 'g')
			if (url.match(regex)){
				let [user, repo, path, sha] = url.replace(regex, '$1#$2#$3$4').split('#')
				console.log(user, repo, path, sha)
				if (user === USER && repo === REPO){
					menu.addItem((item)=> {
						item.setSection('file-url-manage').setTitle('delete remote image/file').onClick(async (e) => {
							repos.deleteFile({...git_conf, repo, path, sha,
								message: `delete image: ${this.cur().commit}`
							}).then((res: any) => {
								if (!res) return
								console.log(res)
								console.log(`deleted image ${url}`)
								new Notice(`successfully deleted image ${url}`)
							})
						})
					})
				}
			}
		}))

		// (2-4) 删除指定范围文本中的远程附件
		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, info)=>{
			if (editor.somethingSelected()){
				menu.addItem((item)=>
					item.setSection('file-url-manage')
						.setTitle(`delete selected files(${USER}/${REPO})`)
						.onClick((e)=>{
							let str = editor.getSelection()
							let regex = new RegExp(`https:\\/\\/raw\\.githubusercontent\\.com\\/${USER}\\/${REPO}\\/main\\/([^?]*)\\?sha=(\\w{40,40})`, 'g')
							let m = str.match(regex)
							if (m){
								m.forEach((v)=>{
									let [path, sha] = v.replace(regex, '$1#$2').split('#')
									repos.deleteFile({...git_conf, repo: REPO, path, sha,
										message: `delete file: ${this.cur().commit}`
									}).then((res: any)=>{
										if (!res) return
										console.log(res)
										console.log(`deleted file ${path}`)
										new Notice(`successfully deleted file ${path}`)
									})
								})
							}
						})
				)
			}
		}))
	}

	module_general_actions(){
		// 左侧栏 => 暗/亮 模式切换
		let rb = this.addRibbonIcon('', 'example ribbon icon', (e)=> {})
		mode_action(rb.createEl('div'))

		// 状态栏 => 暗/亮 模式切换
		let sb = this.addStatusBarItem()
		mode_action(sb.createEl('div'))
		// 状态栏 => 背景图片切换
		action(sb.createEl('div'))

		// editor actions => 暗/亮 模式切换
		let add_action = ()=>{
			let els = document.getElementsByClassName('view-actions')
			for (let i = 0; i < els.length; i++) {
				let el = els[i]
				let setting_el = el.querySelector('[aria-label="更多选项"]')
				if (setting_el && !el.getElementsByClassName('mode_action').length){
					setting_el.insertAdjacentElement('beforebegin', mode_action(document.createElement('div')))
					// setting_el.insertAdjacentElement('beforebegin', action(document.createElement('div')))
				}
			}
		}
		this.registerEvent(this.app.workspace.on('file-open',()=>add_action()))
		add_action()

		// 重新加载 obsidian
		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, info)=>{
			menu.addItem(item => item.setTitle('reload').onClick(e => location.reload()))
		}))

		// 切换平台
		//@ts-ignore
		this.addRibbonIcon(!this.app.isMobile ? 'toggle-left' : 'toggle-right', 'switch platform', (e)=>this.app.emulateMobile(!this.app.isMobile))
	}

	async module_query_remote_repo(){
		this.registerView('my-view-type', (leaf)=>new MyItemView(leaf, this))

		// this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf)=>{
		// 	// console.log(leaf?.getViewState())
		// }))

		this.addRibbonIcon('github', 'open obsidian-public',async ()=>{
			let l = this.app.workspace.getLeaf(true)
			await l.setViewState({type: 'my-view-type'})
			this.app.workspace.revealLeaf(l)
		})
		let l = this.app.workspace.getLeftLeaf(false)
		await l?.setViewState({type: 'my-view-type'})

		this.register(()=>{
			// console.log(this.app.workspace.getLeavesOfType('my-view-type'))
			this.app.workspace.getLeavesOfType('my-view-type').forEach(v=>v.detach())
			// this.app.workspace.detachLeavesOfType('my-views-type')
		})
	}
	async get_tree_el(repo: string, reflash = false){
		let USER = 'liangxiongsl'
		let REPO = repo


		let nodes = (await this.read_setting('git'))[repo]
		if (!Array.isArray(nodes) || !(nodes as Node[]).push || reflash){
			try {
				nodes = (await get_tree_rec(repo, 'heads/main')).childs
				this.settings.git[repo] = nodes
			}catch (e){
				// this.settings.git[repo] = []
				return createEl('div')
			}
			await this.save_setting('git')
		}
		// console.log(nodes)

		let get_el = async (nodes: Node[])=>{
			let el = createEl('div', {cls: 'tree-item-children nav-folder-children'})
			el.hide()
			el.createEl('div', {attr: {style: 'width: 176px; height: 0.1px; margin-bottom: 0px;'}})

			for (let i = 0; i < nodes.length; i++) {
				let v = nodes[i]
				let arr = v.data.path.split('/'), label = arr[arr.length-1]
				if (v.data.type === 'tree'){
					let dir = el.createEl('span', {cls: 'tree-item nav-folder'})
					let title = dir.createEl('span', {cls: 'tree-item-self is-clickable nav-folder-title'})
					// title.createEl('span').innerHTML = '<div class="tree-item-icon collapse-icon nav-folder-collapse-indicator"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg></div>'
					title.createEl('span', {cls: 'tree-item-inner nav-folder-title-content', text: label, attr: {'data-path': v.data.path}})
					if (v.childs.length > 0){
						let sub = await get_el(v.childs)
						title.onclick = ()=>sub.isShown() ? sub.hide() : sub.show()
						dir.appendChild(sub)
					}
				}
			}
			for (let i = 0; i < nodes.length; i++) {
				let v = nodes[nodes.length-i-1]
				let arr = v.data.path.split('/'), label = arr[arr.length-1]
				if (v.data.type !== 'tree'){
					let file = el.createEl('div', {cls: 'tree-item nav-file'})
					file.createEl('div', {cls: 'tree-item-self is-clickable nav-file-title'})
						.createEl('div', {cls: 'tree-item-inner nav-file-title-content', text: `${label}  (${v.data.size})`, attr: {'data-path': v.data.path}})
						.onclick = ()=>{
							let {path,sha} = v.data
							let spl = path.split('.'), suf = spl[spl.length-1], name = path.replace(`.${suf}`,'')
							let url = `https://raw.githubusercontent.com/${USER}/${REPO}/main/${path}?sha=${sha}`
							let paste = ''
							if (['bmp', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif']
								.contains(suf)){
								paste = `![](${url})`
							}else if (['mp4', 'webm', 'ogv', 'mov', 'mkv']
								.contains(suf)){
								paste = `<video controls width="300"><source src="${url}" type="video/mp4" /></video>`
							}else if (['mp3', 'wav', 'm4a', '3gp', 'flac', 'ogg', 'oga', 'opus']
								.contains(suf)){
								paste = `<audio controls="" controlslist="" src="${url}"></audio>`
							}else{
								paste = url
							}
							navigator.clipboard.writeText(paste)
							new Notice('copied')

							console.log(paste)
						}
					file.createEl('div', {cls: 'tree-item-children'})
				}
			}
			return el
		}

		let root = createEl('div', {cls: 'nav-files-container node-insert-event show-unsupported'})
			.createEl('div', {cls: 'tree-item nav-folder mod-root'})
		let title = root.createEl('div', {cls: 'tree-item-self nav-folder-title'})
			.createEl('div', {cls: 'tree-item-inner nav-folder-title-content'})
		title.createEl('span', {text: repo})
		title.createEl('span', {}, (el)=>{
			el.innerHTML = '&#x1f9fe;'
			// el.onclick = ()=>
		})
		let sub = root.appendChild(await get_el(nodes))
		title.onclick = ()=>sub.isShown() ? sub.hide() : sub.show()
		sub.show()
		return root
	}

	module_editor_render(){

		const ALL_EMOJIS: Record<string, string> = {
			"+1": "👍",
			"sunglasses": "😎",
			"smile": "😄",
		}

		this.registerMarkdownPostProcessor((el, ctx)=>{
			let codeblocks = el.findAll('code')
			// console.log(codeblocks)
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

		let netease_block = (lang: string, type: number, height: number, width = '95%')=>{
			this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx)=>{
				let frame = (id: string | number)=>{
					return createEl('iframe', {cls: 'iframe',attr: {src: `https://music.163.com/outchain/player?type=${type}&id=${id}&&height=${height}`,
							width, height: height+20}})
				}

				let ids = []
				try {
					ids = JSON.parse(source)
				}catch (e){
					el.appendText(`${lang}: parse error`)
				}
				if (Array.isArray(ids)) {
					ids.forEach((v: string | number) => {
						el.appendChild(frame(v))
					})
				}else {
					el.appendText(`${lang}: data is not an string/number array`)
				}
			})
		}
		// 歌单 list
		netease_block('netease-s', 0, 32)
		netease_block('netease-m', 0, 90)
		// netease_block('netease-l', 0, 430)
		netease_block('netease-l', 0, 460)
		netease_block('netease-l-s', 0, 32)
		netease_block('netease-l-m', 0, 90)
		netease_block('netease-l-l', 0, 430)
		// 专辑 album
		netease_block('netease-a-s', 1, 32)
		netease_block('netease-a-m', 1, 90)
		netease_block('netease-a-l', 1, 430)
		// 歌曲 song
		netease_block('netease-s-l', 2, 32)
		netease_block('netease-s-m', 2, 66)

		// let sb = this.addStatusBarItem()
		// sb.appendChild(createEl('iframe', {attr: {src: `https://music.163.com/outchain/player?type=${0}&id=${10146142535}&&height=${32}`,
		// 		width: '300', height: 32+20, }}))
	}

	module_code_complement(){
		let suggest = new MyEditorSuggest(this.app)
		// this.registerEditorSuggest(suggest)
	}

	module_commands_register(){
		this.addCommand({id: 'osv', name: 'open surfing view', callback: ()=>{
				let el = document.querySelector('.workspace-split.mod-vertical.mod-root .workspace-tab-header-new-tab>.clickable-icon[aria-label="新标签页"]')
				//@ts-ignore
				el.click()
			}, hotkeys: [{modifiers: ['Ctrl', 'Shift'], key: 'n'}]})
	}
}

class MyItemView extends ItemView{
	ob: MyPlugin
	constructor(leaf: WorkspaceLeaf, ob: MyPlugin) {
		super(leaf);
		this.ob = ob
	}
	getDisplayText(): string { return "my-view-display"; }
	getViewType(): string {	return "my-view-type"; }


	async onOpen(){
		this.icon = 'book-up'
		// this.app.workspace.revealLeaf(this.leaf)
		let btn = new ButtonComponent(this.contentEl.createEl('div'))
			.setIcon('refresh-ccw')
		btn.buttonEl.style.margin = '0 auto'
		btn.buttonEl.style.display = 'block'
		// btn.setClass('a-circle')
		this.boby = this.contentEl.createEl('div')
		this.boby.appendChild(await this.ob.get_tree_el('obsidian-public', false))
		btn.onClick(async (e)=>await this.update())
	}
	boby: HTMLElement
	async update(){
		let now = await this.ob.get_tree_el('obsidian-public', true)
		this.boby.remove()
		this.boby = this.contentEl.createEl('div')
		this.boby.appendChild(now)
	}
}

class MyEditorSuggest extends EditorSuggest<any>{
	constructor(app: App) {
		super(app);
		this.setInstructions([
			{command: 'ctrl+shit+gaobili', purpose: '搞比利'},
		])
	}

	open() {
		super.open();
	}
	close() {
		super.close();
	}

	from: EditorPosition
	to: EditorPosition
	justClosed: boolean
	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
		if (this.justClosed || !cursor.ch) {
			this.justClosed = false;
			return null;
		}

		let prefix = editor.getLine(cursor.line).substring(0, cursor.ch)
		let match = prefix.match(/@\w*$/)
		// console.log('tri')
		if (match){
			this.from = { line: cursor.line, ch: match.index ?? 0}
			this.to = { line: cursor.line, ch: cursor.ch }
			return {
				start: { line: cursor.line, ch: match.index ?? 0},
				end: cursor,
				query: match[0]
			}
		}
		return null
	}
	getSuggestions(context: EditorSuggestContext): any[] | Promise<any[]> {
		// console.log('sug')

		let ret = []
		for (let i = 0; i < context.query.length; i++) {
			ret.unshift(context.query.substring(0, i+1))
		}
		return ret
	}
	renderSuggestion(value: any, el: HTMLElement) {
		console.log('ren')
		el.setText(value)
	}
	selectSuggestion(value: any, evt: MouseEvent | KeyboardEvent) {
		let editor = this.app.workspace.activeEditor?.editor
		if (editor){
			// console.log(this.from, this.to)
			console.log(value)
			editor.replaceRange(value, this.from, this.to)
		}

		this.close()
		this.justClosed = true
	}
}
