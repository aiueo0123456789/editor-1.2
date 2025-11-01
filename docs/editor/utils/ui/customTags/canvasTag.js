import { CustomTag } from "../customTag.js";

export class CanvasTag extends CustomTag {
    constructor(creatorForUI,t,searchTarget,child,flag) {
        super();
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.backgroundColor = child.color ? child.color : "rgba(0, 0, 0, 0)";
        t.append(this.canvas);
        const update = () => {
            child.draw(this.canvas, searchTarget);
            requestAnimationFrame(update);
        }
        child.init(this.canvas, searchTarget);
        update()
    }
}