import { device, GPU } from '../webGPU.js';
import { createID, managerForDOMs } from '../UI/制御.js';
import { GraphicMesh } from '../オブジェクト/グラフィックメッシュ.js';
import { BezierModifier } from '../オブジェクト/ベジェモディファイア.js';
import { Bone, Armature } from '../オブジェクト/アーマチュア.js';
import { AnimationCollector } from '../オブジェクト/アニメーションコレクター.js';
import { arrayToSet, createArrayN, indexOfSplice, loadFile, pushArray } from '../utility.js';
import { app, Application } from '../app.js';
import { vec2 } from '../ベクトル計算.js';
import { mathMat3x3 } from '../MathMat.js';

const parallelAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./script/js/app/shader/並列shader.wgsl"));
// const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./script/js/app/shader/伝播shader.wgsl"));
const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Cu"), GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./script/js/app/shader/伝播頂点用shader.wgsl"));
const animationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ローカルアニメーションvec2.wgsl"));
const bezierAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ローカルアニメーションvec2x3.wgsl"));
const boneAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ボーン/アニメーション.wgsl"));
const calculateBoneBaseDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu")], await loadFile("./script/js/app/shader/ボーン/ベースデータ.wgsl"));
const propagateBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"),GPU.getGroupLayout("Csr")], await loadFile("./script/js/app/shader/ボーン/伝播.wgsl"));
const calculateBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ボーン/頂点位置の計算.wgsl"));

const selectOnlyVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw")], await loadFile("./script/js/app/shader/選択/bone/selectOnlyVertices.wgsl"));
const circleSelectBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/bone/selectVertices.wgsl"));
const selectBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/bone/selectBone.wgsl"));
const boneHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/bone/hitTest.wgsl"));

const verticesSelectionToBonesSelectionPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu")], await loadFile("./script/js/app/shader/選択/bone/verticesSelectionToBonesSelection.wgsl"));

const bezierModifierHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/bezier/hitTest.wgsl"));

const boxSelectVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/boxSelectVertices.wgsl"));

const polygonsHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/polygonsHitTest.wgsl"));

const calculateLimitBoneBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Csr_Csr")], await loadFile("./script/js/app/shader/BBox/bone.wgsl"));
const calculateLimitVerticesBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Csr_Csr")], await loadFile("./script/js/app/shader/BBox/vertices.wgsl"));
const BBoxResultBuffer = GPU.createStorageBuffer(2 * 4 * 2, undefined, ["f32"]);
const BBoxCalculateBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["i32"]);
const BBoxGroup0 = GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw"), [BBoxResultBuffer,BBoxCalculateBuffer]);
// const calculateParentWeightForBezier = GPU.createComputePipeline(GPU.getGroupLayout("C_srw_Csr_Cu_Csr_Cu"), await loadFile("./script/js/app/shader/ボーン/重みの設定.wgsl"));
// const calculateParentWeightForBone = GPU.createComputePipeline(GPU.getGroupLayout("C_srw_Cu_Csr_Cu"), );

const objectToNumber = {
    "グラフィックメッシュ": 1,
    "ベジェモディファイア": 2,
    "アーマチュア": 3,
};

function packBuffer(buffer, updateRangeStart, updateRangeNum, packRangeStart) {
    const newBuffer = this.createStorageBuffer(updateRangeNum * 4, undefined, ["f32"]);
    // コピーコマンドを発行
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(buffer, updateRangeStart * 4, newBuffer, 0, updateRangeNum * 4);
    commandEncoder.copyBufferToBuffer(newBuffer, 0, buffer, packRangeStart * 4);
    const commandBuffer = commandEncoder.finish();
    device.queue.submit([commandBuffer]);
}

// そのうち動的ストレージバッファ（dynamic storage buffer）を使うかも
// 全てのグラフィックメッシュの頂点データをまとめて管理する
class GraphicMeshData {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = GPU.createBuffer(0, ["s"]);
        this.meshes = GPU.createBuffer(0, ["v","s"]);
        this.uv = GPU.createBuffer(0, ["s"]);
        this.animations = GPU.createBuffer(0, ["s"]);
        this.weights = GPU.createBuffer(0, ["s"]);
        this.weightBlocks = GPU.createBuffer(0, ["s"]);
        this.allocation = GPU.createBuffer(0, ["s"]);
        this.renderGroup = null;
        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;

        this.selectedVertices = GPU.createBuffer(0, ["s"]);
        this.selectedMesh = GPU.createBuffer(0, ["s"]);

        this.blockByteLength = 2 * 4; // データ一塊のバイト数: vec2<f32>
        this.meshBlockByteLength = 3 * 4; // uint32x3

        this.weightBlockByteLength = (4 + 4) * 4;

