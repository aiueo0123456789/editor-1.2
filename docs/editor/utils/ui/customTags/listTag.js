import { app } from "../../../../main.js";
import { isFunction } from "../../utility.js";
import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTags.js";
import { ResizerForDOM } from "../resizer.js";
import { createMinButton, createTag, managerForDOMs } from "../util.js";

export class ListTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,searchTarget,child,flag) {
        super(false);
        this.element;
        this.selected = [];
        this.active = null;
        if (child.type == "min") {
            this.listNameTag = createTag(t, "p", {textContent: child.label});
            this.element = createTag(t, "div", {class: "flex", style: "gap: 10px;"});

            this.listContainer = createTag(this.element, "div", {class: "minList", style: "height: 200px;"});
            new ResizerForDOM(this.listContainer, "h", 100, 600);
            /** @type {HTMLElement} */
            this.list = createTag(this.listContainer, "div", {class: "scrollable", style: "padding: 2px; gap: 2px;"});

            // アクション
            if (child.appendEvent || child.deleteEvent) {
                this.actionButtons = createTag(this.element, "div", {style: "width: 20px;"});
                this.appendButton = createMinButton(this.actionButtons, "+");
                this.deleteButton = createMinButton(this.actionButtons, "-");
                // const listOutputData = creatorForUI.createListChildren(this.list, child.liStruct, child.withObject, searchTarget, child.options, flag);
                if (child.appendEvent) {
                    if (isFunction(child.appendEvent)) {
                        this.appendButton.addEventListener("click", child.appendEvent);
                    }
                } else {
                    this.appendButton.classList.add("color2");
                    this.appendButton.style.pointerEvents = "none";
                }
                if (child.deleteEvent) {
                    if (isFunction(child.deleteEvent)) {
                        this.deleteButton.addEventListener("click", () => {
                            console.log("削除", listOutputData)
                            child.deleteEvent(listOutputData.selects);
                        });
                    }
                } else {
                    this.deleteButton.classList.add("color2");
                    this.deleteButton.style.pointerEvents = "none";
                }
            }
        }
        let lastItems = [];
        let tags = new Map();
        let items = creatorForUI.getParameter(searchTarget, child.src);
        this.children = [];
        const itemUpdate = () => {
            this.list.replaceChildren();
            for (const lastItem of lastItems) {
                if (!items.includes(lastItem)) { // 削除
                    for (const tag of tags.get(lastItem)) {
                        tag.remove();
                    }
                    tags.delete(lastItem);
                } else {
                    // CreatorForUI.tagAppendChildren(dummy, [tags.get(lastItem)]);
                }
            }
            for (const item of items) {
                /** @type {HTMLElement} */
                let li = createTag(this.list, "li", {style: "width: 100%; minHeight: fit-content;"});
                if (this.active === item) {
                    li.style.backgroundColor = "var(--activeColor)";
                } else if (this.selected.includes(item)) {
                    li.style.backgroundColor = "var(--selectedColor)";
                }
                li.addEventListener("click", (e) => {
                    if (isFunction(child.activeEvent)) {
                        child.activeEvent(item);
                    }
                    this.active = item;
                    if (isFunction(child.selectEvent)) {
                        child.selectEvent(item, this.selected);
                    }
                    if (!e.shiftKey) {
                        this.selected.length = 0;
                    }
                    this.selected.push(item);
                    itemUpdate();
                })
                if (!lastItems.includes(item)) { // 新規追加
                    tags.set(item, creatorForUI.createFromChildren(li, child.liStruct, item, flag));
                } else {
                    CreatorForUI.tagAppendChildren(li, tags.get(item));
                }
            }
            lastItems = [...items];
        }
        managerForDOMs.set({o: items, g: creatorForUI.groupID}, itemUpdate);
        itemUpdate();
    }
}