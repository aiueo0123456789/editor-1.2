import { app } from "../../../../main.js";
import { KeyframeInsertInKeyframeCommand } from "../../../commands/animation/keyframeInsert.js";
import { CustomTag } from "../customTag.js";
import { managerForDOMs } from "../util.js";

function update(o,g,others) {
    others.checkbox.checked = others.targetKeyframeBlock.hasKeyFromFrame(app.scene.frame_current, 0.2);
}

export class HasKeyframeCheck extends CustomTag {
    constructor(creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        this.checkbox = document.createElement("input");
        this.checkbox.type = "checkbox";
        this.checkbox.style.display = "none";
        this.element = document.createElement("label");
        this.element.setAttribute("name", "checkbox");
        this.span = document.createElement("span");
        this.span.classList.add("hasKeyframeCheck");
        this.element.append(this.checkbox,this.span);

        this.targetKeyframeBlock = creatorForUI.getParameter(searchTarget, child.src);
        this.checkbox.addEventListener("click", () => {
            if (this.targetKeyframeBlock.hasKeyFromFrame(app.scene.frame_current, 0.2)) {
            } else {
                app.operator.appendCommand(new KeyframeInsertInKeyframeCommand(this.targetKeyframeBlock, app.scene.frame_current, creatorForUI.getParameter(searchTarget, child.value)));
                app.operator.execute();
            }
        });
        update(null,null,{targetKeyframeBlock: this.targetKeyframeBlock, checkbox: this.checkbox});
        this.dataBlocks = [
            managerForDOMs.set({o: app.scene, i: "frame_current", f: flag, g: creatorForUI.groupID}, update, {targetKeyframeBlock: this.targetKeyframeBlock, checkbox: this.checkbox}),
            managerForDOMs.set({o: this.targetKeyframeBlock, i: "keys", f: flag, g: creatorForUI.groupID}, update, {targetKeyframeBlock: this.targetKeyframeBlock, checkbox: this.checkbox})
        ];
        t.append(this.element);
    }
}