        this.order = [];
        this.write = false;
    }

    async getBaseVerticesFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.baseVertices, {start: graphicMesh.vertexBufferOffset, end: graphicMesh.vertexBufferOffset + graphicMesh.verticesNum}, ["f32", "f32"]);
    }

    async getVerticesUVFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.uv, {start: graphicMesh.vertexBufferOffset, end: graphicMesh.vertexBufferOffset + graphicMesh.verticesNum}, ["u32", "u32", "u32"]);
    }

    async getMeshFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.meshes, {start: graphicMesh.vertexBufferOffset, end: graphicMesh.vertexBufferOffset + graphicMesh.verticesNum}, ["f32", "f32"]);
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
        GPU.writeBuffer(this.baseVertices, new Float32Array(verticesBases), graphicMesh.vertexBufferOffset * this.blockByteLength);
        GPU.writeBuffer(this.uv, new Float32Array(verticesUV), graphicMesh.vertexBufferOffset * this.blockByteLength);
        GPU.writeBuffer(this.weightBlocks, GPU.createBitData(verticesParentWeight, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), graphicMesh.vertexBufferOffset * this.weightBlockByteLength);
        const meshesIndexs = [];
        for (const mesh of graphicMesh.allMeshes) {
            meshesIndexs.push(...mesh.indexs);
        }
        GPU.writeBuffer(this.meshes, new Uint32Array(meshesIndexs), graphicMesh.meshBufferOffset * this.meshBlockByteLength);
        this.updateAllocationData(graphicMesh);
    }

    async updateCPUDataFromGPUBuffer(/** @type {GraphicMesh} */graphicMesh, updateContent = {vertex: {base: true, uv: true, weight: true}, mesh: true}) {
        this.write = true;
        const baseArray = updateContent.vertex.base ? await GPU.getVerticesDataFromGPUBuffer(this.baseVertices, graphicMesh.vertexBufferOffset, graphicMesh.verticesNum) : [];
        const uvArray = updateContent.vertex.uv ? await GPU.getVerticesDataFromGPUBuffer(this.uv, graphicMesh.vertexBufferOffset, graphicMesh.verticesNum) : [];
        const weightBlockArray = updateContent.vertex.weight ? await GPU.getStructDataFromGPUBuffer(this.weightBlocks, ["u32","u32","u32","u32","f32","f32","f32","f32"], graphicMesh.vertexBufferOffset, graphicMesh.verticesNum) : [];
        for (const vertex of graphicMesh.allVertices) {
            if (vertex.base != baseArray[vertex.index] || vertex.uv == uvArray[vertex.index]) {
                vertex.updated = true;
            } else {
                vertex.updated = false;
            }
            if (updateContent.vertex.base) {
                vertex.base = baseArray[vertex.index];
            }
            if (updateContent.vertex.uv) {
                vertex.uv = uvArray[vertex.index];
            }
            if (updateContent.vertex.weight) {
                vertex.parentWeight.indexs = weightBlockArray[vertex.index].slice(0,4);
                vertex.parentWeight.weights = weightBlockArray[vertex.index].slice(4,8);
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
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, graphicMesh.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((graphicMesh.MAX_VERTICES * 3) / 32) / 64));
        } else if (option.circle) {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, graphicMesh.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const atomicBuffer = GPU.createStorageBuffer((1 + 1) * 4);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw"), [this.selectedVertices, this.renderingVertices, graphicMesh.objectDataBuffer, optionBuffer, circleBuffer, atomicBuffer]);
            GPU.runComputeShader(selectOnlyVerticesPipeline, [group], Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        }
        const resultBone = await GPU.getSelectedFromBufferBit(this.selectedVertices,graphicMesh.vertexBufferOffset,graphicMesh.vertexBufferOffset + graphicMesh.verticesNum);
        for (const vertex of graphicMesh.allVertices) {
            vertex.selected = resultBone[vertex.index];
        }
        // GPU.consoleBufferData(this.selectedVertices, ["u32"], "当たり判定", {start: Math.ceil(armature.vertexBufferOffset * 2 / 32), num: Math.ceil((armature.MAX_BONES) * 2 / 32)});
        // GPU.consoleBufferData(this.selectedVertices, ["bit"], "当たり判定bool", {start: Math.ceil(armature.vertexBufferOffset * 2 / 32), num: Math.ceil((armature.MAX_BONES) * 2 / 32)});
    }

    setAnimationData(/** @type {GraphicMesh} */graphicMesh, animationData, animtaionIndex) {
        GPU.writeBuffer(this.animations, new Float32Array(animationData), (graphicMesh.animationBufferOffset + animtaionIndex) * this.blockByteLength);
    }

    deleteAnimationData(/** @type {GraphicMesh} */graphicMesh, animtaionIndex) {
        packBuffer(this.animations, (graphicMesh.animationBufferOffset + animtaionIndex) * this.blockByteLength + graphicMesh.MAX_VERTICES * animtaionIndex, graphicMesh.MAX_VERTICES * (graphicMesh.MAX_ANIMATIONS - animtaionIndex), (graphicMesh.animationBufferOffset + animtaionIndex) * this.blockByteLength);
        graphicMesh.animationBlock.updateAnimationsIndex();
    }

    getAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        if (graphicMesh.parent) {
            return new Uint32Array([graphicMesh.vertexBufferOffset, graphicMesh.animationBufferOffset, graphicMesh.weightBufferOffset, graphicMesh.verticesNum, graphicMesh.MAX_ANIMATIONS, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.allocationIndex, GPU.padding]);
        } else {
            return new Uint32Array([graphicMesh.vertexBufferOffset, graphicMesh.animationBufferOffset, graphicMesh.weightBufferOffset, graphicMesh.verticesNum, graphicMesh.MAX_ANIMATIONS, 0, 0, GPU.padding]);
        }
    }

    updateAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(graphicMesh);
        GPU.writeBuffer(this.allocation, allocationData, (graphicMesh.allocationIndex * 8) * 4);
        GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
    }

    prepare(/** @type {GraphicMesh} */graphicMesh) {
        if (!this.order.includes(graphicMesh)) {
            this.order.push(graphicMesh);
            graphicMesh.meshBufferOffset = this.meshes.size / this.meshBlockByteLength;
            graphicMesh.vertexBufferOffset = this.renderingVertices.size / this.blockByteLength;
            graphicMesh.animationBufferOffset = this.animations.size / this.blockByteLength;
            graphicMesh.weightBufferOffset = this.weights.size / (4);
            graphicMesh.allocationIndex = this.order.length - 1;
            let allocationData;
            if (graphicMesh.parent) {
                allocationData = new Uint32Array([graphicMesh.vertexBufferOffset, graphicMesh.animationBufferOffset, graphicMesh.weightBufferOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.allocationIndex, GPU.padding]);
            } else {
                allocationData = new Uint32Array([graphicMesh.vertexBufferOffset, graphicMesh.animationBufferOffset, graphicMesh.weightBufferOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, 0, 0, GPU.padding]);
            }
            const meshAllocationData = new Uint32Array([graphicMesh.vertexBufferOffset, graphicMesh.meshBufferOffset, graphicMesh.MAX_MESHES, 0]);
            GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
            GPU.writeBuffer(graphicMesh.objectMeshData, meshAllocationData);
            this.baseVertices = GPU.appendEmptyToBuffer(this.baseVertices, graphicMesh.MAX_VERTICES * this.blockByteLength); // 元の頂点座標用のメモリを確保
            this.meshes = GPU.appendEmptyToBuffer(this.meshes, graphicMesh.MAX_MESHES * this.meshBlockByteLength); // メッシュ用のメモリを確保
            this.renderingVertices = GPU.appendEmptyToBuffer(this.renderingVertices, graphicMesh.MAX_VERTICES * this.blockByteLength); // アニメーション適用後の頂点座標用のメモリを確保
            this.uv = GPU.appendEmptyToBuffer(this.uv, graphicMesh.MAX_VERTICES * this.blockByteLength); // uv用のメモリを確保
            this.animations = GPU.appendEmptyToBuffer(this.animations, graphicMesh.MAX_ANIMATIONS * graphicMesh.MAX_VERTICES * this.blockByteLength); // アニメーション用のメモリを確保
            this.weights = GPU.appendEmptyToBuffer(this.weights, graphicMesh.MAX_ANIMATIONS * 4); // アニメーション用のメモリを確保
            this.weightBlocks = GPU.appendEmptyToBuffer(this.weightBlocks, graphicMesh.MAX_VERTICES * (4 + 4) * 4); // ウェイトグループ用のメモリを確保
            this.allocation = GPU.appendDataToStorageBuffer(this.allocation, allocationData); // 配分を配分を計算するためのデータ
            this.selectedVertices = GPU.appendEmptyToBuffer(this.selectedVertices, Math.ceil(graphicMesh.MAX_VERTICES / 32) * 4); // 選択状態ようのメモリを確保
            this.selectedMesh = GPU.appendEmptyToBuffer(this.selectedMesh, Math.ceil(graphicMesh.MAX_MESHES / 32) * 4); // 選択状態ようのメモリを確保
            this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices, this.uv]); // 表示用
            this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr"), [this.renderingVertices, this.meshes, this.selectedVertices, this.weightBlocks]); // 表示用
            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices, this.baseVertices, this.animations, this.weights, this.allocation]); // アニメーション用
            this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.renderingVertices, this.weightBlocks, this.allocation]); // 親の変形を適応するた
            console.log("|---グラフィックメッシュメモリ用意---|")
        }
    }
}
class BezierModifierData {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = GPU.createBuffer(0, ["s"]);
        this.animations = GPU.createBuffer(0, ["s"]);
        this.weights = GPU.createBuffer(0, ["s"]);
        this.weightBlocks = GPU.createBuffer(0, ["s"]);
        this.allocation = GPU.createBuffer(0, ["s"]);

