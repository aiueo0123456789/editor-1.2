import { MathVec2 } from "../../utils/mathVec.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { device, GPU } from "../../utils/webGPU.js";

export class Camera {
    constructor() {
        this.position = [0,0];
        this.zoomMax = 100;
        this.zoomMin = 0.01;
        this.zoom = 0.5;
        this.cameraDataBuffer = GPU.createUniformBuffer((2 + 2 + 1 + 1) * 4, undefined, ["f32", "f32", "f32", "f32", "f32", "f32"]);
        this.displayRange = [1024,1024];
        this.updateBuffer();
        managerForDOMs.set({o: this, i: "displayRange"}, () => {this.updateBuffer()});
        managerForDOMs.update({o: this, i: "displayRange"});
    }

    updateBuffer() {
        device.queue.writeBuffer(this.cameraDataBuffer, 0, new Float32Array([...this.position, 1 / this.displayRange[0], 1 /  this.displayRange[1], this.zoom, 0]));
        // device.queue.writeBuffer(this.cameraDataBuffer, 0, new Float32Array([...this.position, ...vec2.scaleR(this.displayRange, this.zoom)]));
    }

    updateCanvasSize(cvsSize) {
        this.displayRange = [...cvsSize];
        managerForDOMs.update({o: this, i: "displayRange"});
    }
}