import { app } from "../../../app.js";
import { loadFile } from "../../../utility.js";
import { GPU } from "../../../webGPU.js";

// const weightPaintPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csrw_Csr_Cu"),GPU.getGroupLayout("Cu_Cu")],`
const weightPaintPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csrw_Csr_Cu"),GPU.getGroupLayout("Cu_Cu_Csr")], await loadFile("./script/js/機能/オペレーター/メッシュ/GPU/paint.wgsl"));

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
        if (target.type == "グラフィックメッシュ") {
            this.targetBuffer = app.scene.runtimeData.graphicMeshData.weightBlocks;
            this.verticesPositionBuffer = GPU.copyBufferToNewBuffer(app.scene.runtimeData.graphicMeshData.renderingVertices, target.vertexBufferOffset * 2 * 4, target.verticesNum * 2 * 4);
            this.runtimeObject = app.scene.runtimeData.graphicMeshData;
        }
        this.originalBuffer = GPU.copyBufferToNewBuffer(this.targetBuffer, target.vertexBufferOffset * app.scene.runtimeData.graphicMeshData.weightBlockByteLength, target.verticesNum * app.scene.runtimeData.graphicMeshData.weightBlockByteLength);
        this.maxWeightBuffer = GPU.createStorageBuffer(target.verticesNum * 4, undefined, ["f32"]);
        this.workNum = Math.ceil(target.verticesNum / 64);
        this.group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csrw_Csr_Cu"), [{item: this.targetBuffer, type: "b"}, {item: this.originalBuffer, type: "b"}, {item: this.maxWeightBuffer, type: "b"}, {item: this.verticesPositionBuffer, type: "b"}, target.objectDataBuffer]);
    }

    update(point) {
        console.log("ペイント")
        GPU.writeBuffer(this.pointBuffer, new Float32Array(point));
        GPU.runComputeShader(weightPaintPipeline, [this.group, this.configGroup], this.workNum);
        this.runtimeObject.updateCPUDataFromGPUBuffer(this.target, {vertex: {weight: true}});
    }

    execute() {
        GPU.runComputeShader(weightPaintPipeline, [this.group, this.configGroup], this.workNum);
        this.runtimeObject.updateCPUDataFromGPUBuffer(this.target, {vertex: {weight: true}});
    }

    undo() {
        this.target.isChange = true;
        GPU.copyBuffer(this.originalBuffer, this.targetBuffer);
        this.runtimeObject.updateCPUDataFromGPUBuffer(this.target, {vertex: {weight: true}});
    }
}