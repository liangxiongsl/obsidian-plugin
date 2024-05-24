import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
  // constructor(leaf: WorkspaceLeaf) {
  //   super(leaf);
  // }

  // 获取"逻辑友好"标识符
  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  // 获取"人类友好"标识符
  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h4", { text: "Example view" });
    container.createEl("h3", { text: "jiba" });
  }

  async onClose() {
    // Nothing to clean up.
  }
}

