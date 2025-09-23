import { isFunction } from "../utility.js";
import { createIcon, createTag, setClass } from "./util.js";

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