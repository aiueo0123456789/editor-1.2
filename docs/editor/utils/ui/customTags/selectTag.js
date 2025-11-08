import { app } from "../../../../main.js";
import { isFunction, isPlainObject, IsString } from "../../utility.js";
import { CustomTag } from "../customTag.js";
import { createIcon, createTag, managerForDOMs, removeHTMLElementInObject, setClass } from "../util.js";

export class SelectTag extends CustomTag {
    constructor(creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        this.customTag = true;
        this.element = createTag(t, "div");
        this.input = createTag(this.element, "input", {style: "display: none;"});
        if (!isFunction(child.value)) {
            creatorForUI.setWith(this.input, child.value, searchTarget, flag, child.useCommand);
        }
        this.element.classList.add("custom-select");
        let initValue = "選択されていません";
        const value = createTag(this.element, "p");
        setClass(value, "nowrap")
        if (child.options.initValue) {
            if (child.options.initValue.path) {
                initValue = creatorForUI.getParameter(searchTarget, child.options.initValue.path);
            } else {
                initValue = child.options.initValue;
            }
        }
        value.textContent = initValue;
        this.input.value = initValue;
        const isOpen = createTag(this.element, "span", {class: "downArrow"});
        this.element.addEventListener("click", (e) => {
            let items;
            if (IsString(child.sourceObject)) {
                items = creatorForUI.getParameter(searchTarget, child.sourceObject);
            } else if (Array.isArray(child.sourceObject)) {
                items = child.sourceObject;
            } else if (isFunction(child.sourceObject)) {
                items = child.sourceObject();
            }
            const rect = this.element.getBoundingClientRect();
            const listContainer = app.ui.creatorForUI.getDOMFromID("custom-select-items");
            listContainer.style.minWidth = `${rect.width}px`;
            listContainer.style.left = `${rect.left}px`;
            listContainer.style.top = `${rect.top + 15}px`;
            listContainer.replaceChildren();
            listContainer.classList.remove("hidden");
            function removeFn() {
                listContainer.replaceChildren();
                listContainer.classList.add("hidden");
                document.removeEventListener("click", removeFn); // ドキュメントからイベントリスナーを削除
            }
            function submit(value) {
                if (isFunction(child.value)) {
                    child.value(value);
                }
                removeFn();
            }
            for (const item of items) {
                const option = createTag(listContainer, "li");
                if (isPlainObject(item)) {
                    const inner = createTag(option, "p", {textContent: item.name});
                    if (value.textContent == item) {
                        option.classList.add("active");
                    }
                    option.addEventListener("click", () => {
                        this.input.value = item.id;
                        // change イベントを手動で発火させる
                        this.input.dispatchEvent(new Event("input", { bubbles: true }));
                        value.textContent = item.name;
                        submit(item.id);
                    })
                } else {
                    const inner = createTag(option, "p", {textContent: item});
                    if (value.textContent == item) {
                        option.classList.add("active");
                    }
                    option.addEventListener("click", () => {
                        this.input.value = item;
                        // change イベントを手動で発火させる
                        this.input.dispatchEvent(new Event("input", { bubbles: true }));
                        value.textContent = item;
                        submit(item);
                    })
                }
            }
            document.addEventListener("click", removeFn); // セレクト以外がクリックされたら(ドキュメント)非表示
            e.stopPropagation();
        })
    }
}