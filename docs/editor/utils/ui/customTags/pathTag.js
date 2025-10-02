import { isFunction } from "../../utility.js";
import { CreatorForUI, ParameterReference } from "../creatorForUI.js";
import { removeHTMLElemtentInObject } from "../eventUpdator.js";
import { createID, createTag, managerForDOMs } from "../util.js";

export class PathTag {
    constructor(/** @type {CreatorForUI} */creatorForUI,t,searchTarget,child,flag) {
        const elementInsertIndex = t.children.length;
        let children = [];
        const myFlag = createID();
        this.isRemoved = false;
        const childrenReset = () => {
            if (this.isRemoved) {
                console.warn("削除されたパスタグが要素を作成しようとしています")
            }
            managerForDOMs.deleteFlag(myFlag);
            // 関連づけられていない小要素を削除
            for (const childTag of children) {
                childTag?.remove();
                removeHTMLElemtentInObject(childTag);
            }
            children.length = 0;
            const keep = createTag(null, "div");
            if (child.children) {
                const o = creatorForUI.getParameter(searchTarget, child.sourceObject, 2);
                if (o) {
                    if (isFunction(o)) {
                        children = creatorForUI.createFromChildren(keep, child.children, o(), myFlag, true);
                    } else if (o instanceof ParameterReference) {
                        // console.warn("伝播できません", o)
                        if ("errorChildren" in child) {
                            children = creatorForUI.createFromChildren(keep, child.errorChildren, {}, myFlag, true);
                        }
                    } else {
                        children = creatorForUI.createFromChildren(keep, child.children, o, myFlag, true);
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
                creatorForUI.setUpdateEventToParameter(searchTarget, updateEventTarget.path, childrenReset);
            } else { // 文字列に対応
                managerForDOMs.set({o: updateEventTarget, g: creatorForUI.groupID, f: flag},null,childrenReset);
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

    remove() {
        console.log("パスタグが削除されました")
        this.isRemoved = true;
    }
}