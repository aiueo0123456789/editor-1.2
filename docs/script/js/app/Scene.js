import { device, GPU } from '../webGPU.js';
import { createID, managerForDOMs } from '../UI/制御.js';
import { GraphicMesh } from '../オブジェクト/グラフィックメッシュ.js';
import { Modifier } from '../オブジェクト/モディファイア.js';
import { RotateModifier } from '../オブジェクト/回転モディファイア.js';
import { BezierModifier } from '../オブジェクト/ベジェモディファイア.js';
import { BoneModifier } from '../オブジェクト/ボーンモディファイア.js';
import { AnimationCollector } from '../オブジェクト/アニメーションコレクター.js';
import { createArrayN, indexOfSplice, loadFile } from '../utility.js';
import { Application } from '../app.js';
import { vec2 } from '../ベクトル計算.js';

const parallelAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./script/js/app/shader/並列shader.wgsl"));
// const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./script/js/app/shader/伝播shader.wgsl"));
const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Cu"), GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./script/js/app/shader/伝播頂点用shader.wgsl"));
const animationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ローカルアニメーションvec2.wgsl"));
const bezierAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ローカルアニメーションvec2x3.wgsl"));
const boneAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ボーン/アニメーション.wgsl"));
const calculateBoneBaseDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu")], await loadFile("./script/js/app/shader/ボーン/ベースデータ.wgsl"));
const propagateBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"),GPU.getGroupLayout("Csr")], await loadFile("./script/js/app/shader/ボーン/伝播.wgsl"));
const calculateBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ボーン/頂点位置の計算.wgsl"));

const circleSelectBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/bone/selectVertices.wgsl"));
const selectBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/bone/hitTestFromPoint.wgsl"));
const boneHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/bone/hitTest.wgsl"));

const bezierModifierHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/bezier/hitTest.wgsl"));

const boxSelectVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/boxSelectVertices.wgsl"));

const polygonsHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu")], await loadFile("./script/js/app/shader/選択/polygonsHitTest.wgsl"));

const calculateLimitBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Csr_Csr")], await loadFile("./script/js/app/shader/BBox/vertices.wgsl"));
const BBoxResultBuffer = GPU.createStorageBuffer(2 * 4 * 2, undefined, ["f32"]);
const BBoxCalculateBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["i32"]);
const BBoxGroup0 = GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw"), [BBoxResultBuffer,BBoxCalculateBuffer]);

