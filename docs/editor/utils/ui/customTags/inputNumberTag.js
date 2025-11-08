import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { createRange, createTag } from "../util.js";

export class InputNumberTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        this.element;
        if (child?.custom?.visual == "range") {
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
        } else if (child?.custom?.visual == "rangeOnly") {
            /** @type {HTMLElement} */
            this.element = createRange(t, child);
            this.dataBlocks = [creatorForUI.setWith(this.element, child.value, searchTarget, flag, child.useCommand)];
            console.log(child,this)
        } else {
            /** @type {HTMLElement} */
            this.element = createTag(t, "input", {type: "number"});
            this.dataBlocks = [creatorForUI.setWith(this.element, child.value, searchTarget, flag, child.useCommand)];
            if (child.submitEvent) {
                this.element.addEventListener("input", () => {
                    child.submitEvent();
                })
            }
        }
    }
}