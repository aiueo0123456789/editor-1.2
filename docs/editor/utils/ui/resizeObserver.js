import { vec2 } from "../mathVec.js";

class HTMLElementResizeObserver {
    constructor() {
        this.observationObjects = [];
        this.beforeSize = [];
    }

    push(/** @type {HTMLElement} */htmlElement, fn) {
        this.observationObjects.push({htmlElement, fn});
        this.beforeSize.push([0,0]);
    }

    check() {
        this.observationObjects.forEach((value, index) => {
            if (value.fn) {
                if (!vec2.same([value.htmlElement.offsetWidth, value.htmlElement.offsetHeight], this.beforeSize[index])) {
                    value.fn();
                }
                this.beforeSize[index] = [value.htmlElement.offsetWidth, value.htmlElement.offsetHeight];
            }
        })
    }
}

export const resizeObserver = new HTMLElementResizeObserver();

function update() {
    resizeObserver.check();
    requestAnimationFrame(update);
}

update();