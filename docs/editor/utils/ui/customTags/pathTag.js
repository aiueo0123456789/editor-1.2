import { isFunction } from "../../utility.js";
import { CreatorForUI, ParameterReference } from "../creatorForUI.js";
import { CustomTag } from "../customTag.js";
import { createID, createTag, managerForDOMs, removeHTMLElementInObject } from "../util.js";

export class PathTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,/** @type {HTMLElement}} */t,parent,searchTarget,child,flag) {
        super();
        if (parent instanceof PathTag) { // 親がpathTagの場合特殊
            this.element = parent.element;
            this.parentElement = parent.parentElement;
            this.notRemoveList = ["element", "parentElement"];
        } else {
            this.notRemoveList = ["parentElement"];
            this.parentElement = t;
            this.element = createTag(t, "div", {style: "width: 0px; height: 0px; position: absolute;"})
        };
        this.children = [];
        const myFlag = createID();
        this.isRemoved = false;
        const childrenReset = () => {
            // managerForDOMs.delete({f: myFlag});
            // 関連づけられていない小要素を削除
            for (const childTag of this.children) {
                if (isFunction(childTag.remove)) childTag.remove();
            }
            this.children.length = 0;
            const keep = createTag(null, "div", {style: "width: 0px; height: 0px;"});
            if (child.children) {
                const o = creatorForUI.getParameter(searchTarget, child.sourceObject, 2);
                if (o) {
                    if (isFunction(o)) {
                        this.children = creatorForUI.createFromChildren(keep, this, child.children, {normal: o(), special: {}}, myFlag);
                    } else if (o instanceof ParameterReference) {
                        // console.warn("伝播できません", o)
                        if ("errorChildren" in child) {
                            this.children = creatorForUI.createFromChildren(keep, this, child.errorChildren, {normal: {}, special: {}}, myFlag);
                        }
                    } else {
                        this.children = creatorForUI.createFromChildren(keep, this, child.children, {normal: o, special: {}}, myFlag);
                    }
                }
            }
            for (const childTag of Array.from(keep.children)) {
                this.parentElement.insertBefore(childTag, this.element);
            }
            keep.remove();
        }
        const setUpdateEventTarget = (updateEventTarget) => {
            if (updateEventTarget.path) {
                this.dataBlocks = [creatorForUI.setUpdateEventByPath(searchTarget, updateEventTarget.path, childrenReset, flag)];
            } else { // 文字列に対応
                this.dataBlocks = [managerForDOMs.set({o: updateEventTarget, g: creatorForUI.groupID, f: flag},childrenReset)];
            }
        }
        if (Array.isArray(child.updateEventTarget)) {
            for (const updateEventTarget of child.updateEventTarget) {
                setUpdateEventTarget(updateEventTarget);
            }
        } else {
            setUpdateEventTarget(child.updateEventTarget);
        }
        childrenReset();
    }
}