import { isFunction } from "../../utility.js";
import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTags.js";
import { createTag, removeHTMLElementInObject } from "../util.js";

export class BoxTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,searchTarget,child,flag) {
        super();
        this.element = createTag(t, "div");
        this.children = [];
        if (child.children) {
            this.children = creatorForUI.createFromChildren(this.element, child.children, searchTarget, flag);
        }
    }
}