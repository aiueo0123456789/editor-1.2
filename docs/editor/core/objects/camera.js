
import { device,GPU } from './webGPU.js';

export class Camera {
    constructor() {
        this.position = [0,0];
        this.zoomMax = 100;
        this.zoomMin = 0.01;
        this.zoom = 10;
        this.cameraDataBuffer = GPU.createUniformBuffer((2 + 1 + 1) * 4, undefined, ["f32", "f32", "f32"]);
        this.updateBuffer();
    }

    updateBuffer() {
        device.queue.writeBuffer(this.cameraDataBuffer, 0, new Float32Array([...this.position, this.zoom, 0]));
    }
}