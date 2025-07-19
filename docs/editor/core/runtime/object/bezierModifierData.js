import { Application } from "../../../app/app.js";
import { objectToNumber } from "../../../app/scene/scene.js";
import { loadFile } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { BezierModifier } from "../../objects/bezierModifier.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

const selectOnlyVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw")], await loadFile("./editor/shader/compute/select/vertex/selectOnlyVertices.wgsl"));
const circleSelectBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/vertex/selectVertices.wgsl"));
const selectBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/armature/selectBone.wgsl"));
const verticesSelectionToBonesSelectionPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu")], await loadFile("./editor/shader/compute/select/armature/verticesSelectionToBonesSelection.wgsl"));
const boxSelectVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/boxSelectVertices.wgsl"));

export class BezierModifierData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "MAX_ANIMATIONS": "animationWeightOffset", "MAX_ANIMATIONS*MAX_POINTS": "animationOffset", "MAX_POINTS": "pointOffset"});
        // this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32","f32","f32","f32","f32"], "MAX_POINTS");
        // this.baseVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32","f32","f32","f32","f32"], "MAX_POINTS");
        // this.animations = GPU.createBuffer(0, ["s"]);
        this.animations = new BufferManager(this, "animations", ["f32","f32","f32","f32","f32","f32"], "MAX_ANIMATIONS * MAX_POINTS");
        // this.animationWights = GPU.createBuffer(0, ["s"]);
        this.animationWights = new BufferManager(this, "animationWights", ["f32"], "MAX_ANIMATIONS");
        // this.weightBlocks = GPU.createBuffer(0, ["s"]);
        this.weightBlocks = new BufferManager(this, "weightBlocks", ["u32","u32","u32","u32","f32","f32","f32","f32", "u32","u32","u32","u32","f32","f32","f32","f32", "u32","u32","u32","u32","f32","f32","f32","f32"], "MAX_POINTS");
        // this.allocation = GPU.createBuffer(0, ["s"]);
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");
        // this.selectedVertices = GPU.createBuffer(0, ["s"]);
        this.selectedVertices = new BufferManager(this, "selectedVertices", ["bit"], "MAX_POINTS * 3");

        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;

        this.myType = 2;

        this.blockByteLength = 2 * 4 * 3; // データ一塊のバイト数: vec2<f32> * 3
        this.weightBlockByteLength = (4 + 4) * 4 * 3;

        this.offsetCreate();
    }

    // 選択
    async selectedForVertices(/** @type {BezierModifier} */ bezierModifier, object, option) {
        const optionBuffer = GPU.createUniformBuffer((2) * 4, [option.add,3], ["u32"]);
        // console.log("最大頂点数", graphicMesh.MAX_VERTICES, "起動されるグループ数", Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, bezierModifier.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((bezierModifier.MAX_POINTS * 3) / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, bezierModifier.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil((bezierModifier.MAX_POINTS * 3) / 32) / 64));
        }
        const resultBone = await GPU.getSelectedFromBufferBit(this.selectedVertices.buffer, bezierModifier.runtimeOffsetData.pointOffset * 3, (bezierModifier.runtimeOffsetData.pointOffset + bezierModifier.pointNum) * 3);
        for (const point of bezierModifier.allPoint) {
            point.basePoint.selected = resultBone[point.basePoint.localIndex];
            point.baseLeftControlPoint.selected = resultBone[point.baseLeftControlPoint.localIndex];
            point.baseRightControlPoint.selected = resultBone[point.baseRightControlPoint.localIndex];
        }
    }

    async getBaseVerticesFromObject(/** @type {BezierModifier} */bezierModifier) {
        return await GPU.getBufferDataFromIndexs(this.baseVertices.buffer, {start: bezierModifier.runtimeOffsetData.pointOffset, end: bezierModifier.runtimeOffsetData.pointOffset + bezierModifier.verticesNum}, ["f32", "f32"]);
    }

    async updateCPUDataFromGPUBuffer(/** @type {BezierModifier} */bezierModifier, updateContent = {vertex: {weight: true, base: true}}) {
        this.write = true;
        const baseArray = updateContent.vertex.base ? await GPU.getVerticesDataFromGPUBuffer(this.baseVertices.buffer, bezierModifier.runtimeOffsetData.pointOffset * 3, bezierModifier.verticesNum) : [];
        const weightBlockArray = updateContent.vertex.weight ? await GPU.getStructDataFromGPUBuffer(this.weightBlocks.buffer, ["u32","u32","u32","u32","f32","f32","f32","f32"], bezierModifier.runtimeOffsetData.pointOffset * 3, bezierModifier.verticesNum) : [];
        for (const point of bezierModifier.allPoint) {
            for (let i = 0; i < 3; i ++) {
                let vertex;
                if (i == 0) {
                    vertex = point.basePoint;
                } else if (i == 1) {
                    vertex = point.baseLeftControlPoint;
                } else {
                    vertex = point.baseRightControlPoint;
                }
                if (updateContent.vertex.base) {
                    vertex.co = baseArray[point.index * 3 + i];
                }
                if (updateContent.vertex.weight) {
                    vertex.parentWeight.indexs = weightBlockArray[point.index * 3 + i].slice(0,4);
                    vertex.parentWeight.weights = weightBlockArray[point.index * 3 + i].slice(4,8);
                }
            }
        }
        this.write = false;
    }

    updateBaseData(/** @type {BezierModifier} */bezierModifier) {
        bezierModifier.pointNum = bezierModifier.allPoint.length;
        const verticesBases = [];
        const verticesParentWeight = [];
        for (const point of bezierModifier.allPoint) {
            verticesBases.push(...point.basePoint.co);
            verticesBases.push(...point.baseLeftControlPoint.co);
            verticesBases.push(...point.baseRightControlPoint.co);
            verticesParentWeight.push(...point.basePoint.parentWeight.indexs.concat(point.basePoint.parentWeight.weights));
            verticesParentWeight.push(...point.baseLeftControlPoint.parentWeight.indexs.concat(point.baseLeftControlPoint.parentWeight.weights));
            verticesParentWeight.push(...point.baseRightControlPoint.parentWeight.indexs.concat(point.baseRightControlPoint.parentWeight.weights));
        }
        console.log(bezierModifier)
        GPU.writeBuffer(this.baseVertices.buffer, new Float32Array(verticesBases), bezierModifier.runtimeOffsetData.pointOffset * this.blockByteLength);
        GPU.writeBuffer(this.weightBlocks.buffer, GPU.createBitData(verticesParentWeight, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), bezierModifier.runtimeOffsetData.pointOffset * this.weightBlockByteLength);
        this.updateAllocationData(bezierModifier);
    }

    updateAllocationData(/** @type {BezierModifier} */bezierModifier) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(bezierModifier);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (bezierModifier.runtimeOffsetData.allocationOffset * 8) * 4);
        GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {BezierModifier} */bezierModifier) {
        if (bezierModifier.parent) {
            return new Uint32Array([bezierModifier.runtimeOffsetData.pointOffset, bezierModifier.runtimeOffsetData.animationOffset, bezierModifier.runtimeOffsetData.animationWeightOffset, bezierModifier.MAX_POINTS, bezierModifier.MAX_ANIMATIONS, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.runtimeOffsetData.allocationOffset, this.myType]);
        } else {
            return new Uint32Array([bezierModifier.runtimeOffsetData.pointOffset, bezierModifier.runtimeOffsetData.animationOffset, bezierModifier.runtimeOffsetData.animationWeightOffset, bezierModifier.MAX_POINTS, bezierModifier.MAX_ANIMATIONS, 0, 0, this.myType]);
        }
    }

    setAnimationData(/** @type {BezierModifier} */bezierModifier, animationData, animtaionIndex) {
        GPU.writeBuffer(this.animations.buffer, new Float32Array(animationData), (bezierModifier.runtimeOffsetData.animationOffset + animtaionIndex) * this.blockByteLength);
    }

    updateParent(/** @type {BezierModifier} */bezierModifier) {
        let allocationData;
        if (bezierModifier.parent) {
            allocationData = new Uint32Array([bezierModifier.runtimeOffsetData.pointOffset, bezierModifier.runtimeOffsetData.animationOffset, bezierModifier.runtimeOffsetData.animationWeightOffset, bezierModifier.MAX_POINTS, bezierModifier.MAX_ANIMATIONS, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.runtimeOffsetData.allocationOffset, this.myType]);
        } else {
            allocationData = new Uint32Array([bezierModifier.runtimeOffsetData.pointOffset, bezierModifier.runtimeOffsetData.animationOffset, bezierModifier.runtimeOffsetData.animationWeightOffset, bezierModifier.MAX_POINTS, bezierModifier.MAX_ANIMATIONS, 0, 0, this.myType]);
        }
        console.log(allocationData)
        GPU.writeBuffer(this.allocations.buffer, allocationData, (bezierModifier.runtimeOffsetData.allocationOffset * 8) * 4);
        GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
    }

    setGroup() {
        this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr_Vsr"), [this.renderingVertices.buffer, this.selectedVertices.buffer, this.weightBlocks.buffer]); // 表示用
        this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.animations.buffer, this.animationWights.buffer, this.allocations.buffer]); // アニメーション用
        this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.allocations.buffer]); // 子の変形用データ
        this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.allocations.buffer, this.weightBlocks.buffer]); // 親の変形を適応するた
    }
}