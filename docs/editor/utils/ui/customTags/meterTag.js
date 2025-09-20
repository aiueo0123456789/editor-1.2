import { createTag } from "../util.js";

export class MeterTag {
    constructor(this_,t,searchTarget,child,flag) {
        this.bar = document.createElement("div");
        this.element = createTag(t, "div", {class: "meter"});
        this.bar = createTag(this.element, "div", {class: "meterBar"});

        let valueSource = this_.getParameter(searchTarget, child.valueSource, 1);
        let maxSource = this_.getParameter(searchTarget, child.maxSource, 1);
        // 値を関連づけ
        let updateDOMsValue = () => {
            this.bar.style.width = `${valueSource.value / maxSource.value * 100}%`;
        };
        this_.setUpdateEventToParameter(searchTarget, child.valueSource, updateDOMsValue, flag);
        this_.setUpdateEventToParameter(searchTarget, child.maxSource, updateDOMsValue, flag);
        t.append(this.element);
    }

    remove() {
        this.element.remove();
    }
}