export class Checkbox {
    constructor(this_,t,searchTarget,child,flag) {
        this.checkbox = document.createElement("input");
        this.checkbox.type = "checkbox";
        this.checkbox.style.display = "none";
        this.container = document.createElement("label");
        this.container.setAttribute("name", "checkbox");
        const span = document.createElement("span");
        const type = child.options.look;
        if (type == "eye-icon") { // 表示/非表示
            span.classList.add("eye-icon-container");
            const eye = document.createElement("span");
            eye.classList.add("eye-icon");
            this.container.append(eye);
            const pupil = document.createElement("span");
            pupil.classList.add("eye-icon-pupil");
            span.append(eye, pupil);
        } else {
            if (type == "button-checkbox") {
                const textTag = document.createElement("p");
                textTag.textContent = `${text}`;
                textTag.classList.add("button-checkbox-text");
                span.append(textTag);
            }
            span.classList.add(type);
        }
        this.container.append(this.checkbox,span);
        t.append(this.container);
        if (child.withObject) {
            this_.setWith(this.checkbox, child.withObject, searchTarget, flag);
        }
    }

    remove() {
        this.container.remove();
    }
}