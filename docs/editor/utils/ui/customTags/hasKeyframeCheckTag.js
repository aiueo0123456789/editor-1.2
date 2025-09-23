import { app } from "../../../../main.js";
import { managerForDOMs } from "../util.js";

export class HasKeyframeCheck {
    constructor(this_,t,searchTarget,child,flag) {
        this.checkbox = document.createElement("input");
        this.checkbox.type = "checkbox";
        this.checkbox.style.display = "none";
        this.element = document.createElement("label");
        this.element.setAttribute("name", "checkbox");
        const span = document.createElement("span");
        span.classList.add("hasKeyframeCheck");
        this.element.append(this.checkbox,span);

        const object = this_.getParameter(searchTarget, child.targetObject);
        const update = () => {
            this.checkbox.checked = object.hasKeyFromFrame(app.scene.frame_current, 0.2);
        }
        this.checkbox.addEventListener("click", () => {
            if (object.hasKeyFromFrame(app.scene.frame_current, 0.2)) {
            } else {
                object.insert(app.scene.frame_current, object.targetObject[object.targetValue], 0.2);
            }
        });
        update();
        managerForDOMs.set({o: app.scene, i: "frame_current", f: flag, g: this_.groupID}, null, update);
        managerForDOMs.set({o: object, i: "keys", f: flag, g: this_.groupID}, null, update);
        t.append(this.element);
    }

    remove() {
        this.element.remove();
    }
}