        this.selectedVertices = GPU.createBuffer(0, ["s"]);

        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;

        this.myType = 2;

        this.blockByteLength = 2 * 4 * 3; // データ一塊のバイト数: vec2<f32> * 3
        this.weightBlockByteLength = (4 + 4) * 4 * 3;

        this.order = [];
    }

    // 選択
    selectedForVertices(/** @type {BezierModifier} */ bezierModifier, object, option) {
        const optionBuffer = GPU.createUniformBuffer((2) * 4, [option.add,3], ["u32"]);
        // console.log("最大頂点数", graphicMesh.MAX_VERTICES, "起動されるグループ数", Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, bezierModifier.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((bezierModifier.MAX_VERTICES * 3) / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, bezierModifier.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil((bezierModifier.MAX_VERTICES * 3) / 32) / 64));
        }
        // GPU.consoleBufferData(this.selectedVertices, ["u32"], "当たり判定", {start: Math.ceil(armature.vertexBufferOffset * 2 / 32), num: Math.ceil((armature.MAX_BONES) * 2 / 32)});
        // GPU.consoleBufferData(this.selectedVertices, ["bit"], "当たり判定bool", {start: Math.ceil(armature.vertexBufferOffset * 2 / 32), num: Math.ceil((armature.MAX_BONES) * 2 / 32)});
    }

    async getBaseVerticesFromObject(/** @type {BezierModifier} */bezierModifier) {
        return await GPU.getBufferDataFromIndexs(this.baseVertices, {start: bezierModifier.vertexBufferOffset, end: bezierModifier.vertexBufferOffset + bezierModifier.verticesNum}, ["f32", "f32"]);
    }

    async updateCPUDataFromGPUBuffer(/** @type {BezierModifier} */bezierModifier, updateContent = {base: true, weight: true}) {
        this.write = true;
        const baseArray = updateContent.base ? await GPU.getVerticesDataFromGPUBuffer(this.baseVertices, bezierModifier.vertexBufferOffset * 3, bezierModifier.verticesNum) : [];
        const weightBlockArray = updateContent.weight ? await GPU.getStructDataFromGPUBuffer(this.weightBlocks, ["u32","u32","u32","u32","f32","f32","f32","f32"], bezierModifier.vertexBufferOffset * 3, bezierModifier.verticesNum) : [];
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
                if (updateContent.base) {
                    vertex.co = baseArray[point.index * 3 + i];
                }
                if (updateContent.weight) {
                    vertex.parentWeight.indexs = weightBlockArray[point.index * 3 + i].slice(0,4);
                    vertex.parentWeight.weights = weightBlockArray[point.index * 3 + i].slice(4,8);
                }
            }
        }
        this.write = false;
    }

    updateBaseData(/** @type {BezierModifier} */bezierModifier) {
        bezierModifier.pointNum = bezierModifier.allPoint.length;
        bezierModifier.verticesNum = bezierModifier.pointNum * 3;
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
        GPU.writeBuffer(this.baseVertices, new Float32Array(verticesBases), bezierModifier.vertexBufferOffset * this.blockByteLength);
        GPU.writeBuffer(this.weightBlocks, GPU.createBitData(verticesParentWeight, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), bezierModifier.vertexBufferOffset * this.weightBlockByteLength);
        this.updateAllocationData(bezierModifier);
    }

    updateAllocationData(/** @type {BezierModifier} */bezierModifier) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(bezierModifier);
        GPU.writeBuffer(this.allocation, allocationData, (bezierModifier.allocationIndex * 8) * 4);
        GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {BezierModifier} */bezierModifier) {
        if (bezierModifier.parent) {
            return new Uint32Array([bezierModifier.vertexBufferOffset, bezierModifier.animationBufferOffset, bezierModifier.weightBufferOffset, bezierModifier.verticesNum, bezierModifier.MAX_ANIMATIONS, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.allocationIndex, this.myType]);
        } else {
            return new Uint32Array([bezierModifier.vertexBufferOffset, bezierModifier.animationBufferOffset, bezierModifier.weightBufferOffset, bezierModifier.verticesNum, bezierModifier.MAX_ANIMATIONS, 0, 0, this.myType]);
        }
    }

    setAnimationData(/** @type {BezierModifier} */bezierModifier, animationData, animtaionIndex) {
        GPU.writeBuffer(this.animations, new Float32Array(animationData), (bezierModifier.animationBufferOffset + animtaionIndex) * this.blockByteLength);
    }

    updateParent(/** @type {BezierModifier} */bezierModifier) {
        let allocationData;
        if (bezierModifier.parent) {
            allocationData = new Uint32Array([bezierModifier.vertexBufferOffset, bezierModifier.animationBufferOffset, bezierModifier.weightBufferOffset, bezierModifier.MAX_VERTICES, bezierModifier.MAX_ANIMATIONS, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.allocationIndex, this.myType]);
        } else {
            allocationData = new Uint32Array([bezierModifier.vertexBufferOffset, bezierModifier.animationBufferOffset, bezierModifier.weightBufferOffset, bezierModifier.MAX_VERTICES, bezierModifier.MAX_ANIMATIONS, 0, 0, this.myType]);
        }
        console.log(allocationData)
        GPU.writeBuffer(this.allocation, allocationData, (bezierModifier.allocationIndex * 8) * 4);
        GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
    }

    prepare(/** @type {BezierModifier} */bezierModifier) {
        if (!this.order.includes(bezierModifier)) {
            this.order.push(bezierModifier);
            bezierModifier.vertexBufferOffset = this.renderingVertices.size / this.blockByteLength;
            bezierModifier.animationBufferOffset = this.animations.size / this.blockByteLength;
            bezierModifier.weightBufferOffset = this.weights.size / 4;
            bezierModifier.allocationIndex = this.order.length - 1;
            let allocationData;
            if (bezierModifier.parent) {
                allocationData = new Uint32Array([bezierModifier.vertexBufferOffset, bezierModifier.animationBufferOffset, bezierModifier.weightBufferOffset, bezierModifier.MAX_VERTICES, bezierModifier.MAX_ANIMATIONS, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.allocationIndex, GPU.padding]);
            } else {
                allocationData = new Uint32Array([bezierModifier.vertexBufferOffset, bezierModifier.animationBufferOffset, bezierModifier.weightBufferOffset, bezierModifier.MAX_VERTICES, bezierModifier.MAX_ANIMATIONS, 0, 0, GPU.padding]);
            }
            GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
            this.baseVertices = GPU.appendEmptyToBuffer(this.baseVertices, bezierModifier.MAX_VERTICES * this.blockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingVertices = GPU.appendEmptyToBuffer(this.renderingVertices, bezierModifier.MAX_VERTICES * this.blockByteLength); // アニメーション適用後の頂点座標用のメモリを確保
            this.animations = GPU.appendEmptyToBuffer(this.animations, bezierModifier.MAX_ANIMATIONS * bezierModifier.MAX_VERTICES * this.blockByteLength); // アニメーション用のメモリを確保
            this.weights = GPU.appendEmptyToBuffer(this.weights, bezierModifier.MAX_ANIMATIONS * 4); // アニメーション用のメモリを確保
            this.weightBlocks = GPU.appendEmptyToBuffer(this.weightBlocks, bezierModifier.MAX_VERTICES * (4 + 4) * 4); // ウェイト用のメモリを確保
            this.allocation = GPU.appendDataToStorageBuffer(this.allocation, allocationData); // 配分を配分を計算するためのデータ

            this.selectedVertices = GPU.appendEmptyToBuffer(this.selectedVertices, Math.ceil((bezierModifier.MAX_VERTICES * 3) / 32) * 4); // 選択状態ようのメモリを確保

            this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices,this.selectedVertices]); // 表示用
            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices, this.baseVertices, this.animations, this.weights, this.allocation]); // アニメーション用
            // this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.renderingVertices, this.weightBlocks, this.allocation]); // 親の変形を適応するた
            this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingVertices, this.baseVertices, this.allocation]); // 子の変形用データ
            this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices, this.baseVertices, this.allocation, this.weightBlocks]); // 親の変形を適応するた
            // bezierModifier.individualGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu"), [{type: "b", item: {buffer: this.renderingVertices, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * this.blockByteLength}}, {type: "b", item: {buffer: this.weightBlocks, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * (4 + 4) * 4}}, bezierModifier.objectDataBuffer]);
            // bezierModifier.individualGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [{type: "b", item: {buffer: this.renderingVertices, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * this.blockByteLength}}, {type: "b", item: {buffer: this.weightBlocks, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * (4 + 4) * 4}}, bezierModifier.objectDataBuffer]);
            bezierModifier.individualGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [bezierModifier.objectDataBuffer]);
            console.log("|---ベジェモディファイアメモリ用意---|")
        }
    }
}
class ArmatureData {
    constructor(/** @type {Application} */ app) {
        this.app = app;

        // 頂点で表示したとき
        this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = GPU.createBuffer(0, ["s"]);

        // ボーンのデータ
        this.renderingBone = GPU.createBuffer(0, ["s"]); // アニメーション時の親とのローカルデータ
        this.baseBone = GPU.createBuffer(0, ["s"]); // ベース時の親とのローカルデータ

        this.selectedVertices = GPU.createBuffer(0, ["s"]);
        this.selectedBones = GPU.createBuffer(0, ["s"]);

        // ボーンの行列データ
        this.renderingBoneMatrix = GPU.createBuffer(0, ["s"]);
        this.baseBoneMatrix = GPU.createBuffer(0, ["s"]);

        this.runtimeAnimationData = GPU.createBuffer(0, ["s"]);

        // ボーンの色
        this.relationships = GPU.createBuffer(0, ["s"]); // 親のindex
        this.colors = GPU.createBuffer(0, ["s"]);
        this.allocation = GPU.createBuffer(0, ["s"]);
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;
        this.calculateVerticesPositionGroup = null;
        this.renderingGizumoGroup = null;

        this.boneBlockByteLength = 6 * 4; // データ一塊のバイト数: f32 * 6
        this.matrixBlockByteLength = 4 * 3 * 4; // データ一塊のバイト数: mat3x3<f32> (paddingでmat4x3<f32>になる)
        this.vertexBlockByteLength = 2 * 2 * 4; // 頂点データ一塊のバイト数: vec2<f32> * 2

        this.colorBlockByteLength = 4 * 4;

        this.allBoneNum = 0;

        this.allBone = [];

        this.propagate = [];
        this.order = [];
    }

