import { CustomTag } from "../customTags.js";
import { createSection, createTag } from "../util.js";

export class SectionTag extends CustomTag {
    constructor(creatorForUI,t,searchTarget,child,flag) {
        super();
        this.element = createTag(t, "div", {class: child?.options?.min ? "minSection" : "section"});
        this.element.setAttribute("name", child.name);
        this.header = createTag(this.element, "div", {class: "flex"});

        this.label = createTag(this.header, "label");
        this.checkbox = createTag(this.label, "input", {type: "checkbox", checked: true, style: "display: none;"});
        this.span = createTag(this.label, "span", {class: "arrow"});
        this.sectionNameP = createTag(this.header, "p");
        this.sectionNameP.textContent = child.name;

        this.main = createTag(this.element, "div", {class: "section-main"});

        let lastHeight = "fit-content";
        this.checkbox.addEventListener("change", () => {
            if (this.main.classList.contains('close')) {
                // 開く
                this.main.style.height = lastHeight;
            } else {
                // 閉じる
                lastHeight = this.main.scrollHeight + "px";
                this.main.style.height = lastHeight;
                this.main.offsetHeight;
                this.main.style.height = "0px";
            }
            this.main.classList.toggle('close');
        });
        this.main.addEventListener("transitionend", (e) => {
            console.log("transition 終了:", e.propertyName);
            if (!this.main.classList.contains('close')) {
                this.main.style.height = "fit-content";
            }
        });
        this.children = [];
        if (child.children) {
            this.children = creatorForUI.createFromChildren(this.main, child.children, searchTarget, flag);
        }
    }
}