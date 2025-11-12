import { isFunction } from "../utility.js";
import { createIcon, createID, createTag, managerForDOMs, removeHTMLElementInObject, setClass } from "./util.js";

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
}

export class CustomTag {
    constructor(isSetLabel = true) {
        this.isSetLabel = isSetLabel;
        this.customTag = true;
        this.isRemoved = false;
        this.dataBlocks = [];
        this.notRemoveList = [];
        this.id = createID();
    }

    remove() {
        if (this.isRemoved) {
            console.trace("すでに削除済みです", this);
        } else {
            // console.trace("削除されました", this);
        }
        for (const key in this) {
            if (!this.notRemoveList.includes(key)) {
                if (this[key] instanceof HTMLElement) {
                    this[key].remove();
                    this[key] = null;
                }
            }
        }
        for (const dataBlock of this.dataBlocks) {
            managerForDOMs.deleteDataBlock(dataBlock);
        }
        this.dataBlocks.length = 0;
        this.children?.forEach(tag => {
            if (isFunction(tag?.remove)) tag.remove()
        });
        this.isRemoved = true;
    }

}