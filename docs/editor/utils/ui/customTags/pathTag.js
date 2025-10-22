import { isFunction } from "../../utility.js";
import { CreatorForUI, ParameterReference } from "../creatorForUI.js";
import { CustomTag } from "../customTags.js";
import { createID, createTag, managerForDOMs, removeHTMLElementInObject } from "../util.js";

export class PathTag extends CustomTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,searchTarget,child,flag) {
        super();
        const elementInsertIndex = t.children.length;
        this.children = [];
        const myFlag = createID();
        this.isRemoved = false;
        const childrenReset = () => {
            // managerForDOMs.delete({f: myFlag});
            console.log(child);
            console.log([...this.children]);
            // 関連づけられていない小要素を削除
            for (const childTag of this.children) {
                if (isFunction(childTag.remove)) {
                    childTag.remove();
                }
                removeHTMLElementInObject(childTag);
            }
            this.children.length = 0;
            const keep = createTag(null, "div");
            if (child.children) {
                const o = creatorForUI.getParameter(searchTarget, child.sourceObject, 2);
                console.log(searchTarget, child.sourceObject,o);
                if (o) {
                    if (isFunction(o)) {
                        this.children = creatorForUI.createFromChildren(keep, child.children, o(), myFlag);
                    } else if (o instanceof ParameterReference) {
                        // console.warn("伝播できません", o)
                        if ("errorChildren" in child) {
                            this.children = creatorForUI.createFromChildren(keep, child.errorChildren, {}, myFlag);
                        }
                    } else {
                        this.children = creatorForUI.createFromChildren(keep, child.children, o, myFlag);
                    }
                }
                // console.log();
            }
            for (const childTag of Array.from(keep.children).reverse()) {
                t.insertBefore(childTag, t.children[elementInsertIndex]);
            }
            keep.remove();
        }
        const setUpdateEventTarget = (updateEventTarget) => {
            if (updateEventTarget.path) {
                creatorForUI.setUpdateEventByPath(searchTarget, updateEventTarget.path, childrenReset, flag);
            } else { // 文字列に対応
                managerForDOMs.set({o: updateEventTarget, g: creatorForUI.groupID, f: flag},childrenReset);
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