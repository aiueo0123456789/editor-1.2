import { CreatorForUI } from "../creatorForUI.js";
import { createTag } from "../util.js";

export class InputTextTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,searchTarget,child,flag) {
        this.element = createTag(t, "input", child.options);
        creatorForUI.setWith(this.element, child.value, searchTarget, flag);
        // if (child.custom && "collision" in child.custom && !child.custom.collision) {
        //     this.element.style.pointerEvents = "none";
        // }
    }

    remove() {
        this.element.remove();
    }
}