import { Application } from "../app/app.js";
import { CreatorForUI } from "../utils/ui/creatorForUI.js";
import { createTag } from "../utils/ui/util.js";
import { looper } from "../utils/utility.js";

export class ContextmenuOperator {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.creator = new CreatorForUI();
        /** @type {HTMLElement} */
        this.dom = document.getElementById("contextmenu");
    }

    showContextmenu(position) {
        const area = this.app.activeArea;
        const mode = this.app.appConfig.areasConfig[area.type].mode;
        const menuItems = this.app.appConfig.getContextmenuItems(area.type, mode);
        this.dom.replaceChildren();
        const createItemTag = (object, parent, depth) => {
            /** @type {HTMLElement} */
            const li = createTag(parent,"li",{textContent: object.label});
            li.className = "menu";
            const children = createTag(li, "ul");
            li.addEventListener("click", (event) => {
                object.eventFn();
                event.stopPropagation();
            })
            children.className = "submenu";
            return children;
        }
        looper(menuItems, "children", createItemTag, this.dom);
        this.dom.style.left = `${position[0]}px`;
        this.dom.style.top = `${position[1]}px`;
        this.dom.classList.remove("hidden");

        const hiddenFn = (event) => {
            // コンテキストメニュー以外がクリックされたら非表示
            if (!this.dom.contains(event.target)) {
                this.dom.classList.add('hidden');
                document.removeEventListener("click", hiddenFn); // ドキュメントからイベントリスナーを削除
            }
        }

        document.addEventListener('click', hiddenFn);
    }

    handlemenuSelection(selectedItem) {
        if (selectedItem && selectedItem.action) {
            this.app.operators.execute(selectedItem.action);
        }
    }
}