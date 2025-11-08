import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { createTag } from "../util.js";

export class GridBoxTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        this.element = createTag(t, "div");
        this.element.style.display = "grid";
        if (child.axis == "r") {
            this.element.style.gridTemplateRows = child.allocation;
        } else {
            this.element.style.gridTemplateColumns = child.allocation;
        }
        if (child.children) {
            this.children = creatorForUI.createFromChildren(this.element, this, child.children, searchTarget, flag);
        }
    }
}