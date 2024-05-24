import {EditorView, PluginValue, ViewPlugin, ViewUpdate} from "@codemirror/view";

class MyPluginValue implements PluginValue{
	constructor(view: EditorView) {

	}

	update(update: ViewUpdate) {

	}

	destroy() {

	}
}
export const myPlugin = ViewPlugin.fromClass(MyPluginValue)
