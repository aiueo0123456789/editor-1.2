import { GPU } from "../../webGPU.js";

export class TextureTag {
    constructor(creatorForUI,t,searchTarget,child,flag) {
        this.canvas = document.createElement("canvas");
        this.texture = creatorForUI.getParameter(searchTarget, child.sourceTexture);
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.objectFit = "contain";
        GPU.textureToViewCanvas(this.texture, this.canvas);
        this.element = document.createElement("div");
        this.element.style.width = "100%";
        this.element.style.height = "100%";
        this.element.style.maxWidth = "50px";
        this.element.style.maxHeight = "50px";
        this.element.style.aspectRatio = 1 / 1;
        this.element.append(this.canvas);
        t.append(this.element);
    }

    remove() {
        this.element.remove();
    }
}