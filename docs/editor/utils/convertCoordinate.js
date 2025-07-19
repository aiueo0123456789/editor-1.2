import { vec2 } from "./mathVec.js";

export class ConvertCoordinate {
    constructor(cvs, camera) {
        this.cvs = cvs;
        this.camera = camera;
    }

    // キャンバス座標からワールド座標
    screenPosFromGPUPos(pos) {
        const clip = vec2.subR(vec2.scaleR(vec2.divR(pos, [this.cvs.offsetWidth, this.cvs.offsetHeight]), 2), [1,1]);
        const a = vec2.divR(clip, [1 / this.cvs.offsetWidth, 1 / this.cvs.offsetHeight]);
        vec2.reverseScale(a,a,this.camera.zoom);
        vec2.add(a, a, this.camera.position);
        return a;
    }

    GPUSizeFromCPU(size) {
        return size / this.camera.zoom;
    }

    sizeClmapFromCPU(size) {
        return size / (Math.max(this.cvs.width, this.cvs.height) / 2);
    }
}