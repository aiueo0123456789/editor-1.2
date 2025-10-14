import { CreatorForUI } from "../creatorForUI.js";
import { createTag } from "../util.js";

export class DblClickInput {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,searchTarget,child,flag) {
        this.element = createTag(t, "input");
        this.element.type = "text";
        this.element.classList.add("dblClickInput");
        this.element.setAttribute('readonly', true);
        this.element.addEventListener('dblclick', () => {
            this.element.removeAttribute('readonly');
            this.element.focus();
        });

        this.element.addEventListener('blur', () => {
            this.element.setAttribute('readonly', true);
        });
        creatorForUI.setWith(this.element, child.value, searchTarget, flag);
    }
}