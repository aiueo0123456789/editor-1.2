import { CreatorForUI } from "../creatorForUI.js";
import { createTag } from "../util.js";

export class BoxsTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,searchTarget,child,flag) {
        this.element = createTag(t, "div", {class: "boxs"});
        if (child.children) {
            creatorForUI.createFromChildren(this.element, child.children, searchTarget, flag);
        }
    }

    remove() {
        this.element.remove();
    }
}