    async getBoneWorldMatrix(/** @type {Bone} */bone) {
        bone.matrix = mathMat3x3.mat4x3ValuesToMat3x3(await GPU.getF32BufferPartsData(this.renderingBoneMatrix, bone.armature.vertexBufferOffset + bone.index, this.matrixBlockByteLength / 4));
    }

    getSelectBone() {
        return this.allBone.filter(bone => bone && bone.selectedBone);
    }

    async getAnimationData(/** @type {Armature} */ armature, indexs) {
        return ;
    }

    // 選択
    async selectedForVertices(/** @type {Armature} */ armature, object, option) {
        const optionBuffer = GPU.createUniformBuffer((2) * 4, [option.add,2], ["u32"]);
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, armature.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((armature.MAX_BONES * 2) / 32) / 64));
        } else if (option.circle) {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, armature.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil((armature.MAX_BONES * 2) / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const atomicBuffer = GPU.createStorageBuffer((1 + 1) * 4);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw"), [this.selectedVertices, this.renderingVertices, armature.objectDataBuffer, optionBuffer, circleBuffer, atomicBuffer]);
            GPU.runComputeShader(selectOnlyVerticesPipeline, [group], Math.ceil(Math.ceil(armature.MAX_BONES * 2 / 32) / 64));
        }
        GPU.runComputeShader(verticesSelectionToBonesSelectionPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu"), [this.selectedBones,this.selectedVertices,armature.objectDataBuffer])], Math.ceil(Math.ceil(armature.MAX_BONES / 32) / 64));
        const resultVertices = await GPU.getSelectedFromBufferBit(this.selectedVertices,armature.vertexBufferOffset * 2,(armature.vertexBufferOffset + armature.boneNum) * 2);
        for (const bone of armature.allBone) {
            bone.selectedHead = resultVertices[bone.index * 2];
            bone.selectedTail = resultVertices[bone.index * 2 + 1];
        }
        const resultBone = await GPU.getSelectedFromBufferBit(this.selectedBones,armature.vertexBufferOffset,armature.vertexBufferOffset + armature.boneNum);
        for (const bone of armature.allBone) {
            bone.selectedBone = resultBone[bone.index];
        }
    }

    getSelectVerticesInBone() {
        const result = [];
        for (const bone of this.allBone) {
            if (bone) {
                if (bone.selectedHead || bone.selectedTail) {
                    result.push(bone);
                }
            }
        }
        return result;
    }

    getSelectVerticesIndex() {
        const result = [];
        for (const bone of this.allBone) {
            if (bone) {
                if (bone.selectedHead) {
                    result.push((bone.index + bone.armature.vertexBufferOffset) * 2);
                }
                if (bone.selectedTail) {
                    result.push((bone.index + bone.armature.vertexBufferOffset) * 2 + 1);
                }
            }
        }
        return result;
    }

    async selectedForBone(/** @type {Armature} */ armature, object, option) {
        const optionBuffer = GPU.createUniformBuffer(4, [option.add], ["u32"]);
        // console.log("最大頂点数", graphicMesh.MAX_VERTICES, "起動されるグループ数", Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, armature.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil(armature.MAX_BONES / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedBones, this.renderingVertices, armature.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(selectBonePipeline, [group], Math.ceil(Math.ceil(armature.MAX_BONES / 32) / 64));
        }
        const result = await GPU.getSelectedFromBufferBit(this.selectedBones,armature.vertexBufferOffset,armature.vertexBufferOffset + armature.boneNum);
        for (const bone of armature.allBone) {
            bone.selectedBone = result[bone.index];
        }
        managerForDOMs.update("ボーン選択");
    }

    updatePropagateData() {
        const propagateCPU = [];
        const relationshipsKeep = createArrayN(this.allBoneNum);
        for (const /** @type {Armature} */armature of this.order) {
            const roop = (bones, depth = 0) => {
                for (const /** @type {Bone} */ bone of bones) {
                    const parent = bone.parent;
                    if (parent) { // 親がいる場合
                        if (propagateCPU.length <= depth) {
                            propagateCPU.push([]);
                        }
                        propagateCPU[depth].push(bone.index + armature.vertexBufferOffset, parent.index + armature.vertexBufferOffset);
                        relationshipsKeep[bone.index + armature.vertexBufferOffset] = parent.index + armature.vertexBufferOffset;
                        roop(bone.childrenBone, depth + 1);
                    } else { // ルートボーンの場合
                        relationshipsKeep[bone.index + armature.vertexBufferOffset] = bone.index + armature.vertexBufferOffset;
                        roop(bone.childrenBone, 0);
                    }
                }
            }
            roop(armature.root);
        }
        this.propagate.length = 0;
        for (const data of propagateCPU) {
            const buffer = GPU.createStorageBuffer(data.length * 4, data, ["u32","u32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csr"), [buffer]);
            this.propagate.push({boneNum: data.length / 2, buffer: buffer, group: group, array: data});
        }
        GPU.writeBuffer(this.relationships, new Uint32Array(relationshipsKeep));
    }

    async updateCPUDataFromGPUBuffer(/** @type {Armature} */armature) {
        const verticesArray = await GPU.getVerticesDataFromGPUBuffer(this.baseVertices, armature.vertexBufferOffset * 2,armature.verticesNum);
        for (const bone of armature.allBone) {
            bone.baseHead = verticesArray[bone.index * 2];
            bone.baseTail = verticesArray[bone.index * 2 + 1];
        }
    }

    // ベースデータの更新
    updateBaseData(/** @type {Armature} */armature) {
        armature.boneNum = armature.allBone.length;
        armature.verticesNum = armature.boneNum * 2;
        console.log("|---ボーンベース---|")
        const boneVerticesData = Array(armature.boneNum * this.vertexBlockByteLength / 4).fill(0);
        const colorsData = Array(armature.boneNum * this.colorBlockByteLength / 4).fill(0);

        const parentsData = Array(armature.boneNum).fill(0);
        for (const bone of armature.allBone) {
            if (bone.parent) {
                parentsData[bone.index] = bone.parent.index;
            } else {
                parentsData[bone.index] = bone.index;
            }
            arrayToSet(boneVerticesData, bone.baseHead.concat(bone.baseTail), bone.index, 4);
            arrayToSet(colorsData, bone.color, bone.index, 4);
        }
        armature.parentsBuffer = GPU.createStorageBuffer(parentsData.length * 4, parentsData, ["u32"]);

        GPU.writeBuffer(this.baseVertices, new Float32Array(boneVerticesData), armature.vertexBufferOffset * this.vertexBlockByteLength);
        GPU.writeBuffer(this.colors, new Float32Array(colorsData), armature.vertexBufferOffset * this.colorBlockByteLength);

        for (let i = armature.vertexBufferOffset; i < armature.vertexBufferOffset + armature.MAX_BONES; i ++) {
            this.allBone[i] = null;
        }
        for (const bone of armature.allBone) {
            this.allBone[armature.vertexBufferOffset + bone.index] = bone;
        }

        this.updateAllocationData(armature);
        this.calculateBaseBoneData(armature);
        this.updatePropagateData();
    }

    calculateBaseBoneData(armature) {
        GPU.runComputeShader(calculateBoneBaseDataPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu"), [this.baseBone, this.baseBoneMatrix, this.baseVertices, armature.parentsBuffer, armature.objectDataBuffer])], Math.ceil(armature.boneNum / 64));
    }

    updateAllocationData(/** @type {Armature} */armature) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(armature);
        GPU.writeBuffer(this.allocation, allocationData, (armature.allocationIndex * 8) * 4);
        GPU.writeBuffer(armature.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {Armature} */armature) {
        return new Uint32Array([armature.vertexBufferOffset, 0, 0, armature.boneNum, 0, 0, 0, GPU.padding]);
    }

    prepare(/** @type {Armature} */armature) {
        if (!this.order.includes(armature)) {
            this.order.push(armature);
            armature.vertexBufferOffset = this.renderingBoneMatrix.size / this.matrixBlockByteLength;
            console.log(armature);
            armature.allocationIndex = this.order.length - 1;
            // 頂点分の確保
            this.baseVertices = GPU.appendEmptyToBuffer(this.baseVertices, armature.MAX_BONES * this.vertexBlockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingVertices = GPU.appendEmptyToBuffer(this.renderingVertices, armature.MAX_BONES * this.vertexBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            // ボーン分の確保
            this.baseBone = GPU.appendEmptyToBuffer(this.baseBone, armature.MAX_BONES * this.boneBlockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingBone = GPU.appendEmptyToBuffer(this.renderingBone, armature.MAX_BONES * this.boneBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            // 行列分の確保
            this.baseBoneMatrix = GPU.appendEmptyToBuffer(this.baseBoneMatrix, armature.MAX_BONES * this.matrixBlockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingBoneMatrix = GPU.appendEmptyToBuffer(this.renderingBoneMatrix, armature.MAX_BONES * this.matrixBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            this.selectedVertices = GPU.appendEmptyToBuffer(this.selectedVertices, Math.ceil((armature.MAX_BONES * 2) / 32) * 4); // 選択状態ようのメモリを確保
            this.selectedBones = GPU.appendEmptyToBuffer(this.selectedBones, Math.ceil(armature.MAX_BONES / 32) * 4); // 選択状態ようのメモリを確保

            this.colors = GPU.appendEmptyToBuffer(this.colors, armature.MAX_BONES * this.colorBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            this.relationships = GPU.appendEmptyToBuffer(this.relationships, armature.MAX_BONES * 4); // アニメーション適用後の頂点座標用のメモリを確保

            this.allocation = GPU.appendEmptyToBuffer(this.allocation, 8 * 4); // 配分を配分を計算するためのデータ

            this.allBoneNum += armature.MAX_BONES;

            this.allBone.length += armature.MAX_BONES;

            this.runtimeAnimationData = GPU.appendEmptyToBuffer(this.runtimeAnimationData, armature.MAX_BONES * this.boneBlockByteLength);

            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingBoneMatrix, this.baseBone, this.runtimeAnimationData, this.allocation]); // アニメーション用
            this.propagateGroup = GPU.createGroup(GPU.getGroupLayout("Csrw"), [this.renderingBoneMatrix]); // 伝播用
            this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingBoneMatrix, this.baseBoneMatrix, this.allocation]); // 子の変形用データ
            this.calculateVerticesPositionGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices, this.renderingBoneMatrix, this.baseBone, this.allocation]);
            this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr"), [this.renderingVertices, this.colors, this.relationships, this.selectedVertices, this.selectedBones]); // 表示用
            console.log("|---アーマチュアメモリ用意---|")
        }
    }
}

class RuntimeData {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.graphicMeshData = new GraphicMeshData(app);
        this.armatureData = new ArmatureData(app);
        this.bezierModifierData = new BezierModifierData(app);
    }

    getID(object) {
        console.log("呼び出された")
        let index = 0;
        if (object.type == "ベジェモディファイア") {
            index = this.bezierModifierData.order.indexOf(object);
        }
        console.log(index)
        return index;
    }
}

