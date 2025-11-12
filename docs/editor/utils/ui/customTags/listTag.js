import { app } from "../../../../main.js";
import { isFunction } from "../../utility.js";
import { CreatorForUI } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { ResizerForDOM } from "../resizer.js";
import { createButton, createMinButton, createTag, deepCopy, managerForDOMs } from "../util.js";

export class ListTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,parent,searchTarget,data,flag) {
        super(false);
        this.element;
        this.selected = [];
        this.active = null;
        if (data.type == "min") {
            this.listNameTag = createTag(t, "p", {textContent: data.label});
            this.element = createTag(t, "div", {class: "flex", style: "gap: 10px;"});
            this.listContainer = createTag(this.element, "div", {class: "minList", style: "height: 200px;"});
            new ResizerForDOM(this.listContainer, "h", 100, 600);
            /** @type {HTMLElement} */
            this.list = createTag(this.listContainer, "div", {class: "scrollable", style: "padding: 2px; gap: 2px;"});
            // アクション
            if (data.appendEvent || data.deleteEvent) {
                this.actionBar = createTag(this.element, "div", {style: "width: 20px;"});
                if (data.appendEvent) this.appendButton = createMinButton(this.actionBar, "+");
                if (data.deleteEvent) this.deleteButton = createMinButton(this.actionBar, "-");
            }
        } else if (data.type == "noScroll") {
            this.listNameTag = createTag(t, "p", {textContent: data.label});
            this.element = createTag(t, "div", {style: ""});
            // アクション
            if (data.appendEvent || data.deleteEvent) {
                this.actionBar = createTag(this.element, "div", {style: "display: flex; height: 20px;"});
                if (data.appendEvent) this.appendButton = createButton(this.actionBar, null, "新しい値を追加");
                if (data.deleteEvent) this.deleteButton = createMinButton(this.actionBar, "-");
            }

            this.listContainer = createTag(this.element, "div", {style: "height: fit-content;"});
            /** @type {HTMLElement} */
            this.list = createTag(this.listContainer, "div", {style: "height: fit-content;"});
            this.listContainer.append(this.appendButton);
        } else {
            this.listNameTag = createTag(t, "p", {textContent: data.label});
            this.element = createTag(t, "div", {style: ""});
            // アクション
            if (data.appendEvent || data.deleteEvent) {
                this.actionBar = createTag(this.element, "div", {style: "display: flex; height: 20px;"});
                if (data.appendEvent) this.appendButton = createMinButton(this.actionBar, "+");
                if (data.deleteEvent) this.deleteButton = createMinButton(this.actionBar, "-");
            }

            this.listContainer = createTag(this.element, "div", {style: "height: 200px;"});
            /** @type {HTMLElement} */
            this.list = createTag(this.listContainer, "div", {class: "scrollable", style: "padding: 2px; gap: 2px;"});
        }

        if (data.appendEvent) {
            if (isFunction(data.appendEvent)) {
                this.appendButton.addEventListener("click", () => {
                    data.appendEvent(searchTarget);
                });
            }
        }
        if (data.deleteEvent) {
            if (isFunction(data.deleteEvent)) {
                this.deleteButton.addEventListener("click", () => {
                    data.deleteEvent(this.selected);
                });
            }
        }

        let lastItems = [];
        let tags = new Map();
        let items = creatorForUI.getParameter(searchTarget, data.src);
        this.children = [];
        const isPrimitive = data.isPrimitive;
        const listUpdate = () => {
            if (isPrimitive && items.length === lastItems.length) return ;
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
            items.forEach((item, index) => {
                /** @type {HTMLElement} */
                let li = createTag(this.list, "li", {style: "width: 100%; minHeight: fit-content;"});
                if (isPrimitive) {
                    if (this.active === index) {
                        li.style.backgroundColor = "var(--activeColor)";
                    } else if (this.selected.includes(index)) {
                        li.style.backgroundColor = "var(--selectedColor)";
                    }
                } else {
                    if (this.active === item) {
                        li.style.backgroundColor = "var(--activeColor)";
                    } else if (this.selected.includes(item)) {
                        li.style.backgroundColor = "var(--selectedColor)";
                    }
                }
                if (!data.notUseActiveAndSelect) {
                    li.addEventListener("click", (e) => {
                        if (isFunction(data.activeEvent)) {
                            if (isPrimitive) {
                                data.activeEvent(index);
                            } else {
                                data.activeEvent(item);
                            }
                        }
                        this.active = item;
                        if (isFunction(data.selectEvent)) {
                            if (isPrimitive) {
                                data.selectEvent(index, this.selected);
                            } else {
                                data.selectEvent(item, this.selected);
                            }
                        }
                        if (!e.shiftKey) {
                            this.selected.length = 0;
                        }
                        if (isPrimitive) {
                            this.selected.push(index);
                        } else {
                            this.selected.push(item);
                        }
                        listUpdate();
                    })
                }
                let child = [];
                if (isPrimitive) {
                    if (!lastItems.includes(item)) { // 新規追加
                        child = creatorForUI.createFromChildren(li, this, data.liStruct, {normal: items, special: {index: index, list: items, searchTarget: searchTarget}}, flag);
                        tags.set(index, child);
                    } else {
                        CreatorForUI.tagAppendChildren(li, tags.get(index));
                    }
                } else {
                    if (!lastItems.includes(item)) { // 新規追加
                        child = creatorForUI.createFromChildren(li, this, data.liStruct, {normal: item, special: {index: index, list: items, searchTarget: searchTarget}}, flag);
                        tags.set(item, child);
                    } else {
                        CreatorForUI.tagAppendChildren(li, tags.get(item));
                    }
                }
                this.children.push(...child);
            });
            lastItems = [...items];
        }
        this.dataBlocks = [managerForDOMs.set({o: items, g: creatorForUI.groupID}, listUpdate)];
        listUpdate();
    }
}