import { app } from "../../../app.js";
import { loadFile } from "../../../utility.js";
import { GPU } from "../../../webGPU.js";

const weightPaintPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csrw_Csr_Cu_Cu_Cu_Csr")], await loadFile("./script/js/機能/オペレーター/メッシュ/GPU/paint.wgsl"));

export class WeightPaintCommand {
    constructor(target, paintTargetIndex, weight, decayType, decaySize, bezierType = 0) {
        this.configBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32","f32","u32","f32"]);
        this.pointBuffer = GPU.createUniformBuffer(8, undefined, ["f32","f32"]);
        this.decayBezierBuffer = GPU.createStorageBuffer(2 * 3 * 2 * 4, undefined, ["f32","f32"]);
        if (bezierType == 0) {
            GPU.writeBuffer(this.decayBezierBuffer, new Float32Array([
                0,1, -0.5,1, 0.5,0.5,
                1,0, 0.5,0.5, 1.5,0,
            ]));
        } else if (bezierType == 1) {
            GPU.writeBuffer(this.decayBezierBuffer, new Float32Array([
                0,1, -0.5,1, 0.5,1,
                1,1, 0.5,1, 1.5,1,
            ]));
        }
        let groupNum = 1;
        this.target = target;
        if (target.type == "グラフィックメッシュ") {
            this.targetBuffer = app.scene.runtimeData.graphicMeshData.weightBlocks.buffer;
            this.verticesPositionBuffer = app.scene.runtimeData.graphicMeshData.renderingVertices.buffer;
            this.runtimeObject = app.scene.runtimeData.graphicMeshData;
            this.originalBuffer = GPU.copyBufferToNewBuffer(this.targetBuffer, target.runtimeOffsetData.vertexOffset * app.scene.runtimeData.graphicMeshData.weightBlockByteLength, target.verticesNum * app.scene.runtimeData.graphicMeshData.weightBlockByteLength);
        } else if (target.type == "ベジェモディファイア") {
            this.targetBuffer = app.scene.runtimeData.bezierModifierData.weightBlocks.buffer.buffer;
            this.verticesPositionBuffer = app.scene.runtimeData.bezierModifierData.renderingVertices.buffer;
            this.runtimeObject = app.scene.runtimeData.bezierModifierData;
            this.originalBuffer = GPU.copyBufferToNewBuffer(this.targetBuffer, target.runtimeOffsetData.pointOffset * app.scene.runtimeData.bezierModifierData.weightBlockByteLength, target.pointNum * app.scene.runtimeData.bezierModifierData.weightBlockByteLength);
            groupNum = 3;
        }
        this.maxWeightBuffer = GPU.createStorageBuffer(target.verticesNum * 4, undefined, ["f32"]);
        this.workNum = Math.ceil(target.verticesNum / 64);
        GPU.writeBuffer(this.configBuffer, GPU.createBitData([decayType,decaySize,paintTargetIndex,weight, groupNum],["u32","f32","u32","f32","u32"]))
        this.group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csrw_Csr_Cu_Cu_Cu_Csr"), [this.targetBuffer, this.originalBuffer, this.maxWeightBuffer, this.verticesPositionBuffer, target.objectDataBuffer, this.pointBuffer, this.configBuffer, this.decayBezierBuffer]);
    }

    update(point) {
        console.log("ペイント")
        GPU.writeBuffer(this.pointBuffer, new Float32Array(point));
        GPU.runComputeShader(weightPaintPipeline, [this.group], this.workNum);
        this.runtimeObject.updateCPUDataFromGPUBuffer(this.target, {vertex: {weight: true}});
        // GPU.consoleBufferData(this.targetBuffer, ["u32","u32","u32","u32","f32","f32","f32","f32"]);
    }

    execute() {
        GPU.runComputeShader(weightPaintPipeline, [this.group], this.workNum);
        this.runtimeObject.updateCPUDataFromGPUBuffer(this.target, {vertex: {weight: true}});
    }

    undo() {
        this.target.isChange = true;
        GPU.copyBuffer(this.originalBuffer, this.targetBuffer);
        this.runtimeObject.updateCPUDataFromGPUBuffer(this.target, {vertex: {weight: true}});
    }
}