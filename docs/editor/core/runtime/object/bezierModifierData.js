import { Application } from "../../../app/app.js";
import { objectToNumber } from "../../../app/scene/scene.js";
import { managerForDOMs } from "../../../utils/ui/util.js";
import { loadFile } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { BezierModifier } from "../../objects/bezierModifier.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

export class BezierModifierData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "pointNum": "pointOffset"});
        // this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32","f32","f32","f32","f32"], "pointNum");
        // this.baseVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32","f32","f32","f32","f32"], "pointNum");
        // this.runtimeAnimationData = GPU.createBuffer(0, ["s"]);
        this.runtimeAnimationData = new BufferManager(this, "runtimeAnimationData", ["f32","f32", "f32","f32", "f32","f32"], "pointNum");
        // this.weightBlocks = GPU.createBuffer(0, ["s"]);
        this.weightBlocks = new BufferManager(this, "weightBlocks", ["u32","u32","u32","u32","f32","f32","f32","f32", "u32","u32","u32","u32","f32","f32","f32","f32", "u32","u32","u32","u32","f32","f32","f32","f32"], "pointNum");
        // this.allocation = GPU.createBuffer(0, ["s"]);
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");

        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;

        this.myType = 2;

        this.vertexBlockByteLength = 2 * 4; // データ一塊のバイト数: vec2<f32> * 3
        this.pointBlockByteLength = 2 * 4 * 3; // データ一塊のバイト数: vec2<f32> * 3
        this.weightBlockByteLength = (4 + 4) * 4 * 3;

        this.offsetCreate();
    }

    async getBaseVerticesFromObject(/** @type {BezierModifier} */bezierModifier) {
        return await GPU.getBufferDataFromIndexs(this.baseVertices.buffer, {start: bezierModifier.runtimeOffsetData.start.pointOffset, end: bezierModifier.runtimeOffsetData.start.pointOffset + bezierModifier.verticesNum}, ["f32", "f32"]);
    }

    updateBaseData(/** @type {BezierModifier} */bezierModifier) {
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
        GPU.writeBuffer(this.baseVertices.buffer, new Float32Array(verticesBases), bezierModifier.runtimeOffsetData.start.pointOffset * this.pointBlockByteLength);
        GPU.writeBuffer(this.weightBlocks.buffer, GPU.createBitData(verticesParentWeight, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), bezierModifier.runtimeOffsetData.start.pointOffset * this.weightBlockByteLength);
        this.updateAllocationData(bezierModifier);
    }

    updateAllocationData(/** @type {BezierModifier} */bezierModifier) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(bezierModifier);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (bezierModifier.runtimeOffsetData.start.allocationOffset * 8) * 4);
        GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {BezierModifier} */bezierModifier) {
        if (!bezierModifier.parent || bezierModifier.parent.isRoot) {
            return new Uint32Array([bezierModifier.runtimeOffsetData.start.pointOffset, 0, 0, bezierModifier.pointNum, 0, 0, 0, this.myType]);
        } else {
            return new Uint32Array([bezierModifier.runtimeOffsetData.start.pointOffset, 0, 0, bezierModifier.pointNum, 0, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.runtimeOffsetData.start.allocationOffset, this.myType]);
        }
    }


    setGroup() {
        this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices.buffer, this.weightBlocks.buffer]); // 表示用
        this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.runtimeAnimationData.buffer, this.allocations.buffer]); // アニメーション用
        this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.allocations.buffer]); // 子の変形用データ
        this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.allocations.buffer, this.weightBlocks.buffer]); // 親の変形を適応するた
    }
}