import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { createTag } from "../util.js";

export class DblClickInput extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,parent,searchTarget,child,flag) {
        super();
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
        this.dataBlocks = [creatorForUI.setWith(this.element, child.value, searchTarget, flag)];
    }
}