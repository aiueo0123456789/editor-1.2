import { CustomTag } from "../customTag.js";
import { createTag } from "../util.js";

export class SectionTag extends CustomTag {
    constructor(creatorForUI,t,searchTarget,child,flag) {
        super();
        this.element = createTag(t, "div", {class: child?.options?.min ? "minSection" : "sectionOrPanel"});
        this.element.setAttribute("name", child.name);
        this.header = createTag(this.element, "div", {class: "sectionOrPanel-header"});

        this.arrow = createTag(this.header, "span", {class: "downArrow"});
        this.sectionName = createTag(this.header, "p");
        this.sectionName.textContent = child.name;

        this.mainContainer = createTag(this.element, "div", {class: "sectionOrPanel-mainContainer"});
        this.main = createTag(this.mainContainer, "div", {class: "section-main"});

        let lastHeight = "fit-content";
        this.header.addEventListener("click", () => {
            if (this.mainContainer.classList.contains('close')) {
                // 開く
                this.mainContainer.style.height = lastHeight;
            } else {
                // 閉じる
                lastHeight = this.mainContainer.scrollHeight + "px";
                this.mainContainer.style.height = lastHeight;
                this.mainContainer.offsetHeight;
                this.mainContainer.style.height = "0px";
            }
            this.mainContainer.classList.toggle('close');
            this.arrow.classList.toggle('arrow');
            this.arrow.classList.toggle('downArrow');
        });
        this.mainContainer.addEventListener("transitionend", (e) => {
            console.log("transition 終了:", e.propertyName);
            if (!this.mainContainer.classList.contains('close')) {
                this.mainContainer.style.height = "fit-content";
            }
        });
        this.children = [];
        if (child.children) {
            this.children = creatorForUI.createFromChildren(this.main, child.children, searchTarget, flag);
        }
    }
}