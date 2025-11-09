import { Application } from "../../../app/app.js";
import { objectToNumber } from "../../../app/scene/scene.js";
import { UnfixedReference } from "../../../utils/objects/util.js";
import { GPU } from "../../../utils/webGPU.js";
import { GraphicMesh } from "../../objects/graphicMesh.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

export class GraphicMeshData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "shapeKeysNum": "shapeKeyWeightsOffset", "shapeKeysNum*verticesNum": "shapeKeysOffset", "meshesNum": "meshesOffset", "verticesNum": "verticesOffset"});
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32"], "verticesNum");
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32"], "verticesNum");
        this.meshes = new BufferManager(this, "meshes", ["u32","u32","u32"], "meshesNum");
        this.uv = new BufferManager(this, "uv", ["f32","f32"], "verticesNum");
        this.shapeKeys = new BufferManager(this, "shapeKeys", ["f32","f32"], "shapeKeysNum * verticesNum");
        this.shapeKeyWights = new BufferManager(this, "shapeKeyWights", ["f32"], "shapeKeysNum");
        this.weightBlocks = new BufferManager(this, "weightBlocks", ["u32","u32","u32","u32","f32","f32","f32","f32"], "verticesNum");
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");
        this.renderGroup = null;
        this.renderingGizumoGroup = null;
        this.shapeKeyApplyGroup = null;

        this.meshBlockByteLength = 3 * 4; // uint32x3

        this.write = false;

        this.offsetCreate();
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

    getAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        if (!graphicMesh.parent || graphicMesh.parent instanceof UnfixedReference) return new Uint32Array([graphicMesh.runtimeOffsetData.start.verticesOffset, graphicMesh.runtimeOffsetData.start.shapeKeysOffset, graphicMesh.runtimeOffsetData.start.shapeKeyWeightsOffset, graphicMesh.verticesNum, graphicMesh.shapeKeysNum, 0, 0, GPU.padding]);
        else return new Uint32Array([graphicMesh.runtimeOffsetData.start.verticesOffset, graphicMesh.runtimeOffsetData.start.shapeKeysOffset, graphicMesh.runtimeOffsetData.start.shapeKeyWeightsOffset, graphicMesh.verticesNum, graphicMesh.shapeKeysNum, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.runtimeOffsetData.start.allocationOffset, GPU.padding]);
    }

    updateAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        const allocationData = this.getAllocationData(graphicMesh);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (graphicMesh.runtimeOffsetData.start.allocationOffset * 8) * 4);
        GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
        const meshAllocationData = new Uint32Array([graphicMesh.runtimeOffsetData.start.verticesOffset, graphicMesh.runtimeOffsetData.start.meshesOffset, graphicMesh.meshesNum, 0]);
        GPU.writeBuffer(graphicMesh.objectMeshData, meshAllocationData);
    }

    setGroup() {
        if (this.order.length) {
            this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices.buffer, this.uv.buffer]); // 表示用
            this.shapeKeyApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.shapeKeys.minimumOrMoreBuffer, this.shapeKeyWights.minimumOrMoreBuffer, this.allocations.buffer]); // アニメーション用
            this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.renderingVertices.buffer, this.weightBlocks.buffer, this.allocations.buffer]); // 親の変形を適応するた
        } else {
            this.renderGroup = null; // 表示用
            this.renderingGizumoGroup = null; // 表示用
            this.shapeKeyApplyGroup = null; // アニメーション用
            this.parentApplyGroup = null; // 親の変形を適応するた
        }
    }
}