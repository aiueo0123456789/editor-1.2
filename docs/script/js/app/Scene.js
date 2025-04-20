import { device, GPU } from '../webGPU.js';
import { createID, managerForDOMs } from '../UI/制御.js';
import { GraphicMesh } from '../オブジェクト/グラフィックメッシュ.js';
import { Modifier } from '../オブジェクト/モディファイア.js';
import { RotateModifier } from '../オブジェクト/回転モディファイア.js';
import { BezierModifier } from '../オブジェクト/ベジェモディファイア.js';
import { BoneModifier } from '../オブジェクト/ボーンモディファイア.js';
import { AnimationCollector } from '../オブジェクト/アニメーションコレクター.js';
import { indexOfSplice, loadFile } from '../utility.js';
import { Application } from '../app.js';

const parallelAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./script/js/app/shader/並列shader.wgsl"));
// const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./script/js/app/shader/伝播shader.wgsl"));
const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Cu"), GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./script/js/app/shader/伝播頂点用shader.wgsl"));
const animationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ローカルアニメーションvec2.wgsl"));
const bezierAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ローカルアニメーションvec2x3.wgsl"));
const boneAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./script/js/app/shader/ボーン/アニメーション.wgsl"));
const calculateBoneBaseDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu")], await loadFile("./script/js/app/shader/ボーン/ベースデータ.wgsl"));
const propagateBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"),GPU.getGroupLayout("Csr")], await loadFile("./script/js/app/shader/ボーン/伝播.wgsl"));

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
        this.rendering = null;
        this.base = null;
        this.uv = null;
        this.animations = null;
        this.weights = null;
        this.weightGroups = null;
        this.allocation = null;
        this.renderGroup = null;
        this.animationApplyGroup = null;

        this.blockByteLength = 2 * 4; // データ一塊のバイト数: vec2<f32>

        this.order = [];
    }

    setBase(/** @type {GraphicMesh} */graphicMesh, verticesData, uvData, weightGroupData) {
        GPU.writeBuffer(this.base, new Float32Array(verticesData), graphicMesh.vertexBufferOffset * this.blockByteLength);
        GPU.writeBuffer(this.uv, new Float32Array(uvData), graphicMesh.vertexBufferOffset * this.blockByteLength);
        GPU.writeBuffer(this.weightGroups, GPU.createBitData(weightGroupData, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), graphicMesh.vertexBufferOffset * ((4 + 4) * 4));
    }

    setAnimationData(/** @type {GraphicMesh} */graphicMesh, animationData, animtaionIndex) {
        GPU.writeBuffer(this.animations, new Float32Array(animationData), (graphicMesh.animationBufferOffset + animtaionIndex) * this.blockByteLength);
    }

    updateParent(/** @type {GraphicMesh} */graphicMesh) {
        let allocationData;
        if (graphicMesh.parent) {
            allocationData = new Uint32Array([graphicMesh.vertexBufferOffset, graphicMesh.animationBufferOffset, graphicMesh.weightBufferOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.allocationIndex, GPU.padding]);
        } else {
            allocationData = new Uint32Array([graphicMesh.vertexBufferOffset, graphicMesh.animationBufferOffset, graphicMesh.weightBufferOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, 0, 0, GPU.padding]);
        }
        GPU.writeBuffer(this.allocation, allocationData, (graphicMesh.allocationIndex * 8) * 4);
        GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
    }

    prepare(/** @type {GraphicMesh} */graphicMesh) {
        if (!this.order.includes(graphicMesh)) {
            this.order.push(graphicMesh);
            graphicMesh.vertexBufferOffset = (this.rendering ? this.rendering.size : 0) / this.blockByteLength;
            graphicMesh.animationBufferOffset = (this.animations ? this.animations.size : 0) / this.blockByteLength;
            graphicMesh.weightBufferOffset = (this.weights ? this.weights.size : 0) / (4);
            graphicMesh.allocationIndex = this.order.length - 1;
            let allocationData;
            if (graphicMesh.parent) {
                allocationData = new Uint32Array([graphicMesh.vertexBufferOffset, graphicMesh.animationBufferOffset, graphicMesh.weightBufferOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.allocationIndex, GPU.padding]);
            } else {
                allocationData = new Uint32Array([graphicMesh.vertexBufferOffset, graphicMesh.animationBufferOffset, graphicMesh.weightBufferOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, 0, 0, GPU.padding]);
            }
            GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
            this.base = GPU.appendEmptyToStorageBuffer(this.base, graphicMesh.MAX_VERTICES * this.blockByteLength); // 元の頂点座標用のメモリを確保
            this.rendering = GPU.appendEmptyToStorageBuffer(this.rendering, graphicMesh.MAX_VERTICES * this.blockByteLength); // アニメーション適用後の頂点座標用のメモリを確保
            this.uv = GPU.appendEmptyToStorageBuffer(this.uv, graphicMesh.MAX_VERTICES * this.blockByteLength); // uv用のメモリを確保
            this.animations = GPU.appendEmptyToStorageBuffer(this.animations, graphicMesh.MAX_ANIMATIONS * graphicMesh.MAX_VERTICES * this.blockByteLength); // アニメーション用のメモリを確保
            this.weights = GPU.appendEmptyToStorageBuffer(this.weights, graphicMesh.MAX_ANIMATIONS * 4); // アニメーション用のメモリを確保
            this.weightGroups = GPU.appendEmptyToStorageBuffer(this.weightGroups, graphicMesh.MAX_VERTICES * (4 + 4) * 4); // ウェイトグループ用のメモリを確保
            this.allocation = GPU.appendDataToStorageBuffer(this.allocation, allocationData); // 配分を配分を計算するためのデータ
            this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.rendering, this.uv]); // 表示用
            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.rendering, this.base, this.animations, this.weights, this.allocation]); // アニメーション用
            this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.rendering, this.weightGroups, this.allocation]); // 親の変形を適応するた
            console.log("|---グラフィックメッシュメモリ用意---|")
        }
    }
}
class BezierModifierData {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.rendering = null;
        this.base = null;
        this.animations = null;
        this.weights = null;
        this.weightGroups = null;
        this.allocation = null;
        this.renderGroup = null;
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;

