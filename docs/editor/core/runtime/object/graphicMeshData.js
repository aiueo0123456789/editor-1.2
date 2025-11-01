import { Application } from "../../../app/app.js";
import { objectToNumber } from "../../../app/scene/scene.js";
import { managerForDOMs } from "../../../utils/ui/util.js";
import { loadFile } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { GraphicMesh } from "../../objects/graphicMesh.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

export class GraphicMeshData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "shapeKeysNum": "animationWeightOffset", "shapeKeysNum*verticesNum": "animationOffset", "meshesNum": "meshOffset", "verticesNum": "vertexOffset"});
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32"], "verticesNum");
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32"], "verticesNum");
        this.meshes = new BufferManager(this, "meshes", ["u32","u32","u32"], "meshesNum");
        this.uv = new BufferManager(this, "uv", ["f32","f32"], "verticesNum");
        this.shapeKeys = new BufferManager(this, "animations", ["f32","f32"], "shapeKeysNum * verticesNum");
        this.shapeKeyWights = new BufferManager(this, "animationWights", ["f32"], "shapeKeysNum");
        this.weightBlocks = new BufferManager(this, "weightBlocks", ["u32","u32","u32","u32","f32","f32","f32","f32"], "verticesNum");
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");
        this.renderGroup = null;
        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;

        this.blockByteLength = 2 * 4; // データ一塊のバイト数: vec2<f32>
        this.meshBlockByteLength = 3 * 4; // uint32x3
        this.animationBlockByteLength = 3 * 4; // uint32x3

        this.weightBlockByteLength = (4 + 4) * 4;

        this.write = false;

        this.offsetCreate();
    }

    async getBaseVerticesFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.baseVertices, {start: graphicMesh.runtimeOffsetData.start.vertexOffset, end: graphicMesh.runtimeOffsetData.start.vertexOffset + graphicMesh.verticesNum}, ["f32", "f32"]);
    }

    async getVerticesUVFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.uv, {start: graphicMesh.runtimeOffsetData.start.vertexOffset, end: graphicMesh.runtimeOffsetData.start.vertexOffset + graphicMesh.verticesNum}, ["u32", "u32", "u32"]);
    }

    async getMeshFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.meshes, {start: graphicMesh.runtimeOffsetData.start.vertexOffset, end: graphicMesh.runtimeOffsetData.start.vertexOffset + graphicMesh.verticesNum}, ["f32", "f32"]);
    }

    updateBaseData(/** @type {GraphicMesh} */graphicMesh) {
        this.update(graphicMesh);
    }

    getObjectDataForGPU(/** @type {GraphicMesh} */graphicMesh) {
        const map = new Map();
        map.set(this.baseVertices, graphicMesh.allVertices);
        map.set(this.uv, graphicMesh.allUVs);
        map.set(this.weightBlocks, graphicMesh.allWeightBlocks);
        map.set(this.meshes, graphicMesh.allMeshes);
        map.set(this.shapeKeys, graphicMesh.allShapeKeys);
        map.set(this.shapeKeyWights, null);
        return map;
    }

    setAnimationData(/** @type {GraphicMesh} */graphicMesh, animationData, animtaionIndex) {
        GPU.writeBuffer(this.shapeKeys, new Float32Array(animationData), (graphicMesh.runtimeOffsetData.start.animationOffset + animtaionIndex) * this.blockByteLength);
    }

    deleteAnimationData(/** @type {GraphicMesh} */graphicMesh, animtaionIndex) {
        packBuffer(this.shapeKeys, (graphicMesh.runtimeOffsetData.start.animationOffset + animtaionIndex) * this.blockByteLength + graphicMesh.verticesNum * animtaionIndex, graphicMesh.verticesNum * (graphicMesh.shapeKeysNum - animtaionIndex), (graphicMesh.runtimeOffsetData.start.animationOffset + animtaionIndex) * this.blockByteLength);
        graphicMesh.animationBlock.updateAnimationsIndex();
    }

    getAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        if (graphicMesh.parent) return new Uint32Array([graphicMesh.runtimeOffsetData.start.vertexOffset, graphicMesh.runtimeOffsetData.start.animationOffset, graphicMesh.runtimeOffsetData.start.animationWeightOffset, graphicMesh.verticesNum, graphicMesh.shapeKeysNum, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.runtimeOffsetData.start.allocationOffset, GPU.padding]);
        else return new Uint32Array([graphicMesh.runtimeOffsetData.start.vertexOffset, graphicMesh.runtimeOffsetData.start.animationOffset, graphicMesh.runtimeOffsetData.start.animationWeightOffset, graphicMesh.verticesNum, graphicMesh.shapeKeysNum, 0, 0, GPU.padding]);
    }

    updateAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        const allocationData = this.getAllocationData(graphicMesh);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (graphicMesh.runtimeOffsetData.start.allocationOffset * 8) * 4);
        GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
        const meshAllocationData = new Uint32Array([graphicMesh.runtimeOffsetData.start.vertexOffset, graphicMesh.runtimeOffsetData.start.meshOffset, graphicMesh.meshesNum, 0]);
        GPU.writeBuffer(graphicMesh.objectMeshData, meshAllocationData);
    }

    setAllocation(/** @type {GraphicMesh} */graphicMesh) {
        for (const object of this.order) {
        }
        let allocationData = this.getAllocationData(graphicMesh);
        GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
    }

    setGroup() {
        if (this.order.length) {
            this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices.buffer, this.uv.buffer]); // 表示用
            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.shapeKeys.buffer.size > 0 ? this.shapeKeys.buffer : GPU.createStorageBuffer(this.shapeKeys.structByteSize), this.shapeKeyWights.buffer.size > 0 ? this.shapeKeyWights.buffer : GPU.createStorageBuffer(this.shapeKeyWights.structByteSize), this.allocations.buffer]); // アニメーション用
            this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.renderingVertices.buffer, this.weightBlocks.buffer, this.allocations.buffer]); // 親の変形を適応するた
        } else {
            this.renderGroup = null; // 表示用
            this.renderingGizumoGroup = null; // 表示用
            this.animationApplyGroup = null; // アニメーション用
            this.parentApplyGroup = null; // 親の変形を適応するた
        }
    }
}