const objectToNumber = {
    "グラフィックメッシュ": 1,
    "ベジェモディファイア": 2,
    "ボーンモディファイア": 3,
    "モディファイア": 4,
};

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
        this.weightGroups = GPU.createBuffer(0, ["s"]);
        this.allocation = GPU.createBuffer(0, ["s"]);
        this.renderGroup = null;
        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;

        this.selectedVertices = GPU.createBuffer(0, ["s"]);
        this.selectedMesh = GPU.createBuffer(0, ["s"]);

        this.blockByteLength = 2 * 4; // データ一塊のバイト数: vec2<f32>
        this.meshBlockByteLength = 3 * 4; // uint32x3

        this.order = [];
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

    setBase(/** @type {GraphicMesh} */graphicMesh, verticesData, uvData, weightGroupData, meshesData) {
        if (verticesData) {
            GPU.writeBuffer(this.baseVertices, new Float32Array(verticesData), graphicMesh.vertexBufferOffset * this.blockByteLength);
        }
        if (uvData) {
            GPU.writeBuffer(this.uv, new Float32Array(uvData), graphicMesh.vertexBufferOffset * this.blockByteLength);
        }
        if (weightGroupData) {
            GPU.writeBuffer(this.weightGroups, GPU.createBitData(weightGroupData, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), graphicMesh.vertexBufferOffset * ((4 + 4) * 4));
        }
        if (meshesData) {
            GPU.writeBuffer(this.meshes, new Uint32Array(meshesData), graphicMesh.meshBufferOffset * this.meshBlockByteLength);
        }
        this.updateAllocationData(graphicMesh);
    }

    // 選択
    selectedForVertices(/** @type {GraphicMesh} */ graphicMesh, object, option) {
        const optionBuffer = GPU.createUniformBuffer((2) * 4, [option.add,1], ["u32"]);
        // console.log("最大頂点数", graphicMesh.MAX_VERTICES, "起動されるグループ数", Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, graphicMesh.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((graphicMesh.MAX_VERTICES * 3) / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, graphicMesh.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        }
        // GPU.consoleBufferData(this.selectedVertices, ["u32"], "当たり判定", {start: Math.ceil(boneModifier.vertexBufferOffset * 2 / 32), num: Math.ceil((boneModifier.MAX_BONES) * 2 / 32)});
        // GPU.consoleBufferData(this.selectedVertices, ["bit"], "当たり判定bool", {start: Math.ceil(boneModifier.vertexBufferOffset * 2 / 32), num: Math.ceil((boneModifier.MAX_BONES) * 2 / 32)});
    }

    setAnimationData(/** @type {GraphicMesh} */graphicMesh, animationData, animtaionIndex) {
        GPU.writeBuffer(this.animations, new Float32Array(animationData), (graphicMesh.animationBufferOffset + animtaionIndex) * this.blockByteLength);
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
            this.weightGroups = GPU.appendEmptyToBuffer(this.weightGroups, graphicMesh.MAX_VERTICES * (4 + 4) * 4); // ウェイトグループ用のメモリを確保
            this.allocation = GPU.appendDataToStorageBuffer(this.allocation, allocationData); // 配分を配分を計算するためのデータ
            this.selectedVertices = GPU.appendEmptyToBuffer(this.selectedVertices, Math.ceil(graphicMesh.MAX_VERTICES / 32) * 4); // 選択状態ようのメモリを確保
            this.selectedMesh = GPU.appendEmptyToBuffer(this.selectedMesh, Math.ceil(graphicMesh.MAX_MESHES / 32) * 4); // 選択状態ようのメモリを確保
            this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices, this.uv]); // 表示用
            this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr_Vsr"), [this.renderingVertices, this.meshes, this.selectedVertices]); // 表示用
            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices, this.baseVertices, this.animations, this.weights, this.allocation]); // アニメーション用
            this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.renderingVertices, this.weightGroups, this.allocation]); // 親の変形を適応するた
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
        this.weightGroups = GPU.createBuffer(0, ["s"]);
        this.allocation = GPU.createBuffer(0, ["s"]);

        this.selectedVertices = GPU.createBuffer(0, ["s"]);

        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;

        this.myType = 2;

        this.blockByteLength = 2 * 3 * 4; // データ一塊のバイト数: vec2<f32> * 3

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
        // GPU.consoleBufferData(this.selectedVertices, ["u32"], "当たり判定", {start: Math.ceil(boneModifier.vertexBufferOffset * 2 / 32), num: Math.ceil((boneModifier.MAX_BONES) * 2 / 32)});
        // GPU.consoleBufferData(this.selectedVertices, ["bit"], "当たり判定bool", {start: Math.ceil(boneModifier.vertexBufferOffset * 2 / 32), num: Math.ceil((boneModifier.MAX_BONES) * 2 / 32)});
    }

    async getBaseVerticesFromObject(/** @type {BezierModifier} */bezierModifier) {
        return await GPU.getBufferDataFromIndexs(this.baseVertices, {start: bezierModifier.vertexBufferOffset, end: bezierModifier.vertexBufferOffset + bezierModifier.verticesNum}, ["f32", "f32"]);
    }

    setBase(/** @type {BezierModifier} */bezierModifier, bezierPointData, weightGroupData) {
        GPU.writeBuffer(this.baseVertices, new Float32Array(bezierPointData), bezierModifier.vertexBufferOffset * this.blockByteLength);
        GPU.writeBuffer(this.weightGroups, GPU.createBitData(weightGroupData, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), bezierModifier.vertexBufferOffset * ((4 + 4) * 4));
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
            this.weightGroups = GPU.appendEmptyToBuffer(this.weightGroups, bezierModifier.MAX_VERTICES * (4 + 4) * 4); // ウェイト用のメモリを確保
            this.allocation = GPU.appendDataToStorageBuffer(this.allocation, allocationData); // 配分を配分を計算するためのデータ

            this.selectedVertices = GPU.appendEmptyToBuffer(this.selectedVertices, Math.ceil((bezierModifier.MAX_VERTICES * 3) / 32) * 4); // 選択状態ようのメモリを確保

            this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices,this.selectedVertices]); // 表示用
            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices, this.baseVertices, this.animations, this.weights, this.allocation]); // アニメーション用
            // this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.renderingVertices, this.weightGroups, this.allocation]); // 親の変形を適応するた
            this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingVertices, this.baseVertices, this.allocation]); // 子の変形用データ
            this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices, this.baseVertices, this.allocation, this.weightGroups]); // 親の変形を適応するた
            // bezierModifier.individualGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu"), [{type: "b", item: {buffer: this.renderingVertices, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * this.blockByteLength}}, {type: "b", item: {buffer: this.weightGroups, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * (4 + 4) * 4}}, bezierModifier.objectDataBuffer]);
            // bezierModifier.individualGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [{type: "b", item: {buffer: this.renderingVertices, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * this.blockByteLength}}, {type: "b", item: {buffer: this.weightGroups, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * (4 + 4) * 4}}, bezierModifier.objectDataBuffer]);
            bezierModifier.individualGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [bezierModifier.objectDataBuffer]);
            console.log("|---ベジェモディファイアメモリ用意---|")
        }
    }
}
class BoneModifierData {
    constructor(/** @type {Application} */ app) {
        this.app = app;

        // 頂点で表示したとき
        this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = GPU.createBuffer(0, ["s"]);

        // ボーンのデータ
        this.renderingBone = GPU.createBuffer(0, ["s"]); // アニメーション時の親とのローカルデータ
        this.baseBone = GPU.createBuffer(0, ["s"]); // ベース時の親とのローカルデータ

        this.selectedVertices = GPU.createBuffer(0, ["s"]);

        this.animations = GPU.createBuffer(0, ["s"]);
        this.weights = GPU.createBuffer(0, ["s"]);
        // ボーンの行列データ
        this.renderingBoneMatrix = GPU.createBuffer(0, ["s"]);
        this.baseBoneMatrix = GPU.createBuffer(0, ["s"]);

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

        this.propagate = [];
        this.order = [];
    }

