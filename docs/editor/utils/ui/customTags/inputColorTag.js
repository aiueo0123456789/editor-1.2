import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { createTag, managerForDOMs, removeHTMLElementInObject } from "../util.js";

export class InputColorTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        this.element = createTag(t, "input", child.options);
        this.dataBlocks = [creatorForUI.setWith(this.element, child.value, searchTarget, flag)];
        // if (child.custom && "collision" in child.custom && !child.custom.collision) {
        //     this.element.style.pointerEvents = "none";
        // }
    }
}