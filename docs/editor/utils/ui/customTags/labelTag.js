import { CustomTag } from "../customTag.js";
import { createTag } from "../util.js";

export class LabelTag extends CustomTag {
    constructor(/** @type {HTMLElement} */ inner, labelText) {
        super();
        this.element = createTag(inner.parentElement,"div",{class: "label-input"});
        this.label = document.createElement("label");
        this.label.textContent = labelText;
        this.element.append(this.label,inner);
    }
}