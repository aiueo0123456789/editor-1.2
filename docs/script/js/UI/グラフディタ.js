import { vec2 } from "../ベクトル計算.js";
import { createMinWorkSpace, managerForDOMs } from "./制御.js";

class Render {
    constructor(cvs) {
        if (!cvs || !(cvs instanceof HTMLCanvasElement)) {
            console.error("cvsを渡してください");
        }
        this.cvs = cvs;
        this.cvs.width *= 3;
        this.cvs.height *= 3;
        this.ctx = cvs.getContext("2d");
    }
    colorS(r,g,b,a = 1) {
        return `rgb(${r},${g},${b},${a})`;
    }

    fixPosition(pos) {
        return [pos[0], this.cvs.height - pos[1]];
    }

    clear() {
        this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height); // UI用のcanvasをクリア
    }

    line(pos1, pos2, width, col) {
        this.ctx.strokeStyle = this.colorS(...col);
        this.ctx.lineWidth = width;

        this.ctx.beginPath();
        this.ctx.moveTo(...this.fixPosition(pos1));
        this.ctx.lineTo(...this.fixPosition(pos2));
        this.ctx.stroke();
    }

    bezier(bezier) {
        const mathBezier = (p1, c1, c2, p2, t) => {
            const u = 1 - t;
            const a = vec2.scaleR(p1, u ** 3);
            const b = vec2.scaleR(c1, 3 * u ** 2 * t);
            const c = vec2.scaleR(c2, 3 * u * t ** 2);
            const d = vec2.scaleR(p2, t ** 3);
            return vec2.addR(a,vec2.addR(b,vec2.addR(c,d)));
        }
        let lastCo = [0,0];
        for (let t = 0; t <= 1; t += 0.01) {
            const co = mathBezier(bezier.p1, bezier.c1, bezier.c2, bezier.p2, t);
            this.line(vec2.mulR(lastCo, [this.cvs.width, this.cvs.height]), vec2.mulR(co, [this.cvs.width, this.cvs.height]), 5, [70,255,50]);
            lastCo = co;
        }
    }

    bezier2() {
        function bezierInterpolation(keyA, keyB, currentFrame) {
            function cubicBezier(t, p0, p1, p2, p3) {
                let u = 1 - t;
                let tt = t * t;
                let uu = u * u;
                let uuu = uu * u;
                let ttt = tt * t;
                return (uuu * p0) + (3 * uu * t * p1) + (3 * u * tt * p2) + (ttt * p3);
            }
    
            let t = (currentFrame - keyA.frame) / (keyB.frame - keyA.frame);
            t = Math.max(0, Math.min(1, t)); // Clamp t to [0,1]
    
            let p0 = keyA.value;
            let p1 = keyA.value + (keyA.frame + keyA.rightHandle);
            let p2 = keyB.value - (keyB.frame + keyB.leftHandle);
            let p3 = keyB.value;
    
            return cubicBezier(t, p0, p1, p2, p3);
        }
    
        let lastCo = [0,0];
        for (let t = 0; t <= 1; t += 0.01) {
            const co = [t,bezierInterpolation({rightHandle: 1, frame: 0},{leftHandle: -1, frame: 1},t)];
            console.log(co)
            this.line(vec2.mulR(lastCo, [this.cvs.width, this.cvs.height]), vec2.mulR(co, [this.cvs.width, this.cvs.height]), 5, [70,255,50]);
            lastCo = co;
        }
    }
}

function updateGraphCvs(object, groupID, DOM, others) {
    console.log("ああaa")
    const mathBezier = (p1, c1, c2, p2, t) => {
        const u = 1 - t;
        const a = vec2.scaleR(p1, u ** 3);
        const b = vec2.scaleR(c1, 3 * u ** 2 * t);
        const c = vec2.scaleR(c2, 3 * u * t ** 2);
        const d = vec2.scaleR(p2, t ** 3);
        return vec2.addR(a,vec2.addR(b,vec2.addR(c,d)));
    }
    others.bezier = {p1: [0,0], c1: [0.5,0], c2: [0.5,1], p2: [1,1]};

    others.render.clear();
    // others.render.bezier(others.bezier);
    others.render.bezier2();
}

export function displayGraphEditor(/** @type {HTMLElement} */ targetDiv, groupID) {
    const container = document.createElement("div");
    container.classList.add("graphEditorContainer")
    targetDiv.append(container);

    const graphCvs = document.createElement("canvas");
    graphCvs.classList.add("graphEditorCvs");
    const render = new Render(graphCvs);
    managerForDOMs.set("グラフエディター", groupID, graphCvs, updateGraphCvs, {bezier: null, render: render});
    managerForDOMs.update("グラフエディター")
    const graph = createMinWorkSpace(container, "グラフ", graphCvs, ["R","F"]);

    // const actionButtons = document.createElement("ul");
    // actionButtons.classList.add("actionButtons")
}