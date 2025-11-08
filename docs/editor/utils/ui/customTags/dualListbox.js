import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { createTag, managerForDOMs } from "../util.js";

export class DualListboxTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        /** @type {Array} */
        const availableItems = Array.isArray(child.available) ? child.available : creatorForUI.getParameter(searchTarget, child.available);
        /** @type {Array} */
        const selectedItems = Array.isArray(child.selected) ? child.selected : creatorForUI.getParameter(searchTarget, child.selected);
        this.element = createTag(t, "div", {style: "width: 100%; minHeight: fit-content; display: grid; gridTemplateColumns: 1fr 2px 1fr;"});
        /** @type {HTMLElement} */
        this.availableList = createTag(this.element, "div", {style: "width: 100%; minHeight: 100px; height: fit-content; backgroundColor: var(--inputColor);"});
        /** @type {HTMLElement} */
        this.centerLine = createTag(this.element, "div", {style: "width: 100%; height: 100%;"});
        /** @type {HTMLElement} */
        this.selectedList = createTag(this.element, "div", {style: "width: 100%; minHeight: 100px; height: fit-content; backgroundColor: var(--inputColor);"});

        let tags = new Map();

        const update = () => {
            this.availableList.replaceChildren();
            this.selectedList.replaceChildren();
            for (const item of selectedItems) {
                /** @type {HTMLElement} */
                let li = createTag(this.selectedList, "li", {style: "width: 100%; minHeight: fit-content;"});
                li.addEventListener("click", (e) => {
                    child.deleteEvent(item);
                    update();
                })
                if (tags.has(item)) { // すでにあるか
                    CreatorForUI.tagAppendChildren(li, tags.get(item));
                } else {
                    tags.set(item, creatorForUI.createFromChildren(li, this, child.liStruct, {normal: item, special: {}}, flag));
                }
            }
            for (const item of availableItems) {
                if (!selectedItems.includes(item)) {
                    /** @type {HTMLElement} */
                    let li = createTag(this.availableList, "li", {style: "width: 100%; minHeight: fit-content;"});
                    li.addEventListener("click", (e) => {
                        child.appendEvent(item);
                        update();
                    })
                    if (tags.has(item)) { // すでにあるか
                        CreatorForUI.tagAppendChildren(li, tags.get(item));
                    } else {
                        tags.set(item, creatorForUI.createFromChildren(li, this, child.liStruct,  {normal: item, special: {}}, flag));
                    }
                }
            }
        }
        update();
        this.dataBlocks = [
            managerForDOMs.set({o: availableItems}, update),
            managerForDOMs.set({o: selectedItems}, update)
        ];
    }
}