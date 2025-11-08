import { CustomTag } from "../customTag.js";
import { createTag, managerForDOMs, removeHTMLElementInObject } from "../util.js";

export class MeterTag extends CustomTag {
    constructor(creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        this.bar = document.createElement("div");
        this.element = createTag(t, "div", {class: "meter"});
        this.bar = createTag(this.element, "div", {class: "meterBar"});

        let valueSource = creatorForUI.getParameter(searchTarget, child.valueSource, 1);
        let maxSource = creatorForUI.getParameter(searchTarget, child.maxSource, 1);
        // 値を関連づけ
        let updateDOMsValue = () => {
            this.bar.style.width = `${valueSource.value / maxSource.value * 100}%`;
        };
        this.dataBlocks = [creatorForUI.setUpdateEventByPath(searchTarget, child.valueSource, updateDOMsValue, flag), creatorForUI.setUpdateEventByPath(searchTarget, child.maxSource, updateDOMsValue, flag)];
        t.append(this.element);
    }
}