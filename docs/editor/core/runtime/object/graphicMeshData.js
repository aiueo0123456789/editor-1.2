import { Application } from "../../../app/app.js";
import { objectToNumber } from "../../../app/scene/scene.js";
import { loadFile } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { GraphicMesh } from "../../objects/graphicMesh.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

const selectOnlyVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw")], await loadFile("./editor/shader/compute/select/vertex/selectOnlyVertices.wgsl"));
const circleSelectBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/vertex/selectVertices.wgsl"));
const selectBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/armature/selectBone.wgsl"));
const verticesSelectionToBonesSelectionPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu")], await loadFile("./editor/shader/compute/select/armature/verticesSelectionToBonesSelection.wgsl"));
const boxSelectVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/boxSelectVertices.wgsl"));

export class GraphicMeshData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "MAX_ANIMATIONS": "animationWeightOffset", "MAX_ANIMATIONS*MAX_VERTICES": "animationOffset", "MAX_MESHES": "meshOffset", "MAX_VERTICES": "vertexOffset"});
        // this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32"], "MAX_VERTICES");
        // this.baseVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32"], "MAX_VERTICES");
        // this.meshes = GPU.createBuffer(0, ["v","s"]);
        this.meshes = new BufferManager(this, "meshes", ["u32","u32","u32"], "MAX_MESHES");
        // this.meshes = GPU.createBuffer(0, ["v","s"]);
        this.edges = new BufferManager(this, "edges", ["u32","u32"], "MAX_MESHES * 3");
        // this.uv = GPU.createBuffer(0, ["s"]);
        this.uv = new BufferManager(this, "uv", ["f32","f32"], "MAX_VERTICES");
        // this.animations = GPU.createBuffer(0, ["s"]);
        this.animations = new BufferManager(this, "animations", ["f32","f32"], "MAX_ANIMATIONS * MAX_VERTICES");
        // this.animationWights = GPU.createBuffer(0, ["s"]);
        this.animationWights = new BufferManager(this, "animationWights", ["f32"], "MAX_ANIMATIONS");
        // this.weightBlocks = GPU.createBuffer(0, ["s"]);
        this.weightBlocks = new BufferManager(this, "weightBlocks", ["u32","u32","u32","u32","f32","f32","f32","f32"], "MAX_VERTICES");
        // this.allocation = GPU.createBuffer(0, ["s"]);
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");
        // this.selectedVertices = GPU.createBuffer(0, ["s"]);
        this.selectedVertices = new BufferManager(this, "selectedVertices", ["bit"], "MAX_VERTICES");
        // this.selectedMesh = GPU.createBuffer(0, ["s"]);
        this.selectedMesh = new BufferManager(this, "selectedMesh", ["bit"], "MAX_MESHES");
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
        return await GPU.getBufferDataFromIndexs(this.baseVertices, {start: graphicMesh.runtimeOffsetData.vertexOffset, end: graphicMesh.runtimeOffsetData.vertexOffset + graphicMesh.verticesNum}, ["f32", "f32"]);
    }

    async getVerticesUVFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.uv, {start: graphicMesh.runtimeOffsetData.vertexOffset, end: graphicMesh.runtimeOffsetData.vertexOffset + graphicMesh.verticesNum}, ["u32", "u32", "u32"]);
    }

    async getMeshFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.meshes, {start: graphicMesh.runtimeOffsetData.vertexOffset, end: graphicMesh.runtimeOffsetData.vertexOffset + graphicMesh.verticesNum}, ["f32", "f32"]);
    }

    updateBaseData(/** @type {GraphicMesh} */graphicMesh) {
        graphicMesh.verticesNum = graphicMesh.allVertices.length;
        graphicMesh.meshesNum = graphicMesh.allMeshes.length;
        const verticesBases = [];
        const verticesUV = [];
        const verticesParentWeight = [];
        for (const vertex of graphicMesh.allVertices) {
            verticesBases.push(...vertex.base);
            verticesUV.push(...vertex.uv);
            verticesParentWeight.push(...vertex.parentWeight.indexs.concat(vertex.parentWeight.weights));
        }
        GPU.writeBuffer(this.baseVertices.buffer, new Float32Array(verticesBases), graphicMesh.runtimeOffsetData.vertexOffset * this.blockByteLength);
        GPU.writeBuffer(this.uv.buffer, new Float32Array(verticesUV), graphicMesh.runtimeOffsetData.vertexOffset * this.blockByteLength);
        GPU.writeBuffer(this.weightBlocks.buffer, GPU.createBitData(verticesParentWeight, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), graphicMesh.runtimeOffsetData.vertexOffset * this.weightBlockByteLength);
        const meshesIndexs = [];
        for (const mesh of graphicMesh.allMeshes) {
            meshesIndexs.push(...mesh.indexs);
        }
        GPU.writeBuffer(this.meshes.buffer, new Uint32Array(meshesIndexs), graphicMesh.runtimeOffsetData.meshOffset * this.meshBlockByteLength);
        this.updateAllocationData(graphicMesh);
    }

    async updateCPUDataFromGPUBuffer(/** @type {GraphicMesh} */graphicMesh, updateContent = {vertex: {base: true, uv: true, weight: true}, mesh: true}) {
        this.write = true;
        const baseArray = updateContent.vertex.base ? await this.baseVertices.getObjectData(graphicMesh) : [];
        const uvArray = updateContent.vertex.uv ? await this.uv.getObjectData(graphicMesh) : [];
        const weightBlockArray = updateContent.vertex.weight ? await this.weightBlocks.getObjectData(graphicMesh) : [];
        for (const vertex of graphicMesh.allVertices) {
            if (vertex.base != baseArray[vertex.localIndex] || vertex.uv == uvArray[vertex.localIndex]) {
                vertex.updated = true;
            } else {
                vertex.updated = false;
            }
            if (updateContent.vertex.base) {
                vertex.base = baseArray[vertex.localIndex];
            }
            if (updateContent.vertex.uv) {
                vertex.uv = uvArray[vertex.localIndex];
            }
            if (updateContent.vertex.weight) {
                vertex.parentWeight.indexs = weightBlockArray[vertex.localIndex].slice(0,4);
                vertex.parentWeight.weights = weightBlockArray[vertex.localIndex].slice(4,8);
            }
        }
        this.write = false;
    }

    // 選択
    async selectedForVertices(/** @type {GraphicMesh} */ graphicMesh, object, option) {
        const optionBuffer = GPU.createUniformBuffer((2) * 4, [option.add,1], ["u32"]);
        // console.log("最大頂点数", graphicMesh.MAX_VERTICES, "起動されるグループ数", Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, graphicMesh.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((graphicMesh.MAX_VERTICES * 3) / 32) / 64));
        } else if (option.circle) {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, graphicMesh.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const atomicBuffer = GPU.createStorageBuffer((1 + 1) * 4);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw"), [this.selectedVertices.buffer, this.renderingVertices.buffer, graphicMesh.objectDataBuffer, optionBuffer, circleBuffer, atomicBuffer]);
            GPU.runComputeShader(selectOnlyVerticesPipeline, [group], Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        }
        const resultSelected = await GPU.getSelectedFromBufferBit(this.selectedVertices.buffer, graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.vertexOffset + graphicMesh.verticesNum);
        console.log(resultSelected)
        for (const vertex of graphicMesh.allVertices) {
            console.log(vertex.localIndex)
            vertex.selected = resultSelected[vertex.localIndex];
        }
        // GPU.consoleBufferData(this.selectedVertices, ["u32"], "当たり判定", {start: Math.ceil(armature.runtimeOffsetData.vertexOffset * 2 / 32), num: Math.ceil((armature.MAX_BONES) * 2 / 32)});
        // GPU.consoleBufferData(this.selectedVertices, ["bit"], "当たり判定bool", {start: Math.ceil(armature.runtimeOffsetData.vertexOffset * 2 / 32), num: Math.ceil((armature.MAX_BONES) * 2 / 32)});
    }

    setAnimationData(/** @type {GraphicMesh} */graphicMesh, animationData, animtaionIndex) {
        GPU.writeBuffer(this.animations, new Float32Array(animationData), (graphicMesh.runtimeOffsetData.animationOffset + animtaionIndex) * this.blockByteLength);
    }

    deleteAnimationData(/** @type {GraphicMesh} */graphicMesh, animtaionIndex) {
        packBuffer(this.animations, (graphicMesh.runtimeOffsetData.animationOffset + animtaionIndex) * this.blockByteLength + graphicMesh.MAX_VERTICES * animtaionIndex, graphicMesh.MAX_VERTICES * (graphicMesh.MAX_ANIMATIONS - animtaionIndex), (graphicMesh.runtimeOffsetData.animationOffset + animtaionIndex) * this.blockByteLength);
        graphicMesh.animationBlock.updateAnimationsIndex();
    }

    getAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        if (graphicMesh.parent) {
            return new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.animationOffset, graphicMesh.runtimeOffsetData.animationWeightOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.runtimeOffsetData.allocationOffset, GPU.padding]);
        } else {
            return new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.animationOffset, graphicMesh.runtimeOffsetData.animationWeightOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, 0, 0, GPU.padding]);
        }
    }

    updateAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        const allocationData = this.getAllocationData(graphicMesh);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (graphicMesh.runtimeOffsetData.allocationOffset * 8) * 4);
        GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
        const meshAllocationData = new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.meshOffset, graphicMesh.MAX_MESHES, 0]);
        GPU.writeBuffer(graphicMesh.objectMeshData, meshAllocationData);
    }

    setAllocation(/** @type {GraphicMesh} */graphicMesh) {
        for (const object of this.order) {
        }
        let allocationData;
        if (graphicMesh.parent) {
            allocationData = new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.animationOffset, graphicMesh.runtimeOffsetData.animationWeightOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.runtimeOffsetData.allocationOffset, GPU.padding]);
        } else {
            allocationData = new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.animationOffset, graphicMesh.runtimeOffsetData.animationWeightOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, 0, 0, GPU.padding]);
        }
        GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
    }

    setGroup() {
        this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices.buffer, this.uv.buffer]); // 表示用
        this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr"), [this.renderingVertices.buffer, this.meshes.buffer, this.selectedVertices.buffer, this.weightBlocks.buffer]); // 表示用
        this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.animations.buffer, this.animationWights.buffer, this.allocations.buffer]); // アニメーション用
        this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.renderingVertices.buffer, this.weightBlocks.buffer, this.allocations.buffer]); // 親の変形を適応するた
    }
}