class Objects {
    constructor(app) {
        this.app = app;
        this.animationCollectors = [];
        this.bezierModifiers = [];
        this.graphicMeshs = [];
        this.armatures = [];
        this.keyframeBlocks = [];

        this.allObject = [];
    }

    destroy() {
        this.allObject.length = 0;
        this.animationCollectors.length = 0;
        this.bezierModifiers.length = 0;
        this.graphicMeshs.length = 0;
        this.armatures.length = 0;
        this.keyframeBlocks.length = 0;
    }

    createObject(data) {
        let objectType = data.objectType;
        let dataType = data.dataType
        if (objectType == "アニメーションコレクター") {
            return new AnimationCollector("名称未設定");
        }else if (objectType == "グラフィックメッシュ") {
            return new GraphicMesh("名称未設定", undefined, this.app.options.getPrimitiveData("graphicMesh", dataType));
        } else if (objectType == "ベジェモディファイア") {
            return new BezierModifier("名称未設定", undefined, this.app.options.getPrimitiveData("bezierModifier", dataType));
        } else if (objectType == "アーマチュア") {
            return new Armature("名称未設定", undefined, this.app.options.getPrimitiveData("boneModifer", dataType));
        }
    }

    createObjectAndSetUp(data) {
        let object;
        if (data.saveData) { // セーブデータからオブジェクトを作る
            data = data.saveData;
            if (!data.type || data.type == "グラフィックメッシュ") {
                object = new GraphicMesh(data.name,data.id, data);
                this.graphicMeshs.push(object);
                this.isChangeObjectsZindex = true;
            } else if (data.type == "ベジェモディファイア") {
                object = new BezierModifier(data.name,data.id, data);
                this.bezierModifiers.push(object);
            } else if (data.type == "アーマチュア") {
                console.log(data)
                object = new Armature(data.name,data.id,data);
                // object.init(data);
                this.armatures.push(object);
            } else if (data.type == "アニメーションコレクター" || data.type == "am") {
                object = new AnimationCollector(data.name,data.id);
                object.init(data);
                this.animationCollectors.push(object);
                managerForDOMs.update(this.animationCollectors);
            }
        } else { // 空のオブジェクトを作る
            let objectType = data.objectType;
            let dataType = data.dataType
            if (objectType == "アニメーションコレクター") {
                object = new AnimationCollector("名称未設定");
                this.animationCollectors.push(object);
                managerForDOMs.update(this.animationCollectors);
            } else {
                if (objectType == "グラフィックメッシュ") {
                    object = new GraphicMesh("名称未設定", undefined, this.app.options.getPrimitiveData("graphicMesh", dataType));
                    this.graphicMeshs.push(object);
                    this.isChangeObjectsZindex = true;
                } else if (objectType == "ベジェモディファイア") {
                    object = new BezierModifier("名称未設定", undefined, this.app.options.getPrimitiveData("bezierModifier", dataType));
                    this.bezierModifiers.push(object);
                } else if (objectType == "アーマチュア") {
                    object = new Armature("名称未設定", undefined, this.app.options.getPrimitiveData("boneModifer", dataType));
                    this.armatures.push(object);
                }
            }
        }
        pushArray(this.allObject,object);
        return object;
    }

