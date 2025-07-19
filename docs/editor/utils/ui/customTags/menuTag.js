import { isFunction } from "../../utility.js";
import { createTag, setClass } from "../util.js";

export class MenuTag {
    constructor(t, title, struct, options = {}) {
        this.customTag = true;
        // console.log("セレクトの生成", t, list);
        this.element = createTag(t, "div");
        this.title = createTag(this.element, "p", {textContent: title});
        setClass(this.title, "ellipsis");
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
            for (const item of struct) {
                const option = createTag(listContainer, "li");
                const inner = createTag(option, "p", {textContent: item});
            }
            document.addEventListener("click", removeFn); // セレクト以外がクリックされたら(ドキュメント)非表示
            e.stopPropagation();
        })
    }

    remove() {
        this.element.remove();
    }
}