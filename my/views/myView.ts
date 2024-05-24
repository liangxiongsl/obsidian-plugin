import {ItemView} from "obsidian"
export class MyView extends ItemView{
	getDisplayText(): string {
		return "my view !!!";
	}
	getViewType(): string {
		return "my_view";
	}
	async onOpen(){
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h1", { text: "my view" });
		container.createEl("h3", { text: "hello world!!!" });
	}
}
