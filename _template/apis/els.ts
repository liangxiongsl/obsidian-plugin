// 亮模式/暗模式 切换 action
export const mode_action = (el: HTMLElement, cls: string = 'mode_action')=>{
	if (!document.getElementById('style-mode_action')){
		let css = document.createElement('style')
		let add_css_rule = (rule: string)=>css.appendChild(document.createTextNode(rule))
		add_css_rule(`.theme-light .${cls}:hover{ background-color: #e4e4e4 }`)
		add_css_rule(`.theme-light .${cls}::after{ content: '\\1f31e'; font-size: 16px }`)
		add_css_rule(`.theme-dark .${cls}:hover{ background-color: #363636 }`)
		add_css_rule(`.theme-dark .${cls}::after{ content: '\\1f31b'; font-size: 16px }`)
		css.id = 'style-mode_action'
		document.head.appendChild(css)
	}

	el.addClass(cls)
	el.onclick = ()=>{
		if (document.body.classList.contains('theme-light')){
			document.body.classList.replace('theme-light', 'theme-dark')
		}else {
			document.body.classList.replace('theme-dark', 'theme-light')
		}
	}
}
