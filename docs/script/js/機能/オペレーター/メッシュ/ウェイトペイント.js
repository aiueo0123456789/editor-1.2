import { loadFile } from "../../../utility.js";
import { GPU } from "../../../webGPU.js";

// const weightPaintPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csrw_Csr"),GPU.getGroupLayout("Cu_Cu")],`
const weightPaintPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csrw_Csr"),GPU.getGroupLayout("Cu_Cu_Csr")], await loadFile("./script/js/機能/オペレーター/メッシュ/GPU/paint.wgsl"));

export class WeightPaintCommand {
    constructor(target, paintTargetIndex, weight, decayType, radius) {
        this.configBuffer = GPU.createUniformBuffer(32, undefined, ["u32","f32","u32","f32"]);
        this.pointBuffer = GPU.createUniformBuffer(8, undefined, ["f32","f32"]);
        this.decayBezierBuffer = GPU.createStorageBuffer(2 * 3 * 2 * 4, undefined, ["f32","f32"]);
        GPU.writeBuffer(this.decayBezierBuffer, new Float32Array([
            0,1, -0.5,0.5, 0.5,-0.5,
            1,0, -0.5,0.5, 0.5,-0.5,
        ]));
        this.configGroup = GPU.createGroup(GPU.getGroupLayout("Cu_Cu_Csr"), [this.configBuffer, this.pointBuffer, this.decayBezierBuffer]);
        GPU.writeBuffer(this.configBuffer, GPU.createBitData([decayType,radius,paintTargetIndex,weight],["u32","f32","u32","f32"]))
        this.target = target;
        this.paintBuffer = GPU.copyBufferToNewBuffer(target.parentWeightBuffer);
        this.targetBuffer = target.parentWeightBuffer;
        this.originalBuffer = GPU.copyBufferToNewBuffer(target.parentWeightBuffer);
        this.maxWeightBuffer = GPU.createStorageBuffer(target.verticesNum * 4, undefined, ["f32"]);
        this.originalVerticesBuffer = GPU.copyBufferToNewBuffer(target.RVrt_coBuffer);
        this.workNum = Math.ceil(target.verticesNum / 64);
        this.group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csrw_Csr"), [{item: this.targetBuffer, type: "b"}, {item: this.originalBuffer, type: "b"}, {item: this.maxWeightBuffer, type: "b"}, {item: this.originalVerticesBuffer, type: "b"}]);
    }

    paint(point) {
        console.log("ペイント")
        GPU.writeBuffer(this.pointBuffer, new Float32Array(point));
        GPU.runComputeShader(weightPaintPipeline, [this.group, this.configGroup], this.workNum);
        GPU.copyBuffer(this.targetBuffer, this.paintBuffer);
        this.target.isChange = true;
    }

    execute() {
        GPU.copyBuffer(this.paintBuffer, this.targetBuffer);
    }

    undo() {
        this.target.isChange = true;
        GPU.copyBuffer(this.originalBuffer, this.targetBuffer);
    }
}