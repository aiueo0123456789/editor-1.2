import { Application } from "../../../app/app.js";
import { objectToNumber } from "../../../app/scene/scene.js";
import { UnfixedReference } from "../../../utils/objects/util.js";
import { GPU } from "../../../utils/webGPU.js";
import { BezierModifier } from "../../objects/bezierModifier.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

export class BezierModifierData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "pointsNum": "pointsOffset", "shapeKeysNum": "shapeKeyWeightsOffset", "shapeKeysNum*pointsNum": "shapeKeysOffset"});
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32","f32","f32","f32","f32"], "pointsNum");
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32","f32","f32","f32","f32"], "pointsNum");
        this.shapeKeys = new BufferManager(this, "shapeKeys", ["f32","f32","f32","f32","f32","f32"], "shapeKeysNum * pointsNum");
        this.shapeKeyWights = new BufferManager(this, "shapeKeyWights", ["f32"], "shapeKeysNum");
        this.weightBlocks = new BufferManager(this, "weightBlocks", ["u32","u32","u32","u32","f32","f32","f32","f32", "u32","u32","u32","u32","f32","f32","f32","f32", "u32","u32","u32","u32","f32","f32","f32","f32"], "pointsNum");
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");

        this.renderingGizumoGroup = null;
        this.shapeKeyApplyGroup = null;
        this.animationApplyParentGroup = null;

        this.myType = 2;

        this.offsetCreate();
    }

    updateAllocationData(/** @type {BezierModifier} */bezierModifier) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(bezierModifier);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (bezierModifier.runtimeOffsetData.start.allocationOffset * 8) * 4);
        GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {BezierModifier} */bezierModifier) {
        if (!bezierModifier.parent || bezierModifier.parent instanceof UnfixedReference) {
            return new Uint32Array([bezierModifier.runtimeOffsetData.start.pointsOffset, bezierModifier.runtimeOffsetData.start.shapeKeysOffset, bezierModifier.runtimeOffsetData.start.shapeKeyWeightsOffset, bezierModifier.pointsNum, bezierModifier.shapeKeysNum, 0, 0, this.myType]);
        } else {
            return new Uint32Array([bezierModifier.runtimeOffsetData.start.pointsOffset, bezierModifier.runtimeOffsetData.start.shapeKeysOffset, bezierModifier.runtimeOffsetData.start.shapeKeyWeightsOffset, bezierModifier.pointsNum, bezierModifier.shapeKeysNum, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.runtimeOffsetData.start.allocationOffset, this.myType]);
        }
    }

    getObjectDataForGPU(/** @type {BezierModifier} */bezierModifier) {
        const map = new Map();
        map.set(this.baseVertices, bezierModifier.allVertices);
        map.set(this.weightBlocks, bezierModifier.allWeightBlocks);
        map.set(this.shapeKeys, bezierModifier.allShapeKeys);
        map.set(this.shapeKeyWights, null);
        console.log(bezierModifier);
        return map;
    }

    setGroup() {
        this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices.buffer, this.weightBlocks.buffer]); // 表示用
        this.shapeKeyApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.shapeKeys.minimumOrMoreBuffer, this.shapeKeyWights.minimumOrMoreBuffer, this.allocations.buffer]); // アニメーション用
        this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.allocations.buffer]); // 子の変形用データ
        this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.allocations.buffer, this.weightBlocks.buffer]); // 親の変形を適応するた
    }
}