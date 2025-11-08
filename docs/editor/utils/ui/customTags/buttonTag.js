import { app } from "../../../../main.js";
import { isFunction } from "../../utility.js";
import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { createTag, removeHTMLElementInObject } from "../util.js";

export class ButtonTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        /** @type {HTMLElement} */
        this.element = createTag(t, "div");
        this.element.classList.add("button");
        this.icon = createTag(this.element, "img");
        this.text = createTag(this.element, "div");
        if (child.icon) {
            this.icon.src = app.ui.getImgURLFromImgName(child.icon);
        } else {
            this.icon.style.width = "0px";
        }
        if (child.textContent) {
            this.text.textContent = child.textContent;
        }
        if (isFunction(child.submitFunction)) {
            this.element.addEventListener("click", () => {
                child.submitFunction(searchTarget);
            })
        }
    }
}