    // 選択
    selectedForVertices(/** @type {BoneModifier} */ boneModifier, object, option) {
        const optionBuffer = GPU.createUniformBuffer((2) * 4, [option.add,2], ["u32"]);
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, boneModifier.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((boneModifier.MAX_BONES * 2) / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, boneModifier.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil((boneModifier.MAX_BONES * 2) / 32) / 64));
        }
        // GPU.consoleBufferData(this.selectedVertices, ["u32"], "当たり判定", {start: Math.ceil(boneModifier.vertexBufferOffset * 2 / 32), num: Math.ceil((boneModifier.MAX_BONES) * 2 / 32)});
        // GPU.consoleBufferData(this.selectedVertices, ["bit"], "当たり判定bool", {start: Math.ceil(boneModifier.vertexBufferOffset * 2 / 32), num: Math.ceil((boneModifier.MAX_BONES) * 2 / 32)});
    }

    selectedForBone(/** @type {BoneModifier} */ boneModifier, object, option) {
        const optionBuffer = GPU.createUniformBuffer(4, [option.add], ["u32"]);
        // console.log("最大頂点数", graphicMesh.MAX_VERTICES, "起動されるグループ数", Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, boneModifier.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil(boneModifier.MAX_BONES / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices, this.renderingVertices, boneModifier.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(selectBonePipeline, [group], Math.ceil(Math.ceil(boneModifier.MAX_BONES / 32) / 64));
        }
    }

    updatePropagateData() {
        const propagateCPU = [];
        const relationshipsKeep = createArrayN(this.allBoneNum);
        for (const /** @type {BoneModifier} */boneModifier of this.order) {
            const roop = (children, parent = null, depth = 0) => {
                if (parent) {
                    for (const child of children) {
                        if (propagateCPU.length <= depth) {
                            propagateCPU.push([]);
                        }
                        propagateCPU[depth].push(child.index + boneModifier.vertexBufferOffset, parent.index + boneModifier.vertexBufferOffset);
                        relationshipsKeep[child.index + boneModifier.vertexBufferOffset] = parent.index + boneModifier.vertexBufferOffset;
                        roop(child.children, child, depth + 1);
                    }
                } else {
                    for (const child of children) {
                        relationshipsKeep[child.index + boneModifier.vertexBufferOffset] = child.index + boneModifier.vertexBufferOffset;
                        roop(child.children, child, 0);
                    }
                }
            }
            roop(boneModifier.relationship);
        }
        this.propagate.length = 0;
        for (const data of propagateCPU) {
            const buffer = GPU.createStorageBuffer(data.length * 4, data, ["u32","u32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csr"), [buffer]);
            this.propagate.push({boneNum: data.length / 2, buffer: buffer, group: group, array: data});
        }
        GPU.writeBuffer(this.relationships, new Uint32Array(relationshipsKeep));
    }

    setBase(/** @type {BoneModifier} */boneModifier, boneVerticesData, parentingData, colorsData) {
        console.log("|---ボーンベース---|")
        GPU.writeBuffer(this.baseVertices, new Float32Array(boneVerticesData), boneModifier.vertexBufferOffset * this.vertexBlockByteLength);
        GPU.writeBuffer(this.colors, new Float32Array(colorsData), boneModifier.vertexBufferOffset * this.colorBlockByteLength);
        // console.log(parentingData);
        // const roop = (children, parent = null, depth = 0) => {
        //     if (parent) {
        //         for (const child of children) {
        //             if (this.propagate.length <= depth) {
        //                 this.propagate.push([child.index + boneModifier.vertexBufferOffset, parent.index + boneModifier.vertexBufferOffset]);
        //             } else {
        //                 this.propagate[depth].push(child.index + boneModifier.vertexBufferOffset, parent.index + boneModifier.vertexBufferOffset);
        //             }
        //             roop(child.children, child, depth + 1);
        //         }
        //     } else {
        //         for (const child of children) {
        //             roop(child.children, child, 0);
        //         }
        //     }
        // }
        // roop(parentingData);
        // console.log(this.propagate);
        // GPU.consoleBufferData(boneModifier.parentsBuffer, ["u32"], "親子");
        // this.calculateBaseBoneData(boneModifier);
        this.updateAllocationData(boneModifier);
        GPU.runComputeShader(calculateBoneBaseDataPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu"), [this.baseBone, this.baseBoneMatrix, this.baseVertices, boneModifier.parentsBuffer, boneModifier.objectDataBuffer])], Math.ceil(boneModifier.MAX_BONES / 64));
        this.updatePropagateData();
        // GPU.consoleBufferData(this.baseBone, ["f32","f32","f32","f32","f32","f32"], "base");
    }

    calculateBaseBoneData(boneModifier) {
        // GPU.consoleBufferData(this.baseVertices, ["f32","f32","f32","f32"], "base");
        GPU.runComputeShader(calculateBoneBaseDataPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu"), [this.baseBone, this.baseBoneMatrix, this.baseVertices, boneModifier.parentsBuffer, boneModifier.objectDataBuffer])], Math.ceil(boneModifier.boneNum / 64));
    }

    updateAllocationData(/** @type {BoneModifier} */boneModifier) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(boneModifier);
        GPU.writeBuffer(this.allocation, allocationData, (boneModifier.allocationIndex * 8) * 4);
        GPU.writeBuffer(boneModifier.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {BoneModifier} */boneModifier) {
        return new Uint32Array([boneModifier.vertexBufferOffset, boneModifier.animationBufferOffset, boneModifier.weightBufferOffset, boneModifier.boneNum, boneModifier.MAX_ANIMATIONS, 0, 0, GPU.padding]);
    }

    setAnimationData(/** @type {BoneModifier} */boneModifier, animationData, animtaionIndex) {
        console.log("|---ボーンアニメーション---|")
        console.log(boneModifier, animationData, animtaionIndex)
        GPU.writeBuffer(this.animations, new Float32Array(animationData), (boneModifier.animationBufferOffset + animtaionIndex) * this.boneBlockByteLength);
    }

    prepare(/** @type {BoneModifier} */boneModifier) {
        if (!this.order.includes(boneModifier)) {
            this.order.push(boneModifier);
            boneModifier.vertexBufferOffset = this.renderingBoneMatrix.size / this.matrixBlockByteLength;
            boneModifier.animationBufferOffset = this.animations.size / this.boneBlockByteLength;
            boneModifier.weightBufferOffset = this.weights.size / 4;
            boneModifier.allocationIndex = this.order.length - 1;
            // 頂点分の確保
            this.baseVertices = GPU.appendEmptyToBuffer(this.baseVertices, boneModifier.MAX_BONES * this.vertexBlockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingVertices = GPU.appendEmptyToBuffer(this.renderingVertices, boneModifier.MAX_BONES * this.vertexBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            // ボーン分の確保
            this.baseBone = GPU.appendEmptyToBuffer(this.baseBone, boneModifier.MAX_BONES * this.boneBlockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingBone = GPU.appendEmptyToBuffer(this.renderingBone, boneModifier.MAX_BONES * this.boneBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            this.animations = GPU.appendEmptyToBuffer(this.animations, boneModifier.MAX_ANIMATIONS * boneModifier.MAX_BONES * this.boneBlockByteLength); // アニメーション用のメモリを確保
            this.weights = GPU.appendEmptyToBuffer(this.weights, boneModifier.MAX_ANIMATIONS * 4); // アニメーション用のメモリを確保

            // 行列分の確保
            this.baseBoneMatrix = GPU.appendEmptyToBuffer(this.baseBoneMatrix, boneModifier.MAX_BONES * this.matrixBlockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingBoneMatrix = GPU.appendEmptyToBuffer(this.renderingBoneMatrix, boneModifier.MAX_BONES * this.matrixBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            this.selectedVertices = GPU.appendEmptyToBuffer(this.selectedVertices, Math.ceil((boneModifier.MAX_BONES * 2) / 32) * 4); // 選択状態ようのメモリを確保

            this.colors = GPU.appendEmptyToBuffer(this.colors, boneModifier.MAX_BONES * this.colorBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            this.relationships = GPU.appendEmptyToBuffer(this.relationships, boneModifier.MAX_BONES * 4); // アニメーション適用後の頂点座標用のメモリを確保

            this.allocation = GPU.appendEmptyToBuffer(this.allocation, 8 * 4); // 配分を配分を計算するためのデータ

            this.allBoneNum += boneModifier.MAX_BONES;

            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingBoneMatrix, this.baseBone, this.animations, this.weights, this.allocation]); // アニメーション用
            this.propagateGroup = GPU.createGroup(GPU.getGroupLayout("Csrw"), [this.renderingBoneMatrix]); // 伝播用
            this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingBoneMatrix, this.baseBoneMatrix, this.allocation]); // 子の変形用データ
            this.calculateVerticesPositionGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices, this.renderingBoneMatrix, this.baseBone, this.allocation]);
            this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr"), [this.renderingVertices, this.colors, this.relationships, this.selectedVertices]); // 表示用
            console.log("|---ボーンモディファイアメモリ用意---|")
        }
    }
}

class SceneGPUData {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.graphicMeshData = new GraphicMeshData(app);
        this.boneModifierData = new BoneModifierData(app);
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

// オブジェクトの保持・設定
export class Scene {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.animationCollectors = [];
        this.modifiers = [];
        this.bezierModifiers = [];
        this.rotateModifiers = [];
        this.graphicMeshs = [];
        this.boneModifiers = [];

        this.renderingOrder = [];

        this.text = [];

        this.keyframes = [];

        this.allObject = [];

        // フレーム範囲
        this.frame_start = 0;
        this.frame_end = 32;

        // 現在のフレーム
        this.frame_current = 0;

        // 背景
        this.world = new World(app);

        this.gpuData = new SceneGPUData(app);

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
    }

    // 選択している頂点のBBoxを取得
    async getSelectVerticesBBox(verticesBuffer, selectBuffer) {
        GPU.runComputeShader(calculateLimitBBoxPipeline, [BBoxGroup0, GPU.createGroup(GPU.getGroupLayout("Csr_Csr"), [verticesBuffer, selectBuffer])], Math.ceil(verticesBuffer.size / 4 / 2 / 64));
        return await GPU.getBBoxBuffer(BBoxResultBuffer);
    }

    // 選択している頂点の中央点を取得
    async getSelectVerticesCenter(verticesBuffer, selectBuffer) {
        const BBox = await this.getSelectVerticesBBox(verticesBuffer, selectBuffer);
        console.log(BBox);
        return vec2.averageR(BBox);
    }

    // オブジェクトとの当たり判定
    async selectedForObject(point, option = {types: ["グラフィックメッシュ", "ボーンモディファイア", "ベジェモディファイア"], depth: true}) {
        const optionBuffer = GPU.createUniformBuffer(4, [0], ["u32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, [...point], ["f32"]);
        const resultBuffer = GPU.createStorageBuffer(4, [0], ["u32"]);
        const result = [];
        for (const object of this.allObject) {
            if (option.types.includes(object.type)) {
                if (object.type == "グラフィックメッシュ") {
                    const hitTestGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu"), [resultBuffer, this.gpuData.graphicMeshData.renderingVertices, this.gpuData.graphicMeshData.meshes, object.objectMeshData, optionBuffer, pointBuffer]);
                    GPU.runComputeShader(polygonsHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_MESHES / 64));
                } else if (object.type == "ボーンモディファイア") {
                    const hitTestGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [resultBuffer, this.gpuData.boneModifierData.renderingVertices, object.objectDataBuffer, optionBuffer, pointBuffer]);
                    GPU.runComputeShader(boneHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_BONES / 64));
                } else if (object.type == "ベジェモディファイア") {
                    const hitTestGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [resultBuffer, this.gpuData.bezierModifierData.renderingVertices, object.objectDataBuffer, optionBuffer, pointBuffer]);
                    GPU.runComputeShader(bezierModifierHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_VERTICES / 64));
                }
                const resultBufferData = await GPU.getU32BufferData(resultBuffer, 4);
                if (1 == resultBufferData[0]) {
                    result.push(object);
                }
            }
        }
        if (option.depth) {
            result.sort((a, b) => b.zIndex - a.zIndex);
        }
        return result;
    }

    update() {
        if (!(this.boneModifiers.length || this.graphicMeshs.length || this.bezierModifiers.length)) return ;
        for (const graphicMesh of this.graphicMeshs) {
            graphicMesh.animationBlock.animationBlock.forEach(animation => {
                GPU.writeBuffer(this.gpuData.graphicMeshData.weights, new Float32Array([animation.weight]), graphicMesh.weightBufferOffset * 4);
            });
        }
        for (const bezierModifier of this.bezierModifiers) {
            bezierModifier.animationBlock.animationBlock.forEach(animation => {
                GPU.writeBuffer(this.gpuData.bezierModifierData.weights, new Float32Array([animation.weight]), bezierModifier.weightBufferOffset * 4);
            });
        }
        for (const boneModifier of this.boneModifiers) {
            boneModifier.animationBlock.animationBlock.forEach(animation => {
                GPU.writeBuffer(this.gpuData.boneModifierData.weights, new Float32Array([animation.weight]), boneModifier.weightBufferOffset * 4);
            });
        }

        const computeCommandEncoder = device.createCommandEncoder();
        const computePassEncoder = computeCommandEncoder.beginComputePass();
        if (this.graphicMeshs.length) {
            computePassEncoder.setPipeline(animationApplyPipeline);
            computePassEncoder.setBindGroup(0, this.gpuData.graphicMeshData.animationApplyGroup); // 全てのグラフィックスメッシュのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }
        if (this.bezierModifiers.length) {
            computePassEncoder.setPipeline(bezierAnimationApplyPipeline);
            computePassEncoder.setBindGroup(0, this.gpuData.bezierModifierData.animationApplyGroup); // 全てのベジェモディファイアのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.bezierModifiers.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }
        if (this.boneModifiers.length) {
            computePassEncoder.setPipeline(boneAnimationApplyPipeline);
            computePassEncoder.setBindGroup(0, this.gpuData.boneModifierData.animationApplyGroup); // 全てのボーンモディファイアのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.boneModifiers.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }

        // ボーンを伝播
        computePassEncoder.setPipeline(propagateBonePipeline);
        computePassEncoder.setBindGroup(0, this.gpuData.boneModifierData.propagateGroup); // 全てのボーンモディファイアのデータをバインド
        for (const nowDepthData of this.gpuData.boneModifierData.propagate) {
            computePassEncoder.setBindGroup(1, nowDepthData.group); // 全てのボーンモディファイアのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(nowDepthData.boneNum / 64), 1, 1); // ワークグループ数をディスパッチ
        }

        const childrenRoop = (children) => {
            for (const child of children) {
                if (child.type == "ベジェモディファイア") {
                    // ベジェモディファイア親の変形を適応
                    computePassEncoder.setBindGroup(0, child.individualGroup);
                    computePassEncoder.dispatchWorkgroups(Math.ceil(child.verticesNum / 64), 1, 1); // ワークグループ数をディスパッチ
                }
                if (child.children) { // 子要素がある場合ループする
                    childrenRoop(child.children.objects);
                }
            }
        }
        computePassEncoder.setBindGroup(1, this.gpuData.bezierModifierData.parentApplyGroup);
        computePassEncoder.setBindGroup(2, this.gpuData.boneModifierData.applyParentGroup);
        computePassEncoder.setPipeline(treeAnimationApplyPipeline);
        childrenRoop(this.app.hierarchy.root);

        // グラフィックメッシュ親の変形を適応
        if (this.graphicMeshs.length) {
            computePassEncoder.setBindGroup(1, this.gpuData.bezierModifierData.applyParentGroup);
            computePassEncoder.setBindGroup(0, this.gpuData.graphicMeshData.parentApplyGroup);
            computePassEncoder.setPipeline(parallelAnimationApplyPipeline);
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }

        
        // for (const object of this.bezierModifiers) {
        // }
        
        // for (const object of this.boneModifiers) {
        // }
        
        if (this.boneModifiers.length) {
            computePassEncoder.setBindGroup(0, this.gpuData.boneModifierData.calculateVerticesPositionGroup);
            computePassEncoder.setPipeline(calculateBoneVerticesPipeline);
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.boneModifiers.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_BONEMODIFIER / 8), 1); // ワークグループ数をディスパッチ
        }

        computePassEncoder.end();

        for (const /** @type {GraphicMesh} */object of this.graphicMeshs) {
            if (object.mode == "メッシュ編集") {
                computeCommandEncoder.copyBufferToBuffer(this.gpuData.graphicMeshData.baseVertices, object.vertexBufferOffset * 2 * 4, this.gpuData.graphicMeshData.renderingVertices, object.vertexBufferOffset * 2 * 4, object.verticesNum * 2 * 4);
            }
        }

        device.queue.submit([computeCommandEncoder.finish()]);
    }

    async getSaveData() {
        const conversion = {"グラフィックメッシュ": "graphicMeshs", "モディファイア": "modifiers", "ベジェモディファイア": "bezierModifiers", "ボーンモディファイア": "boneModifiers", "アニメーションコレクター": "animationCollectors"};
        const result = {graphicMeshs: [], modifiers: [], bezierModifiers: [], boneModifiers: [], rotateMOdifiers: [], animationCollectors: []};
        // 各オブジェクトの保存処理を並列化
        const promises = this.allObject.map(async (object) => {
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
        for (const object of this.animationCollectors) {
            object.keyframe.update(frame);
        }
    }

    // アニメーションコレクターの適応
    updateAnimationCollectors() {
        for (const animtionManager of this.animationCollectors) {
            animtionManager.update();
        }
    }

    destroy() {
        this.maskTextures.length = 0;
        this.app.hierarchy.destroy();
        this.animationCollectors.length = 0;
        this.modifiers.length = 0;
        this.bezierModifiers.length = 0;
        this.rotateModifiers.length = 0;
        this.graphicMeshs.length = 0;
        this.boneModifiers.length = 0;
    }

    appendMaskTexture(name) {
        this.maskTextures.push(new MaskTexture(name, maskTextureSize));
        managerForDOMs.update(this.maskTextures);
    }

    deleteMaskTextureFromName(name) {
    }

    deleteMaskTextureFromID(id) {
        for (let i = this.maskTextures.length - 1; i >= 0; i --) {
            if (this.maskTextures[i].id == id) {
                this.deleteMaskTexture(this.maskTextures[i]);
                return ;
            }
        }
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

    createObject(data) {
        let object;
        if (data.saveData) { // セーブデータからオブジェクトを作る
            data = data.saveData;
            if (!data.type || data.type == "グラフィックメッシュ") {
                object = new GraphicMesh(data.name,data.id);
                object.init(data);
                this.graphicMeshs.push(object);
                this.isChangeObjectsZindex = true;
            } else if (data.type == "モディファイア") {
                object = new Modifier(data.name,data.id);
                object.init(data);
                this.modifiers.push(object);
            } else if (data.type == "回転モディファイア") {
                object = new RotateModifier(data.name,data.id);
                object.init(data);
                this.rotateModifiers.push(object);
            } else if (data.type == "ベジェモディファイア") {
                object = new BezierModifier(data.name,data.id);
                object.init(data);
                this.bezierModifiers.push(object);
            } else if (data.type == "ボーンモディファイア") {
                console.log(data)
                object = new BoneModifier(data.name,data.id,data);
                // object.init(data);
                this.boneModifiers.push(object);
            } else if (data.type == "アニメーションコレクター" || data.type == "am") {
                object = new AnimationCollector(data.name,data.id);
                object.init(data);
                this.animationCollectors.push(object);
                managerForDOMs.update(this.animationCollectors);
            }
        } else if (data.type) { // 空のオブジェクトを作る
            let type = data.type;
            if (type == "アニメーションコレクター") {
                object = new AnimationCollector("名称未設定");
                this.animationCollectors.push(object);
                managerForDOMs.update("タイムライン-チャンネル");
                managerForDOMs.update("タイムライン-タイムライン-オブジェクト");
                managerForDOMs.update(this.animationCollectors);
            } else {
                if (type == "グラフィックメッシュ") {
                    object = new GraphicMesh("名称未設定");
                    this.graphicMeshs.push(object);
                    this.isChangeObjectsZindex = true;
                } else if (type == "モディファイア") {
                    object = new Modifier("名称未設定");
                    this.modifiers.push(object);
                } else if (type == "回転モディファイア") {
                    object = new RotateModifier("名称未設定");
                    this.rotateModifiers.push(object);
                } else if (type == "ベジェモディファイア") {
                    object = new BezierModifier("名称未設定");
                    this.bezierModifiers.push(object);
                } else if (type == "ボーンモディファイア") {
                    object = new BoneModifier("名称未設定", undefined, this.app.options.getPrimitiveData("bone", "body"));
                    this.boneModifiers.push(object);
                }
                this.app.hierarchy.addHierarchy("", object);
            }
        }
        this.allObject.push(object);
        return object;
    }

    // オブジェクトの削除
    deleteObject(object) {
        this.app.hierarchy.deleteHierarchy(object); // ヒエラルキーから削除
        const [array, indexe] = this.searchObject(object); // 所属している配列とindexを取得
        array.splice(indexe, 1);
        indexOfSplice(this.allObject, object);
    }

    getObject() {

    }

    searchObjectFromID(id) {
        for (const object of this.allObject) {
            if (object.id == id) {
                return object;
            }
        }
        return null;
    }

    searchObject(object) {
        if (object.type == "グラフィックメッシュ") {
            return [this.graphicMeshs, this.graphicMeshs.indexOf(object)];
        } else if (object.type == "モディファイア") {
            return [this.modifiers, this.modifiers.indexOf(object)];
        } else if (object.type == "ベジェモディファイア") {
            return [this.bezierModifiers, this.bezierModifiers.indexOf(object)];
        } else if (object.type == "回転モディファイア") {
            return [this.rotateModifiers, this.rotateModifiers.indexOf(object)];
        } else if (object.type == "ボーンモディファイア") {
            return [this.boneModifiers, this.boneModifiers.indexOf(object)];
        } else if (object.type == "アニメーションコレクター") {
            return [this.animationCollectors, this.animationCollectors.indexOf(object)];
        }
    }

    hasObject() {

    }

    destroy() {

    }

    // 表示順番の再計算
    // updateRenderingOrder(fineness) {
    //     // if (!this.isChangeObjectsZindex) return ;
    //     const createEmptyArray = (length) => {
    //         const result = [];
    //         for (let i = 0; i < length; i ++) {
    //             result.push([]);
    //         }
    //         return result;
    //     }
    //     const supportFn = (graphicMeshs) => {
    //         const belongChunk = Math.floor(graphicMeshs.zIndex / chunkRate);
    //         for (let i = 0; i < chunks[belongChunk].length; i ++) {
    //             if (chunks[belongChunk][i][1] > graphicMeshs.zIndex) {
    //                 chunks[belongChunk].splice(i,0,[graphicMeshs, graphicMeshs.zIndex]);
    //                 return ;
    //             }
    //         }
    //         chunks[belongChunk].push([graphicMeshs, graphicMeshs.zIndex]);
    //         return ;
    //     }
    //     const chunkRate = 1000 / fineness;
    //     const chunks = createEmptyArray(fineness);
    //     this.graphicMeshs.forEach(graphicMesh => {
    //         supportFn(graphicMesh);
    //     });
    //     this.renderingOrder.length = 0;
    //     for (const datas of chunks) {
    //         for (const data of datas) {
    //             this.renderingOrder.push(data[0]);
    //         }
    //     }
    //     // this.isChangeObjectsZindex = false;
    //     managerForDOMs.update("表示順番");
    // }
    updateRenderingOrder(fineness) {
        this.renderingOrder = [...this.graphicMeshs].sort((a, b) => a.zIndex - b.zIndex);
        managerForDOMs.update("表示順番");
    }
}

class State {
    constructor(app) {
        this.app = app;
        this.currentMode = "オブジェクト";
        this.activeObject = null; // 注目されているオブジェクト
        this.selectedObject = []; // 選択されているオブジェクト
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
    }

    setModeForSelected(mode) {
        if (this.selectedObject.length == 0) return ;
        this.currentMode = mode;
        for (const object of this.selectedObject) {
            object.mode = mode;
        }
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