        this.myType = 2;

        this.blockByteLength = 2 * 3 * 4; // データ一塊のバイト数: vec2<f32> * 3

        this.order = [];
    }

    setBase(/** @type {BezierModifier} */bezierModifier, bezierPointData, weightGroupData) {
        GPU.writeBuffer(this.base, new Float32Array(bezierPointData), bezierModifier.vertexBufferOffset * this.blockByteLength);
        GPU.writeBuffer(this.weightGroups, GPU.createBitData(weightGroupData, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), bezierModifier.vertexBufferOffset * ((4 + 4) * 4));
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
            bezierModifier.vertexBufferOffset = (this.rendering ? this.rendering.size : 0) / this.blockByteLength;
            bezierModifier.animationBufferOffset = (this.animations ? this.animations.size : 0) / this.blockByteLength;
            bezierModifier.weightBufferOffset = (this.weights ? this.weights.size : 0) / (4);
            bezierModifier.allocationIndex = this.order.length - 1;
            let allocationData;
            if (bezierModifier.parent) {
                allocationData = new Uint32Array([bezierModifier.vertexBufferOffset, bezierModifier.animationBufferOffset, bezierModifier.weightBufferOffset, bezierModifier.MAX_VERTICES, bezierModifier.MAX_ANIMATIONS, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.allocationIndex, GPU.padding]);
            } else {
                allocationData = new Uint32Array([bezierModifier.vertexBufferOffset, bezierModifier.animationBufferOffset, bezierModifier.weightBufferOffset, bezierModifier.MAX_VERTICES, bezierModifier.MAX_ANIMATIONS, 0, 0, GPU.padding]);
            }
            GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
            this.base = GPU.appendEmptyToStorageBuffer(this.base, bezierModifier.MAX_VERTICES * this.blockByteLength); // 元の頂点座標用のメモリを確保
            this.rendering = GPU.appendEmptyToStorageBuffer(this.rendering, bezierModifier.MAX_VERTICES * this.blockByteLength); // アニメーション適用後の頂点座標用のメモリを確保
            this.animations = GPU.appendEmptyToStorageBuffer(this.animations, bezierModifier.MAX_ANIMATIONS * bezierModifier.MAX_VERTICES * this.blockByteLength); // アニメーション用のメモリを確保
            this.weights = GPU.appendEmptyToStorageBuffer(this.weights, bezierModifier.MAX_ANIMATIONS * 4); // アニメーション用のメモリを確保
            this.weightGroups = GPU.appendEmptyToStorageBuffer(this.weightGroups, bezierModifier.MAX_VERTICES * (4 + 4) * 4); // アニメーション用のメモリを確保
            this.allocation = GPU.appendDataToStorageBuffer(this.allocation, allocationData); // 配分を配分を計算するためのデータ
            // this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.rendering, this.uv]); // 表示用
            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.rendering, this.base, this.animations, this.weights, this.allocation]); // アニメーション用
            // this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.rendering, this.weightGroups, this.allocation]); // 親の変形を適応するた
            this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.rendering, this.base, this.allocation]); // 子の変形用データ
            this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.rendering, this.base, this.allocation, this.weightGroups]); // 親の変形を適応するた
            // bezierModifier.individualGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu"), [{type: "b", item: {buffer: this.rendering, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * this.blockByteLength}}, {type: "b", item: {buffer: this.weightGroups, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * (4 + 4) * 4}}, bezierModifier.objectDataBuffer]);
            // bezierModifier.individualGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [{type: "b", item: {buffer: this.rendering, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * this.blockByteLength}}, {type: "b", item: {buffer: this.weightGroups, offset: bezierModifier.vertexBufferOffset * this.blockByteLength, size: bezierModifier.MAX_VERTICES * (4 + 4) * 4}}, bezierModifier.objectDataBuffer]);
            bezierModifier.individualGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [bezierModifier.objectDataBuffer]);
            console.log("|---ベジェモディファイアメモリ用意---|")
        }
    }
}
class BoneModifierData {
    constructor(/** @type {Application} */ app) {
        this.app = app;

        // 頂点で表示したとき
        this.renderingVertices = null;
        this.baseVertices = null;

        // ボーンのデータ
        this.renderingBone = null; // アニメーション時の親とのローカルデータ
        this.baseBone = null; // ベース時の親とのローカルデータ

        this.animations = null;
        this.weights = null;
        // ボーンの行列データ
        this.renderingBoneMatrix = null;
        this.baseBoneMatrix = null;

        this.allocation = null;
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;

        this.boneBlockByteLength = 6 * 4; // データ一塊のバイト数: f32 * 6
        this.matrixBlockByteLength = 4 * 3 * 4; // データ一塊のバイト数: mat3x3<f32> (paddingでmat4x3<f32>になる)
        this.vertexBlockByteLength = 2 * 2 * 4; // 頂点データ一塊のバイト数: vec2<f32> * 2

        this.propagate = [];
        this.order = [];
    }

