import { app } from "../../../../main.js";

const hadClass = {};

export class InputCheckboxTag {
    constructor(creatorForUI,t,searchTarget,child,flag) {
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
            creatorForUI.setWith(this.checkbox, child.checked, searchTarget, flag);
        }
        this.element.append(this.checkbox,icon);
        t.append(this.element);
    }

    remove() {
        this.element.remove();
    }
}