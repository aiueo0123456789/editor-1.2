import { CustomTag } from "../customTag.js";

export class CanvasTag extends CustomTag {
    constructor(creatorForUI,t,parent,searchTarget,child,flag) {
        super();
        this.element = document.createElement("div");
        this.element.style.width = "100%";
        this.element.style.height = "100%";
        t.append(this.element);
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.backgroundColor = child.color ? child.color : "rgba(0, 0, 0, 0)";
        this.element.append(this.canvas);
        const update = () => {
            child.draw(this.canvas, searchTarget);
            requestAnimationFrame(update);
        }
        child.init(this.canvas, searchTarget);
        update()
    }
}