    updatePropagateData() {
        const propagateCPU = [];
        for (const /** @type {BoneModifier} */boneModifier of this.order) {
            const roop = (children, parent = null, depth = 0) => {
                if (parent) {
                    for (const child of children) {
                        if (propagateCPU.length <= depth) {
                            propagateCPU.push([]);
                        }
                        propagateCPU[depth].push(child.index + boneModifier.vertexBufferOffset, parent.index + boneModifier.vertexBufferOffset);
                        roop(child.children, child, depth + 1);
                    }
                } else {
                    for (const child of children) {
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
    }

    setBase(/** @type {BoneModifier} */boneModifier, boneVerticesData, parentingData) {
        console.log("|---ボーンベース---|")
        GPU.writeBuffer(this.baseVertices, new Float32Array(boneVerticesData), boneModifier.vertexBufferOffset * this.vertexBlockByteLength);
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
        // GPU.consoleBufferData(boneModifier.parentsBuffer, ["u32"], "親子")
        GPU.runComputeShader(calculateBoneBaseDataPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu"), [this.baseBone, this.baseBoneMatrix, this.baseVertices, boneModifier.parentsBuffer, boneModifier.objectDataBuffer])], Math.ceil(boneModifier.MAX_VERTICES / 64));
        this.updatePropagateData();
        // GPU.consoleBufferData(this.baseBone, ["f32","f32","f32","f32","f32","f32"], "base");
    }

    setAnimationData(/** @type {BoneModifier} */boneModifier, animationData, animtaionIndex) {
        console.log("|---ボーンアニメーション---|")
        console.log(boneModifier, animationData, animtaionIndex)
        GPU.writeBuffer(this.animations, new Float32Array(animationData), (boneModifier.animationBufferOffset + animtaionIndex) * this.boneBlockByteLength);
    }

    prepare(/** @type {BoneModifier} */boneModifier) {
        if (!this.order.includes(boneModifier)) {
            this.order.push(boneModifier);
            boneModifier.vertexBufferOffset = (this.renderingBoneMatrix ? this.renderingBoneMatrix.size : 0) / this.matrixBlockByteLength;
            boneModifier.animationBufferOffset = (this.animations ? this.animations.size : 0) / this.boneBlockByteLength;
            boneModifier.weightBufferOffset = (this.weights ? this.weights.size : 0) / (4);
            boneModifier.allocationIndex = this.order.length - 1;
            let allocationData = new Uint32Array([boneModifier.vertexBufferOffset, boneModifier.animationBufferOffset, boneModifier.weightBufferOffset, boneModifier.MAX_VERTICES, boneModifier.MAX_ANIMATIONS, 0, 0, GPU.padding]);
            GPU.writeBuffer(boneModifier.objectDataBuffer, allocationData);
            // 頂点分の確保
            this.baseVertices = GPU.appendEmptyToStorageBuffer(this.baseVertices, boneModifier.MAX_VERTICES * this.vertexBlockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingVertices = GPU.appendEmptyToStorageBuffer(this.renderingVertices, boneModifier.MAX_VERTICES * this.vertexBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            // ボーン分の確保
            this.baseBone = GPU.appendEmptyToStorageBuffer(this.baseBone, boneModifier.MAX_VERTICES * this.boneBlockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingBone = GPU.appendEmptyToStorageBuffer(this.renderingBone, boneModifier.MAX_VERTICES * this.boneBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            this.animations = GPU.appendEmptyToStorageBuffer(this.animations, boneModifier.MAX_ANIMATIONS * boneModifier.MAX_VERTICES * this.boneBlockByteLength); // アニメーション用のメモリを確保
            this.weights = GPU.appendEmptyToStorageBuffer(this.weights, boneModifier.MAX_ANIMATIONS * 4); // アニメーション用のメモリを確保

            // 行列分の確保
            this.baseBoneMatrix = GPU.appendEmptyToStorageBuffer(this.baseBoneMatrix, boneModifier.MAX_VERTICES * this.matrixBlockByteLength); // 元の頂点座標用のメモリを確保
            this.renderingBoneMatrix = GPU.appendEmptyToStorageBuffer(this.renderingBoneMatrix, boneModifier.MAX_VERTICES * this.matrixBlockByteLength); // アニメーション適用後の頂点座標用のメモリを確保

            this.allocation = GPU.appendDataToStorageBuffer(this.allocation, allocationData); // 配分を配分を計算するためのデータ
            this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingBoneMatrix, this.baseBone, this.animations, this.weights, this.allocation]); // アニメーション用
            this.propagateGroup = GPU.createGroup(GPU.getGroupLayout("Csrw"), [this.renderingBoneMatrix]); // 伝播用
            this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingBoneMatrix, this.baseBoneMatrix, this.allocation]); // 子の変形用データ
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

    update() {
        // グラフィックメッシュ
        if (!this.graphicMeshs.length) return ;
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
        computePassEncoder.setPipeline(animationApplyPipeline);
        computePassEncoder.setBindGroup(0, this.gpuData.graphicMeshData.animationApplyGroup); // 全てのグラフィックスメッシュのデータをバインド
        computePassEncoder.dispatchWorkgroups(Math.ceil(this.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ

        computePassEncoder.setPipeline(bezierAnimationApplyPipeline);
        computePassEncoder.setBindGroup(0, this.gpuData.bezierModifierData.animationApplyGroup); // 全てのベジェモディファイアのデータをバインド
        computePassEncoder.dispatchWorkgroups(Math.ceil(this.bezierModifiers.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ

        computePassEncoder.setPipeline(boneAnimationApplyPipeline);
        computePassEncoder.setBindGroup(0, this.gpuData.boneModifierData.animationApplyGroup); // 全てのボーンモディファイアのデータをバインド
        computePassEncoder.dispatchWorkgroups(Math.ceil(this.boneModifiers.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ

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
        childrenRoop(this.app.hierarchy.surface);

        // グラフィックメッシュ親の変形を適応
        computePassEncoder.setBindGroup(1, this.gpuData.bezierModifierData.applyParentGroup);
        computePassEncoder.setPipeline(parallelAnimationApplyPipeline);
        computePassEncoder.setBindGroup(0, this.gpuData.graphicMeshData.parentApplyGroup);
        computePassEncoder.dispatchWorkgroups(Math.ceil(this.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ

        computePassEncoder.end();
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
                // this.editor.layer.appendLayer("",object);
                this.graphicMeshs.push(object);
                // this.editor.layer.appendLayer("",object);
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
                object = new BoneModifier(data.name,data.id);
                object.init(data);
                this.boneModifiers.push(object);
            } else if (data.type == "アニメーションコレクター" || data.type == "am") {
                object = new AnimationCollector(data.name,data.id);
                object.init(data);
                this.animationCollectors.push(object);
            }
        } else if (data.type) { // 空のオブジェクトを作る
            let type = data.type;
            if (type == "アニメーションコレクター") {
                object = new AnimationCollector("名称未設定");
                this.animationCollectors.push(object);
                managerForDOMs.update("タイムライン-チャンネル");
                managerForDOMs.update("タイムライン-タイムライン-オブジェクト");
                managerForDOMs.update(this.animationCollectors);
                this.allObject.push(object);
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
                    object = new BoneModifier("名称未設定");
                    this.boneModifiers.push(object);
                }
                this.allObject.push(object);
                this.addHierarchy("", object);
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
    updateRenderingOrder(fineness) {
        if (!this.isChangeObjectsZindex) return ;
        const createEmptyArray = (length) => {
            const result = [];
            for (let i = 0; i < length; i ++) {
                result.push([]);
            }
            return result;
        }
        const supportFn = (graphicMeshs) => {
            const belongChunk = Math.floor(graphicMeshs.zIndex / chunkRate);
            for (let i = 0; i < chunks[belongChunk].length; i ++) {
                if (chunks[belongChunk][i][1] > graphicMeshs.zIndex) {
                    chunks[belongChunk].splice(i,0,[graphicMeshs, graphicMeshs.zIndex]);
                    return ;
                }
            }
            chunks[belongChunk].push([graphicMeshs, graphicMeshs.zIndex]);
            return ;
        }
        const chunkRate = 1000 / fineness;
        const chunks = createEmptyArray(fineness);
        this.graphicMeshs.forEach(graphicMesh => {
            supportFn(graphicMesh);
        });
        this.renderingOrder.length = 0;
        for (const datas of chunks) {
            for (const data of datas) {
                this.renderingOrder.push(data[0]);
            }
        }
        this.isChangeObjectsZindex = false;
        managerForDOMs.update("表示順番");
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