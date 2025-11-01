import { app } from "../../../../main.js";
import { isFunction, looper } from "../../utility.js";
import { CustomTag } from "../customTag.js";
import { createTag, removeHTMLElementInObject, setClass } from "../util.js";

export class MenuTag extends CustomTag {
    constructor(t, title, struct, options = {}) {
        super();
        this.customTag = true;
        // console.log("セレクトの生成", t, list);
        this.element = createTag(t, "div");
        this.title = createTag(this.element, "p", {textContent: title});
        setClass(this.title, "nowrap");
        // const listContainer = createTag(container,"ul");
        this.element.classList.add("custom-menu");
        this.element.addEventListener("click", (e) => {
            const rect = this.element.getBoundingClientRect();
            const menuItemsContainer = app.ui.creatorForUI.getDOMFromID("custom-menu-items");
            function removeFn() {
                menuItemsContainer.replaceChildren();
                menuItemsContainer.classList.add("hidden");
                document.removeEventListener("click", removeFn); // ドキュメントからイベントリスナーを削除
            }
            menuItemsContainer.style.left = `${rect.left}px`;
            menuItemsContainer.style.top = `${rect.top + 15}px`;
            menuItemsContainer.replaceChildren();
            menuItemsContainer.classList.remove("hidden");
            const createItemTag = (object, parent, depth) => {
                /** @type {HTMLElement} */
                const li = createTag(parent,"li");
                const container = createTag(li,"div");
                container.className = "custom-menu-itemContainer";
                const img = createTag(container, "img");
                if (object.icon) {
                    img.src = app.ui.getImgURLFromImgName(object.icon);
                } else {
                    img.style.width = "0px";
                }
                const text = createTag(container, "div",{textContent: object.label});
                if (object.type == "file") {
                    const fileInput = createTag(null, "input", {type: "file"});
                    li.addEventListener("click", (event) => {
                        fileInput.click();
                        event.stopPropagation();
                    })
                    fileInput.addEventListener("change", (event) => {
                        object.submitFunction(event);
                    });
                } else {
                    li.addEventListener("click", (event) => {
                        object.submitFunction(event);
                        event.stopPropagation();
                    })
                }
                li.className = "custom-menu-item";
                const children = createTag(li, "ul");
                children.className = "custom-menu-item-submenu";
                return children;
            }
            looper(struct, "children", createItemTag, menuItemsContainer);

            document.addEventListener("click", removeFn); // セレクト以外がクリックされたら(ドキュメント)非表示
            e.stopPropagation();
        })
    }
}