    // オブジェクトの所属する配列を返す
    searchArrayFromObject(object) {
        if (object.type == "グラフィックメッシュ") {
            return this.graphicMeshs;
        } else if (object.type == "ベジェモディファイア") {
            return this.bezierModifiers;
        } else if (object.type == "アーマチュア") {
            return this.armatures;
        } else if (object.type == "アニメーションコレクター") {
            return this.animationCollectors;
        } else if (object.type == "キーフレームブロック") {
            return this.keyframeBlocks;
        }
    }

    // 属性から所属する配列を返す
    searchArrayFromType(type) {
        if (type == "グラフィックメッシュ") {
            return this.graphicMeshs;
        } else if (type == "ベジェモディファイア") {
            return this.bezierModifiers;
        } else if (type == "アーマチュア") {
            return this.armatures;
        } else if (type == "アニメーションコレクター") {
            return this.animationCollectors;
        } else if (type == "キーフレームブロック") {
            return this.keyframeBlocks;
        }
    }

    // オブジェクトの削除
    deleteObject(object) {
        indexOfSplice(this.searchArrayFromObject(object), object);
        indexOfSplice(this.allObject, object);
    }

    appendObject(object) {
        this.app.hierarchy.addHierarchy("",object); // ヒエラルキーから削除
        this.searchArrayFromType(object.type).push(object);
        this.allObject.push(object);
    }
}

// オブジェクトの保持・設定
export class Scene {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.objects = new Objects(app);

        this.renderingOrder = [];

        this.text = [];

        // フレーム範囲
        this.frame_start = 0;
        this.frame_end = 30;

        // 現在のフレーム
        this.frame_current = 0;

        // 背景
        this.world = new World(app);

        this.runtimeData = new RuntimeData(app);

        this.state = new State(app);

        this.maskTextures = [
            new MaskTexture("base", [1,1]),
            new MaskTexture("test1", [1024,1024]),
        ];

