import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from 'obsidian';
import {WorkspaceLeaf,ItemView} from 'obsidian'
import {mode_action,action} from 'apis/els'
import {git,repos} from 'apis/github-req'
import {isNumericLiteral} from "tsutils";
import {normalize} from 'path'
import {exec} from 'child_process'
import {render} from "vue";
import {context} from "esbuild";
import {sub} from "./editor";

// module_settings
type Module = 'default'
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

		this.module_remote_file_manager()

		// module_pdf_opender
		//@ts-ignore
		this.app.viewRegistry.typeByExtension['pdf'] = ''

		await this.module_settings()

		this.module_general_actions()

		this.module_query_remote_repo()

		this.module_editor_render()
	}

	onunload() {

	}

	git_conf = {
		owner: 'liangxiongsl',
		author: {name: 'liangxiongsl', email: '1506218507@qq.com'},
		committer: {name: 'liangxiongsl', email: '1506218507@qq.com'}
	}
	module_remote_file_manager(){
		// 格式化当前时间
		let cur=() =>{
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
		// (2-1) 上传粘贴的文件
		this.registerEvent(this.app.workspace.on('editor-paste', async (e,editor,info)=>{
			// mime-suffix => dir
			let map = {
				'image': 'images',
				'application/pdf': 'pdfs'
			}
			let files = e.clipboardData?.files || []
			// 仅上传第一个文件
			for (let i = 0; i < files?.length && i<1; i++) {
				let file = files[i]
				console.log(`uploading ${file.name}`)
				for (let [k,v] of Object.entries(map)){
					if (file?.type.startsWith(k)){
						let now = cur()
						let suf = file?.name.split('.')[file?.name.split('.').length-1]
						let upload = async (str: string)=>{
							let res = await repos.createOrUpdateFileContents({...this.git_conf,
								repo: 'obsidian-public',
								path: `${v}/${now.file}.${suf}`,
								content: str,
								message: `upload file: ${now.commit}`
							})
							console.log(res)
							return res.data.content
						}
						let delete_local_file = async ()=>{
							let name = `Pasted image ${now.file}.${suf}`
							let f = this.app.metadataCache.getFirstLinkpathDest(name, '')
							if (f){
								let assets_path = await this.app.fileManager.getAvailablePathForAttachment('')
								assets_path = assets_path.substring(0,assets_path.length-2)
								if (f.parent?.path === assets_path){
									// console.log(f.stat)
									await this.app.vault.delete(f)
								}
							}
						}
						let replace = (pre: string, now: string)=>{
							editor.setValue(editor.getValue().replace(pre,now))
						}

						let reader = new FileReader()
						let cursor = editor.getCursor()
						reader.onload = async function (){
							//@ts-ignore
							let str = reader?.result?.split(',')[1]

							let loading_url = `![${now.file}.${suf}#waiting...](https://raw.githubusercontent.com/liangxiongsl/obsidian-public/main/loading.png)`
							editor.transaction({
								changes: [{text: loading_url, from: cursor}]
							})
							let content = await upload(str)
							let md_url = `![${now.file}.${suf}|300](${content.download_url}?sha=${content.sha})`

							let cursor_after = editor.getCursor()
							editor.undo()
							editor.transaction({
								changes: [{text: md_url, from: cursor}]
							})
							// 恢复文件上传完成前一刻的光标位置
							editor.setCursor(cursor_after)
							// 将文件 url 复制到粘贴板中，防止下次重复上传文件
							await navigator.clipboard.writeText(md_url)

							await delete_local_file()
						}
						reader.readAsDataURL(file)
					}
				}
				// 阻止默认的粘贴行为（如：obsidian 粘贴 [[wiki-path.png]] ）
				e.preventDefault()
			}
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
			let {origin, pathname, searchParams} = new URL(url)
			if (origin==='https://raw.githubusercontent.com' && pathname.startsWith('/liangxiongsl/obsidian-public/main/images')){
				menu.addItem((item)=>{
					item.setSection('file-url-manage').setTitle('delete remote image/file').onClick(async (e)=>{
						let res = await repos.deleteFile({...this.git_conf,
							repo: 'obsidian-public',
							// 将 '/user/repo/branch/' 替换为 ''
							path: pathname.replace(/^\/[^\/]*\/[^\/]*\/[^\/]*\//, ''),
							message: `delete image: ${cur().commit}`,
							sha: searchParams.get('sha')
						})

						console.log(res)
						console.log(`deleted image ${url}`)
						new Notice(`deleted image ${url}`)
					})
				})
			}
		}))
	}


	// @设置
	settingTab: MyPluginSettingTab
	settings: MySetting = {
		default: {
			example: "example setting",
		}
	}

	async module_settings(){
		await this.read_settings()
		await this.save_settings()
		this.settingTab = new MyPluginSettingTab(this.app, this)
		this.addSettingTab(this.settingTab)
		console.log(this.settings)
	}
	async read_settings(){
		let local_settings = await this.loadData()
		this.settings.default = Object.assign({}, this.settings.default, local_settings.default)
		return this.settings
	}
	async save_settings(){
		await this.saveData(this.settings)
		return this.settings
	}
	async render_settings(){
		await this.read_settings()
		this.settingTab.containerEl.empty()
		new Setting(this.settingTab.containerEl)
			.setName('example setting')
			.setDesc('example description')
			.addText((text) => {
				text.setPlaceholder('example placeholder')
					.setValue(this.settings.default.example)
					.onChange(async (val)=>{
						this.settings.default.example = val
						await this.save_settings()
					})
			})
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
	}

	module_query_remote_repo(){
		this.registerView('my-view-type', (leaf)=>new MyItemView(leaf, this))

		this.addRibbonIcon('github', 'open obsidian-public',async ()=>{
			let l = this.app.workspace.getLeaf(true)
			await l.setViewState({type: 'my-view-type', state: {hello: 'world'}})
			// this.app.workspace.revealLeaf(l)
		})
		// let l = this.app.workspace.getLeaf(true)
		// await l.setViewState({type: 'my-view-type', state: {}})
		// this.app.workspace.revealLeaf(l)

		this.register(()=>{
			console.log('unload')
			// console.log(this.app.workspace.getLeavesOfType('my-view-type'))
			this.app.workspace.getLeavesOfType('my-view-type').forEach(v=>v.detach())
			// this.app.workspace.detachLeavesOfType('my-views-type')
		})
	}

	module_editor_render(){

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
}


interface Content{
	download_url: string,
	git_url: string,
	html_url: string,
	name: string,
	path: string,
	sha: string,
	size: number,
	type: string,
	url: string,
	_links: {git: string, html: string, self: string},
	childs?: Content[]
}

class MyItemView extends ItemView{
	ob: MyPlugin
	constructor(leaf: WorkspaceLeaf, ob: MyPlugin) {
		super(leaf);
		this.ob = ob
	}
	getDisplayText(): string { return "my-view-display"; }
	getViewType(): string {	return "my-view-type"; }


	async get_repo(repo: string){
		let get = async (path: string)=>{
			let ret: Content[] = []
			let res: Content[] = (await git.repos.getContent({...this.ob.git_conf, repo, path: path})).data
			res.forEach(async(v)=>{
				if (v.type === 'dir'){
					ret.push({...v, childs: await get(v.path)})
				}
			})
			res.forEach(async(v)=>{
				if (v.type === 'file'){
					ret.push(v)
				}
			})
			return ret
		}
		let ret = await get('')
		// console.log(ret)
		return ret
	}

	async get_repo_el(file_or_dirs: Content[], repo: string){
		let get_el = async (file_or_dirs: Content[])=>{
			let el = createEl('div', {cls: 'tree-item-children nav-folder-children'})
			el.hide()
			el.createEl('div', {attr: {style: 'width: 176px; height: 0.1px; margin-bottom: 0px;'}})

			file_or_dirs.forEach(async(v)=>{
				if (v.type === 'dir'){
					let dir = el.createEl('div', {cls: 'tree-item nav-folder'})
					let title = dir.createEl('span', {cls: 'tree-item-self is-clickable nav-folder-title'})
					// title.createEl('div').innerHTML = '<div class="tree-item-icon collapse-icon nav-folder-collapse-indicator"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg></div>'
					title.createEl('span', {cls: 'tree-item-inner nav-folder-title-content', text: v.name, attr: {'data-path': v.path}})
					if (v.childs){
						let sub = await get_el(v.childs)
						title.onclick = ()=>sub.isShown() ? sub.hide() : sub.show()
						dir.appendChild(sub)
					}
				}
			})
			file_or_dirs.forEach(async(v)=>{
				if (v.type === 'file'){
					let file = el.createEl('div', {cls: 'tree-item nav-file'})
					file.createEl('div', {cls: 'tree-item-self is-clickable nav-file-title'})
						.createEl('div', {cls: 'tree-item-inner nav-file-title-content', text: v.name, attr: {'data-path': v.path}})
					file.createEl('div', {cls: 'tree-item-children'})
				}
			})
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
		let sub = root.appendChild(await get_el(file_or_dirs))
		title.onclick = ()=>sub.isShown() ? sub.hide() : sub.show()
		return root
	}

	// repos_key = ['obsidian-public']
	// repos_el: { [repo: string]: HTMLElement } = {}

	async onOpen(){
		this.icon = 'book-up'
		let data = await this.ob.loadData() ?? {}
		if (data['obsidian-public']){
			this.contentEl.appendChild(await this.get_repo_el(data['obsidian-public'], 'obsidian-public'))
		}else {
			let file_or_dirs = await this.get_repo('obsidian-public')
			// console.log(file_or_dirs)
			await this.ob.saveData({'obsidian-public': file_or_dirs})
			let el = await this.get_repo_el(file_or_dirs, 'obsidian-public')
			this.contentEl.appendChild(el)
		}
	}
}

