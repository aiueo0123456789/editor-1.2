import { device, GPU } from '../../utils/webGPU.js';
import { createID, managerForDOMs } from '../../utils/ui/util.js';
import { GraphicMesh } from '../../core/objects/graphicMesh.js';
import { BezierModifier } from '../../core/objects/bezierModifier.js';
import { Bone, Armature } from '../../core/objects/armature.js';
import { AnimationCollector } from '../../core/objects/animationCollector.js';
import { arrayToSet, changeParameter, createArrayN, indexOfSplice, isNumber, loadFile, objectInit, pushArray, range } from '../../utils/utility.js';
import { app, Application } from '../app.js';
import { vec2 } from '../../utils/mathVec.js';
import { mathMat3x3 } from '../../utils/mathMat.js';
import { RuntimeDatas } from '../../core/runtime/runtimeDatas.js';

const parallelAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/propagation/from_graphicMesh.wgsl"));
const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Cu"), GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/propagation/from_bezierModifier.wgsl"));
const animationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/applyAnimation/from_vec2.wgsl"));
const bezierAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/applyAnimation/from_vec2x3.wgsl"));
const boneAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/applyAnimation/from_bone.wgsl"));
const propagateBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"),GPU.getGroupLayout("Csr")], await loadFile("./editor/shader/compute/object/bone/propagation.wgsl"));
const calculateBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/object/bone/calculateVertices.wgsl"));

const boneHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/armature/hitTest.wgsl"));
const bezierModifierHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/bezierModifier/hitTest.wgsl"));
const polygonsHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/graphicMesh/hitTest.wgsl"));



const calculateLimitBoneBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Csr_Csr")], await loadFile("./editor/shader/compute/utils/boundingBox/from_bone.wgsl"));
const calculateLimitVerticesBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Csr_Csr")], await loadFile("./editor/shader/compute/utils/boundingBox/from_vertex.wgsl"));
const BBoxResultBuffer = GPU.createStorageBuffer(2 * 4 * 2, undefined, ["f32"]);
const BBoxCalculateBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["i32"]);
const BBoxGroup0 = GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw"), [BBoxResultBuffer,BBoxCalculateBuffer]);

export const objectToNumber = {
    "グラフィックメッシュ": 1,
    "ベジェモディファイア": 2,
    "アーマチュア": 3,
};

class Objects {
    constructor(/** @type {Application} */ app) {
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
        this.app.scene.runtimeData.delete(object.runtimeData, object);
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

        this.runtimeData = new RuntimeDatas(app);

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
                    // GPU.consoleBufferData(this.runtimeData.graphicMeshData.renderingVertices.buffer, ["f32","f32"]);
                    // GPU.consoleBufferData(this.runtimeData.graphicMeshData.meshes.buffer, ["u32","u32","u32"]);
                    // GPU.consoleBufferData(object.objectMeshData, ["u32"]);
                    hitTestGroup = GPU.createGroup(
                        GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu"),
                        [
                            resultBuffer,
                            this.runtimeData.graphicMeshData.renderingVertices.buffer,
                            this.runtimeData.graphicMeshData.meshes.buffer,
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
                            this.runtimeData.armatureData.renderingVertices.buffer,
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
                            this.runtimeData.bezierModifierData.renderingVertices.buffer,
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
            graphicMesh.animationBlock.list.forEach(animation => {
                GPU.writeBuffer(this.runtimeData.graphicMeshData.animationWights.buffer, new Float32Array([animation.weight]), animation.worldWeightIndex * 4);
            });
        }
        for (const bezierModifier of this.objects.bezierModifiers) {
            bezierModifier.animationBlock.list.forEach(animation => {
                GPU.writeBuffer(this.runtimeData.bezierModifierData.animationWights.buffer, new Float32Array([animation.weight]), animation.worldWeightIndex * 4);
            });
        }
        for (const armature of this.objects.armatures) {
            armature.allBone.forEach(bone => {
                if (bone) {
                    GPU.writeBuffer(this.runtimeData.armatureData.runtimeAnimationData.buffer, new Float32Array([bone.x, bone.y, bone.sx, bone.sy, bone.r]), (armature.runtimeOffsetData.boneOffset + bone.index) * this.runtimeData.armatureData.boneBlockByteLength);
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
        changeParameter(this, "activeObject", object);
        managerForDOMs.update("アクティブオブジェクト");
    }

    setModeForSelected(mode) {
        console.log("モードの切り替え",mode)
        if (this.selectedObject.length == 0) return ;
        changeParameter(this, "currentMode", mode);
        this.currentMode = mode;
        for (const object of this.selectedObject) {
            object.mode = mode;
        }
        managerForDOMs.update(this.selectedObject);
    }

    isSelect(object) {
        return this.selectedObject.includes(object);
    }

    getSelectBone() {
        const result = [];
        for (const /** @type {Armature} */ armature of this.selectedObject.filter(object => object.type == "アーマチュア")) {
            result.push(...armature.allBone.filter(bone => bone && bone.selectedBone));
        }
        return result;
    }

    getSelectVertices() {
        const result = [];
        for (const object of this.selectedObject) {
            if (object.type == "アーマチュア") {
                for (const bone of object.allBone) {
                    if (bone.baseHead.selected) {
                        result.push(bone.baseHead);
                    }
                    if (bone.baseTail.selected) {
                        result.push(bone.baseTail);
                    }
                }
            } else if (object.type == "グラフィックメッシュ") {
                result.push(...object.allVertices.filter(vertex => vertex && vertex.selected));
            } else if (object.type == "ベジェモディファイア") {
                for (const point of object.allPoint) {
                    if (point.basePoint.selected) {
                        result.push(point.basePoint);
                    }
                    if (point.baseLeftControlPoint.selected) {
                        result.push(point.baseLeftControlPoint);
                    }
                    if (point.baseRightControlPoint.selected) {
                        result.push(point.baseRightControlPoint);
                    }
                }
            }
        }
        return result;
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