        if (true) { // 白のマスクテクスチャ
            const commandEncoder = device.createCommandEncoder();
            const value = this.maskTextures[0];
            const maskRenderPass = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: value.textureView,
                        clearValue: { r: 1, g: 0, b: 0, a: 0 },
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
            });
            // 処理の終了と送信
            maskRenderPass.end();
            device.queue.submit([commandEncoder.finish()]);
        }

        const updateKeyframe = () => {
            this.updateAnimation(this.frame_current);
        }

        managerForDOMs.set({o: this, g: "_", i: "frame_current"}, null, updateKeyframe);
    }

    init() {
    }

    // 選択している頂点のBBoxを取得
    async getSelectVerticesBBox(verticesBuffer, selectBuffer) {
        GPU.runComputeShader(calculateLimitVerticesBBoxPipeline, [BBoxGroup0, GPU.createGroup(GPU.getGroupLayout("Csr_Csr"), [verticesBuffer, selectBuffer])], Math.ceil(verticesBuffer.size / 4 / 2 / 64));
        return await GPU.getBBoxBuffer(BBoxResultBuffer);
    }

    // 選択しているボーンのBBoxを取得
    async getSelectBonesBBox(bonesBuffer, selectBuffer) {
        GPU.runComputeShader(calculateLimitBoneBBoxPipeline, [BBoxGroup0, GPU.createGroup(GPU.getGroupLayout("Csr_Csr"), [bonesBuffer, selectBuffer])], Math.ceil(bonesBuffer.size / 4 / 2 / 64));
        return await GPU.getBBoxBuffer(BBoxResultBuffer);
    }

    // 選択している頂点の中央点を取得
    async getSelectVerticesCenter(verticesBuffer, selectBuffer) {
        const BBox = await this.getSelectVerticesBBox(verticesBuffer, selectBuffer);
        return vec2.averageR(BBox);
    }

    // 選択している頂点の中央点を取得
    async getSelectBonesCenter(bonesBuffer, selectBuffer) {
        const BBox = await this.getSelectBonesBBox(bonesBuffer, selectBuffer);
        return vec2.averageR(BBox);
    }

    // オブジェクトとの当たり判定
    // async selectedForObject(point, option = {types: ["グラフィックメッシュ", "アーマチュア", "ベジェモディファイア"], depth: true}) {
    //     const optionBuffer = GPU.createUniformBuffer(4, [0], ["u32"]);
    //     const pointBuffer = GPU.createUniformBuffer(2 * 4, [...point], ["f32"]);
    //     const resultBuffer = GPU.createStorageBuffer(4, [0], ["u32"]);
    //     const result = [];
    //     for (const object of this.objects.allObject) {
    //         if (option.types.includes(object.type)) {
    //             if (object.type == "グラフィックメッシュ") {
    //                 const hitTestGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu"), [resultBuffer, this.runtimeData.graphicMeshData.renderingVertices, this.runtimeData.graphicMeshData.meshes, object.objectMeshData, optionBuffer, pointBuffer]);
    //                 GPU.runComputeShader(polygonsHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_MESHES / 64));
    //             } else if (object.type == "アーマチュア") {
    //                 const hitTestGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [resultBuffer, this.runtimeData.armatureData.renderingVertices, object.objectDataBuffer, optionBuffer, pointBuffer]);
    //                 GPU.runComputeShader(boneHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_BONES / 64));
    //             } else if (object.type == "ベジェモディファイア") {
    //                 const hitTestGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [resultBuffer, this.runtimeData.bezierModifierData.renderingVertices, object.objectDataBuffer, optionBuffer, pointBuffer]);
    //                 GPU.runComputeShader(bezierModifierHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_VERTICES / 64));
    //             }
    //             const resultBufferData = await GPU.getU32BufferData(resultBuffer, 4);
    //             if (1 == resultBufferData[0]) {
    //                 result.push(object);
    //             }
    //         }
    //     }
    //     if (option.depth) {
    //         result.sort((a, b) => b.zIndex - a.zIndex);
    //     }
    //     return result;
    // }
    async selectedForObject(point, option = {types: ["グラフィックメッシュ", "アーマチュア", "ベジェモディファイア"], depth: true}) {
        const optionBuffer = GPU.createUniformBuffer(4, [0], ["u32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, [...point], ["f32"]);
        const result = [];
        const promises = this.objects.allObject
            .filter(object => option.types.includes(object.type) && !("visible" in object && !object.visible))
            .map(async (object) => {
                const resultBuffer = GPU.createStorageBuffer(4, [0], ["u32"]);
                let hitTestGroup;
                if (object.type === "グラフィックメッシュ") {
                    hitTestGroup = GPU.createGroup(
                        GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu"),
                        [
                            resultBuffer,
                            this.runtimeData.graphicMeshData.renderingVertices,
                            this.runtimeData.graphicMeshData.meshes,
                            object.objectMeshData,
                            optionBuffer,
                            pointBuffer
                        ]
                    );
                    GPU.runComputeShader(polygonsHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_MESHES / 64));
                } else if (object.type === "アーマチュア") {
                    hitTestGroup = GPU.createGroup(
                        GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"),
                        [
                            resultBuffer,
                            this.runtimeData.armatureData.renderingVertices,
                            object.objectDataBuffer,
                            optionBuffer,
                            pointBuffer
                        ]
                    );
                    GPU.runComputeShader(boneHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_BONES / 64));
                } else if (object.type === "ベジェモディファイア") {
                    hitTestGroup = GPU.createGroup(
                        GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"),
                        [
                            resultBuffer,
                            this.runtimeData.bezierModifierData.renderingVertices,
                            object.objectDataBuffer,
                            optionBuffer,
                            pointBuffer
                        ]
                    );
                    GPU.runComputeShader(bezierModifierHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_VERTICES / 64));
                }
                const resultBufferData = await GPU.getU32BufferData(resultBuffer, 4);
                if (resultBufferData[0] === 1) {
                    return object;
                } else {
                    return null;
                }
            });
        const allResults = await Promise.all(promises);
        for (const obj of allResults) {
            if (obj) result.push(obj);
        }
        if (option.depth) {
            result.sort((a, b) => b.zIndex - a.zIndex);
        }
        return result;
    }

    update() {
        if (!(this.objects.armatures.length || this.objects.graphicMeshs.length || this.objects.bezierModifiers.length)) return ;
        // バグ(アニメーションindexを考慮してないのでアニメーションが2個以上あると書き込まれるweightがかぶる)
        for (const graphicMesh of this.objects.graphicMeshs) {
            graphicMesh.animationBlock.animationBlock.forEach(animation => {
                GPU.writeBuffer(this.runtimeData.graphicMeshData.weights, new Float32Array([animation.weight]), (graphicMesh.weightBufferOffset + animation.index) * 4);
            });
        }
        for (const bezierModifier of this.objects.bezierModifiers) {
            bezierModifier.animationBlock.animationBlock.forEach(animation => {
                GPU.writeBuffer(this.runtimeData.bezierModifierData.weights, new Float32Array([animation.weight]), bezierModifier.weightBufferOffset * 4);
            });
        }
        for (const armature of this.objects.armatures) {
            armature.allBone.forEach(bone => {
                if (bone) {
                    GPU.writeBuffer(this.runtimeData.armatureData.runtimeAnimationData, new Float32Array([bone.x, bone.y, bone.sx, bone.sy, bone.r]), (armature.vertexBufferOffset + bone.index) * this.runtimeData.armatureData.boneBlockByteLength);
                }
            });
        }
        const computeCommandEncoder = device.createCommandEncoder();
        const computePassEncoder = computeCommandEncoder.beginComputePass();
        if (this.objects.graphicMeshs.length) {
            computePassEncoder.setPipeline(animationApplyPipeline);
            computePassEncoder.setBindGroup(0, this.runtimeData.graphicMeshData.animationApplyGroup); // 全てのグラフィックスメッシュのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }
        if (this.objects.bezierModifiers.length) {
            computePassEncoder.setPipeline(bezierAnimationApplyPipeline);
            computePassEncoder.setBindGroup(0, this.runtimeData.bezierModifierData.animationApplyGroup); // 全てのベジェモディファイアのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.bezierModifiers.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }
        if (this.objects.armatures.length) {
            computePassEncoder.setPipeline(boneAnimationApplyPipeline);
            computePassEncoder.setBindGroup(0, this.runtimeData.armatureData.animationApplyGroup); // 全てのアーマチュアのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.armatures.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }

        // ボーンを伝播
        computePassEncoder.setPipeline(propagateBonePipeline);
        computePassEncoder.setBindGroup(0, this.runtimeData.armatureData.propagateGroup); // 全てのアーマチュアのデータをバインド
        for (const nowDepthData of this.runtimeData.armatureData.propagate) {
            computePassEncoder.setBindGroup(1, nowDepthData.group); // 全てのアーマチュアのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(nowDepthData.boneNum / 64), 1, 1); // ワークグループ数をディスパッチ
        }

        const childrenRoop = (children) => {
            for (const child of children) {
                if (child.parent) {
                    if (child.type == "ベジェモディファイア") {
                        // ベジェモディファイア親の変形を適応
                        computePassEncoder.setBindGroup(0, child.individualGroup);
                        computePassEncoder.dispatchWorkgroups(Math.ceil(child.verticesNum / 64), 1, 1); // ワークグループ数をディスパッチ
                    }
                }
                if (child.children) { // 子要素がある場合ループする
                    childrenRoop(child.children.objects);
                }
            }
        }
        computePassEncoder.setBindGroup(1, this.runtimeData.bezierModifierData.parentApplyGroup);
        computePassEncoder.setBindGroup(2, this.runtimeData.armatureData.applyParentGroup);
        computePassEncoder.setPipeline(treeAnimationApplyPipeline);
        childrenRoop(this.app.hierarchy.root);

        // グラフィックメッシュ親の変形を適応
        if (this.objects.graphicMeshs.length) {
            computePassEncoder.setBindGroup(1, this.runtimeData.bezierModifierData.applyParentGroup);
            computePassEncoder.setBindGroup(0, this.runtimeData.graphicMeshData.parentApplyGroup);
            computePassEncoder.setPipeline(parallelAnimationApplyPipeline);
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }

        if (this.objects.armatures.length) {
            computePassEncoder.setBindGroup(0, this.runtimeData.armatureData.calculateVerticesPositionGroup);
            computePassEncoder.setPipeline(calculateBoneVerticesPipeline);
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.armatures.length / 8), Math.ceil(this.app.appConfig.MAX_BONES_PER_ARMATURE / 8), 1); // ワークグループ数をディスパッチ
        }

        computePassEncoder.end();

        for (const /** @type {GraphicMesh} */object of this.objects.graphicMeshs) {
            if (object.mode == "メッシュ編集") {
                computeCommandEncoder.copyBufferToBuffer(this.runtimeData.graphicMeshData.baseVertices, object.vertexBufferOffset * 2 * 4, this.runtimeData.graphicMeshData.renderingVertices, object.vertexBufferOffset * 2 * 4, object.verticesNum * 2 * 4);
            }
        }

        device.queue.submit([computeCommandEncoder.finish()]);
    }

    getAllObjectFromType(types) {
        return this.objects.allObject.filter(object => types.includes(object.type));
    }

    async getSaveData() {
        const conversion = {"グラフィックメッシュ": "graphicMeshs", "ベジェモディファイア": "bezierModifiers", "アーマチュア": "armatures", "アニメーションコレクター": "animationCollectors", "キーフレームブロック": "keyframeBlocks"};
        const result = {graphicMeshs: [], bezierModifiers: [], armatures: [], rotateMOdifiers: [], animationCollectors: [], keyframeBlocks: []};
        // 各オブジェクトの保存処理を並列化
        const promises = this.objects.allObject.map(async (object) => {
            return { type: object.type, data: await object.getSaveData() };
        });
        const resolved = await Promise.all(promises);
        // 結果を type ごとにまとめる
        for (const { type, data } of resolved) {
            result[conversion[type]].push(data);
        }
        return result;
    }

    // フレームを適応
    updateAnimation(frame) {
        for (const keyframeBlock of this.objects.keyframeBlocks) {
            keyframeBlock.update(frame);
        }
    }

    // アニメーションコレクターの適応
    updateAnimationCollectors() {
        for (const animtionManager of this.objects.animationCollectors) {
            animtionManager.update();
        }
    }

    destroy() {
        this.maskTextures.length = 0;
        this.app.hierarchy.destroy();
        this.objects.destroy();
    }

    appendMaskTexture(name) {
        pushArray(this.maskTextures, new MaskTexture(name, this.app.appConfig.MASKTEXTURESIZE));
    }

    deleteMaskTexture(maskTexture) {
        if (maskTexture.renderingObjects.length || maskTexture.useObjects.length) {
            console.warn("削除しようとしたマスクは参照されているため削除できません");
        } else {
            managerForDOMs.deleteObject(maskTexture);
            this.maskTextures.splice(this.maskTextures.indexOf(maskTexture), 1);
        }
    }

    searchMaskTextureFromName(name) {
        for (const texture of this.maskTextures) {
            if (texture.name == name) return texture;
        }
        console.warn("マスクテクスチャが見つかりませんでした");
        return null;
    }

    searchObjectFromID(id) {
        for (const object of this.objects.allObject) {
            if (object.id == id) {
                return object;
            }
        }
        return null;
    }

    // 表示順番の再計算
    updateRenderingOrder() {
        this.renderingOrder = [...this.objects.graphicMeshs].sort((a, b) => a.zIndex - b.zIndex);
        managerForDOMs.update("表示順番");
    }
}

