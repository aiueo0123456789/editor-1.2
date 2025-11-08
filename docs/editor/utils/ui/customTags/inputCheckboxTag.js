import { app } from "../../../../main.js";
import { CustomTag } from "../customTag.js";
import { managerForDOMs, removeHTMLElementInObject } from "../util.js";

const hadClass = {};

export class InputCheckboxTag extends CustomTag {
    constructor(creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        this.checkbox = document.createElement("input");
        this.checkbox.type = "checkbox";
        this.checkbox.style.display = "none";
        this.element = document.createElement("label");
        this.element.setAttribute("name", "checkbox");
        this.element.classList.add("customCheckbox");
        const imgNames = child.look;
        const className = `customCheckbox-${imgNames.check}-${imgNames.uncheck}`;
        if (!(className in hadClass)) {
            const style = document.createElement("style");
            style.textContent = `
            input[type="checkbox"]:checked + .${className} {
                background-image: url(${app.ui.getImgURLFromImgName(imgNames.check)});
            }
            input[type="checkbox"]:not(:checked) + .${className} {
                background-image: url(${app.ui.getImgURLFromImgName(imgNames.uncheck)});
            }
            `;
            document.head.appendChild(style);
            hadClass[className] = true;
        }
        const icon = document.createElement("span");
        icon.classList.add(className)
        if (child.checked) {
            this.dataBlocks = [creatorForUI.setWith(this.checkbox, child.checked, searchTarget, flag, child.useCommand)];
        }
        this.element.append(this.checkbox,icon);
        t.append(this.element);
    }
}