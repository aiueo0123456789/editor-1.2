import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTags.js";
import { createRange, createTag, managerForDOMs, removeHTMLElementInObject } from "../util.js";

export class InputNumberTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,searchTarget,child,flag) {
        super();
        this.element;
        if (child.custom?.visual) {
            this.element = createTag(t, "input", {type: "number"});
            this.dataBlocks = [creatorForUI.setWith(this.element, child.value, searchTarget, flag, child.useCommand)];
        } else {
            this.element = createTag(t, "div");
            this.element.style.width = "100%";
            this.element.style.display = "grid";
            this.element.style.gridTemplateColumns = "1fr 50px";
            /** @type {HTMLElement} */
            const range = createRange(this.element, child);
            range.style.gridColumn = "1/2";
            range.style.borderTopRightRadius = "0px";
            range.style.borderBottomRightRadius = "0px";
            /** @type {HTMLElement} */
            const number = createTag(this.element, "input", {type: "number"});
            number.style.gridColumn = "2/3";
            number.style.borderTopLeftRadius = "0px";
            number.style.borderBottomLeftRadius = "0px";
            this.dataBlocks = [creatorForUI.setWith(range, child.value, searchTarget, flag, child.useCommand), creatorForUI.setWith(number, child.value, searchTarget, flag, child.useCommand)];
        }
    }
}