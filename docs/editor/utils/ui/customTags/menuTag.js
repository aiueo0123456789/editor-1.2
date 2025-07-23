import { isFunction, looper } from "../../utility.js";
import { createTag, setClass } from "../util.js";

export class MenuTag {
    constructor(t, title, struct, options = {}) {
        this.customTag = true;
        // console.log("セレクトの生成", t, list);
        this.element = createTag(t, "div");
        this.title = createTag(this.element, "p", {textContent: title});
        setClass(this.title, "nowrap");
        // const listContainer = createTag(container,"ul");
        this.element.classList.add("custom-menu");
        this.element.addEventListener("click", (e) => {
            const rect = this.element.getBoundingClientRect();
            const listContainer = document.getElementById("custom-menu-items");
            function removeFn() {
                listContainer.replaceChildren();
                listContainer.classList.add("hidden");
                document.removeEventListener("click", removeFn); // ドキュメントからイベントリスナーを削除
            }
            listContainer.style.left = `${rect.left}px`;
            listContainer.style.top = `${rect.top + 15}px`;
            listContainer.replaceChildren();
            listContainer.classList.remove("hidden");
            const createItemTag = (object, parent, depth) => {
                /** @type {HTMLElement} */
                const li = createTag(parent,"li",{textContent: object.label});
                li.className = "custom-menu-item";
                const children = createTag(li, "ul");
                li.addEventListener("click", (event) => {
                    object.eventFn();
                    event.stopPropagation();
                })
                children.className = "custom-menu-item-submenu";
                return children;
            }
            looper(struct, "children", createItemTag, listContainer);

            document.addEventListener("click", removeFn); // セレクト以外がクリックされたら(ドキュメント)非表示
            e.stopPropagation();
        })
    }

    remove() {
        this.element.remove();
    }
}