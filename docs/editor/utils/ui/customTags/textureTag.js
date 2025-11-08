import { GPU } from "../../webGPU.js";
import { CustomTag } from "../customTag.js";
import { removeHTMLElementInObject } from "../util.js";

export class TextureTag extends CustomTag {
    constructor(creatorForUI,t,parent,searchTarget,child,flag) {
        super();
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
}