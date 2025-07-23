import { isFunction } from "../utility.js";
import { createIcon, createTag, setClass } from "./util.js";

export class SelectTag {
    constructor(t, list = [], options = {}) {
        this.customTag = true;
        // console.log("セレクトの生成", t, list);
        this.element = createTag(t, "div");
        this.input = createTag(this.element, "input", {style: "display: none;"});
        // const listContainer = createTag(container,"ul");
        this.element.classList.add("custom-select");
        const value = createTag(this.element, "p", {textContent: "選択されていません"});
        setClass(value, "nowrap")
        if (options.initValue) {
            value.textContent = options.initValue;
            this.input.value = options.initValue;
        }
        const isOpen = createTag(this.element, "span", {class: "downArrow"});
        this.element.addEventListener("click", (e) => {
            const rect = this.element.getBoundingClientRect();
            const listContainer = document.getElementById("custom-select-items");
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
                if (isFunction(options.submitEvent)) {
                    options.submitEvent(value);
                }
                removeFn();
            }
            for (const item of list) {
                const option = createTag(listContainer, "li");
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
            document.addEventListener("click", removeFn); // セレクト以外がクリックされたら(ドキュメント)非表示
            e.stopPropagation();
        })
    }

    remove() {
        this.element.remove();
    }
}

export class ChecksTag {
    constructor(target, list, options = {}) {
        this.element = createTag(target, "div", {class: "flex"});
        this.checks = [];
        function createCheckbox(target, icon, text) {
            const check = document.createElement("input");
            check.type = "checkbox";
            check.style.display = "none";
            const label = document.createElement("label");
            label.classList.add("box");
            const div = document.createElement("div");
            div.classList.add("radioElement");
            createIcon(div, icon);
            const textNode = document.createTextNode(text);
            div.append(textNode);
            label.append(check,div);
            target.append(label);
            return {label, div, check};
        }
        list.forEach((check, index) => {
            const checkbox = createCheckbox(this.element, check.icon, check.label);
            this.checks.push(checkbox.check);
            if (index == 0) {
                checkbox.div.style.borderTopRightRadius = "0px";
                checkbox.div.style.borderBottomRightRadius = "0px";
            } else if (index == list.length - 1) {
                checkbox.div.style.borderTopLeftRadius = "0px";
                checkbox.div.style.borderBottomLeftRadius = "0px";
            } else {
                checkbox.div.style.borderRadius = "0px";
            }
        })
    }

    remove() {
        this.element.remove();
    }
}