class State {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.currentMode = "オブジェクト";
        this.activeObject = null; // 注目されているオブジェクト
        this.selectedObject = []; // 選択されているオブジェクト
    }

    selectAll() {
        this.app.scene.objects.allObject
    }

    setSelectedObject(object, append = false) {
        if (!append) {
            this.selectedObject.forEach((object) => {
                object.selected = false;
            })
            this.selectedObject.length = 0;
        }
        if (!object) return ;
        if (!this.isSelect(object)) { // 選択されていない
            this.selectedObject.push(object);
        }
        console.log(object)
        object.selected = true;
    }

    setActiveObject(object) {
        this.activeObject = object;
        managerForDOMs.update("アクティブオブジェクト");
        managerForDOMs.update(this, "activeObject");
    }

    setModeForSelected(mode) {
        if (this.selectedObject.length == 0) return ;
        this.currentMode = mode;
        for (const object of this.selectedObject) {
            object.mode = mode;
        }
        managerForDOMs.update(this.selectedObject);
    }

    isSelect(object) {
        return this.selectedObject.includes(object);
    }
}

class World {
    constructor() {
        this.color = [0,0,0,1];
    }
}

class MaskTexture {
    constructor(name, size = [1024,1024]) {
        this.id = createID();
        this.type = "マスク";
        this.name = name;
        this.textureSize = [...size];
        this.texture= GPU.createTexture2D(this.textureSize,"r8unorm");
        this.textureView = this.texture.createView();
        this.renderingObjects = [];
        this.useObjects = [];
    }
}