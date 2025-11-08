import { isFunction } from "../../utility.js";
import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { createTag, removeHTMLElementInObject } from "../util.js";

export class BoxTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        this.element = createTag(t, "div");
        this.children = [];
        if (child.children) {
            this.children = creatorForUI.createFromChildren(this.element, this, child.children, searchTarget, flag);
        }
    }
}