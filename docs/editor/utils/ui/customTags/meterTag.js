import { createTag } from "../util.js";

export class MeterTag {
    constructor(creatorForUI,t,searchTarget,child,flag) {
        this.bar = document.createElement("div");
        this.element = createTag(t, "div", {class: "meter"});
        this.bar = createTag(this.element, "div", {class: "meterBar"});

        let valueSource = creatorForUI.getParameter(searchTarget, child.valueSource, 1);
        let maxSource = creatorForUI.getParameter(searchTarget, child.maxSource, 1);
        // 値を関連づけ
        let updateDOMsValue = () => {
            this.bar.style.width = `${valueSource.value / maxSource.value * 100}%`;
        };
        creatorForUI.setUpdateEventToParameter(searchTarget, child.valueSource, updateDOMsValue, flag);
        creatorForUI.setUpdateEventToParameter(searchTarget, child.maxSource, updateDOMsValue, flag);
        t.append(this.element);
    }

    remove() {
        this.element.remove();
    }
}