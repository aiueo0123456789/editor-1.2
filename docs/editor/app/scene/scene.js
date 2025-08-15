import { device, GPU } from '../../utils/webGPU.js';
import { createID, managerForDOMs } from '../../utils/ui/util.js';
import { GraphicMesh } from '../../core/objects/graphicMesh.js';
import { BezierModifier } from '../../core/objects/bezierModifier.js';
import { Bone, Armature } from '../../core/objects/armature.js';
import { AnimationCollector } from '../../core/objects/animationCollector.js';
import { arrayToSet, changeParameter, createArrayN, indexOfSplice, isNumber, loadFile, objectInit, arrayToPush, range } from '../../utils/utility.js';
import { app, Application } from '../app.js';
import { vec2 } from '../../utils/mathVec.js';
import { RuntimeDatas } from '../../core/runtime/runtimeDatas.js';
import { ParameterManager } from '../../core/objects/parameterManager.js';
import { Particle } from '../../core/objects/particle.js';
import { Script } from '../../core/objects/script.js';
import { Camera } from '../../core/objects/camera.js';

const parallelAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/propagation/from_graphicMesh.wgsl"));
const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Cu"), GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/propagation/from_bezierModifier.wgsl"));
const animationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/applyAnimation/from_vec2.wgsl"));
const bezierAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/applyAnimation/from_vec2x3.wgsl"));
const boneAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/applyAnimation/from_bone.wgsl"));
const propagateBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csrw"),GPU.getGroupLayout("Csr")], await loadFile("./editor/shader/compute/object/bone/propagation.wgsl"));
const physicsBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csrw"),GPU.getGroupLayout("Csr")], await loadFile("./editor/shader/compute/object/bone/attachments/physics.wgsl"));
const calculateBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/object/bone/calculateVertices.wgsl"));

const boneHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/armature/hitTest.wgsl"));
const bezierModifierHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/bezierModifier/hitTest.wgsl"));
const polygonsHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/graphicMesh/hitTest.wgsl"));

const calculateLimitBoneBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Csr_Csr")], await loadFile("./editor/shader/compute/utils/boundingBox/from_bone.wgsl"));
const calculateLimitVerticesBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Csr_Csr")], await loadFile("./editor/shader/compute/utils/boundingBox/from_vertex.wgsl"));
const BBoxResultBuffer = GPU.createStorageBuffer(2 * 4 * 2, undefined, ["f32"]);
const BBoxCalculateBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["i32"]);
const BBoxGroup0 = GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw"), [BBoxResultBuffer,BBoxCalculateBuffer]);

const templateParticleUpdateCode = `
// MIT License. © Stefan Gustavson, Munrocket
fn permute4(x: vec4f) -> vec4f { return ((x * 34. + 1.) * x) % vec4f(289.); }
fn fade2(t: vec2f) -> vec2f { return t * t * t * (t * (t * 6. - 15.) + 10.); }
fn perlinNoise2(P: vec2f) -> f32 {
    var Pi: vec4f = floor(P.xyxy) + vec4f(0., 0., 1., 1.);
    let Pf = fract(P.xyxy) - vec4f(0., 0., 1., 1.);
    Pi = Pi % vec4f(289.); // To avoid truncation effects in permutation
    let ix = Pi.xzxz;
    let iy = Pi.yyww;
    let fx = Pf.xzxz;
    let fy = Pf.yyww;
    let i = permute4(permute4(ix) + iy);
    var gx: vec4f = 2. * fract(i * 0.0243902439) - 1.; // 1/41 = 0.024...
    let gy = abs(gx) - 0.5;
    let tx = floor(gx + 0.5);
    gx = gx - tx;
    var g00: vec2f = vec2f(gx.x, gy.x);
    var g10: vec2f = vec2f(gx.y, gy.y);
    var g01: vec2f = vec2f(gx.z, gy.z);
    var g11: vec2f = vec2f(gx.w, gy.w);
    let norm = 1.79284291400159 - 0.85373472095314 *
        vec4f(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
    g00 = g00 * norm.x;
    g01 = g01 * norm.y;
    g10 = g10 * norm.z;
    g11 = g11 * norm.w;
    let n00 = dot(g00, vec2f(fx.x, fy.x));
    let n10 = dot(g10, vec2f(fx.y, fy.y));
    let n01 = dot(g01, vec2f(fx.z, fy.z));
    let n11 = dot(g11, vec2f(fx.w, fy.w));
    let fade_xy = fade2(Pf.xy);
    let n_x = mix(vec2f(n00, n01), vec2f(n10, n11), vec2f(fade_xy.x));
    let n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
}

struct Allocation {
    particleOffset: u32,
    MAX_PARTICLES: u32,
    padding0: u32,
    padding1: u32,
    padding2: u32,
    padding3: u32,
    padding4: u32,
    padding5: u32,
}

struct Particle {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    zIndex: f32,
}

const delet = 1.0 / 60.0;

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> updateDatas: array<Particle>;
@group(1) @binding(0) var<uniform> allocation: Allocation;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let instanceIndex = global_id.y;
    if (allocation.MAX_PARTICLES <= instanceIndex) {
        return ;
    }

    let fixVertexIndex = allocation.particleOffset + instanceIndex;
    var particle = particles[fixVertexIndex];
    var updateData = updateDatas[fixVertexIndex];
    // updateData.position += vec2<f32>(0.5,-0.1);
    updateData.position += vec2<f32>(perlinNoise2(particle.position / 10.0), perlinNoise2(particle.position / 10.0 + 10.0)) * 2.0;
    particle.position += updateData.position * delet;
    particle.scale += updateData.scale * delet;
    particle.angle += updateData.angle * delet;
    updateDatas[fixVertexIndex] = updateData;
    particles[fixVertexIndex] = particle;
}`;

export const objectToNumber = {
    "グラフィックメッシュ": 1,
    "ベジェモディファイア": 2,
    "アーマチュア": 3,
};

class Objects {
    constructor(scene) {
        this.scene = scene;
        this.previewCamera = [];
        this.animationCollectors = [];
        this.bezierModifiers = [];
        this.graphicMeshs = [];
        this.armatures = [];
        this.keyframeBlocks = [];
        this.parameterManagers = [];
        this.particles = [];
        this.scripts = [];
        this.renderingCamera = new Camera();

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
        let objectType = data.type;
        if (objectType == "アニメーションコレクター") {
            return new AnimationCollector("名称未設定");
        } else if (objectType == "グラフィックメッシュ") {
            return new GraphicMesh(data);
        } else if (objectType == "ベジェモディファイア") {
            return new BezierModifier(data);
        } else if (objectType == "アーマチュア") {
            return new Armature(data);
        } else if (objectType == "パラメーターマネージャー") {
            return new ParameterManager(data);
        } else if (objectType == "パーティクル") {
            return new Particle(data);
        } else if (objectType == "スクリプト") {
            return new Script(data);
        }
    }

    createEmptyObject() {
        return ;
    }

    createObjectAndSetUp(data) {
        return this.appendObject(this.createObject(data));
    }

    // オブジェクトの所属する配列を返す
    searchArrayFromObject(object) {
        return this.searchArrayFromType(object.type);
    }

    // 属性から所属する配列を返す
    searchArrayFromType(objectType) {
        if (objectType == "グラフィックメッシュ") {
            return this.graphicMeshs;
        } else if (objectType == "ベジェモディファイア") {
            return this.bezierModifiers;
        } else if (objectType == "アーマチュア") {
            return this.armatures;
        } else if (objectType == "アニメーションコレクター") {
            return this.animationCollectors;
        } else if (objectType == "キーフレームブロック") {
            return this.keyframeBlocks;
        } else if (objectType == "パラメーターマネージャー") {
            return this.parameterManagers;
        } else if (objectType == "パーティクル") {
            return this.particles;
        } else if (objectType == "スクリプト") {
            return this.scripts;
        }
    }

    getObjectFromID(id) {
        try {
            return this.allObject.filter(object => object.id == id)[0];
        } catch (err) {
            return null;
        }
    }

    // オブジェクトの削除
    removeObject(object) {
        indexOfSplice(this.searchArrayFromObject(object), object);
        indexOfSplice(this.allObject, object);
        this.scene.runtimeData.delete(object.runtimeData, object);
    }

    appendObject(object) {
        if (object.runtimeData) {
            this.scene.runtimeData.append(object.runtimeData, object);
            object.runtimeData.updateBaseData(object);
        }
        arrayToPush(this.searchArrayFromType(object.type), object);
        this.allObject.push(object);
        return object;
    }
}

class Hierarchy {
    constructor(scene) {
        this.scene = scene;
        this.objects = {type: "objects", id: "&objects", isRoot: true, children: []};
        this.scripts = {type: "scripts", id: "&scripts", isRoot: true, children: []};
        this.particles = {type: "particles", id: "&particles", isRoot: true, children: []};
        this.root = [
            this.objects,
            this.scripts,
            this.particles,
        ];
    }

    get includeObjects() {
        const getLoopChildren = (children, result = []) => {
            for (const child of children) {
                if (!child.isRoot) {
                    result.push(child);
                }
                if (child.children) { // 子要素がある場合ループする
                    getLoopChildren(child.children, result);
                }
            }
            return result;
        }
        return getLoopChildren(this.root);
    }

    // 全てのオブジェクトをgc対象にしてメモリ解放
    destroy() {
        this.root.length = 0;
    }

    searchObjectFromID(id) {
        if (id == "&objects") {
            return this.objects;
        } else if (id == "&scripts") {
            return this.scripts;
        } else if (id == "&particles") {
            return this.particles;
        } else {
            return this.scene.searchObjectFromID(id);
        }
    }

    getSaveData() {
        const allObject = this.includeObjects;
        const saveData = [];
        for (const object of allObject) {
            if (object.type != "アニメーションコレクター") {
                // [[親の情報: [name,type], 自分の情報: [name,type]],...]
                console.log(object)
                saveData.push([object.parent.id,object.id]);
            }
        }
        return saveData;
    }

    set(saveData) {
        for (const [parentID, myID] of saveData) {
            const parent = this.searchObjectFromID(parentID);
            const child = this.searchObjectFromID(myID);
            console.log(child,parent)
            this.append(child, parent);
        }
    }

    updateParent(object) {
        if (object.type == "グラフィックメッシュ" || object.type == "ベジェモディファイア") {
            object.runtimeData.updateAllocationData(object);
        }
    }

    append(object, parent) { // ヒエラルキーに追加
        if (parent) {
            object.parent = parent;
            parent.children.push(object);
        } else {
            this.root[0].children.push(object);
            object.parent = this.root[0];
        }
        this.updateParent(object);
        managerForDOMs.update(this.root);
    }

    insert(object, parent) { // ヒエラルキーの並び替え
        this.remove(object);
        this.append(object, parent);
        if (parent) {
            if (object.autoWeight) {
                this.scene.app.options.assignWeights(object);
            }
        }
    }

    remove(object) {
        object.parent.children.splice(object.parent.children.indexOf(object), 1);
        if (object.children) {
            // 削除対象の子要素を削除対象の親要素の子要素にする
            while (object.children.length > 0) {
                this.addHierarchy(object.parent, object.children.pop());
            }
        }
        this.updateParent(object);
        managerForDOMs.update(this.root);
    }
}

// オブジェクトの保持・設定
export class Scene {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.objects = new Objects(this);
        this.hierarchy = new Hierarchy(this);
        this.objects.createObjectAndSetUp({type: "パラメーターマネージャー"});

        this.renderingOrder = [];

        // フレーム
        this.isPlaying = false;
        this.isReversePlaying = false;
        this.frame_speed = 1.0;
        this.frame_start = 0;
        this.frame_end = 10;
        this.frame_current = 0;
        this.beforeFrame = this.frame_current;

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
        this.objects.appendObject(this.objects.createObject({
            type: "スクリプト",
            name: "スクリプトテスト",
            id: "templateParticleUpdateCode",
            text: templateParticleUpdateCode
        }));
        // this.objects.appendObject(this.objects.createObject({
        //     type: "パーティクル",
        //     name: "パーティクルテスト",
        //     spawnData: {
        //         position: {min: [0,-1000],max: [0,0]},
        //         zIndex: {min: 1, max: 10},
        //         scale: {min: 5,max: 20},
        //         angle: {min: 0,max: 3},
        //         velocity: {min: [100,-80],max: [200,-50]},
        //         zIndexVelocity: 0,
        //         scaleVelocity: [0,0],
        //         angleVelocity: {min: 0,max: 1},
        //         maxLifeTime: 1000,
        //     },
        //     spawnNum: 1,
        //     duration: 100,
        //     startDelay: 10
        // }));
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

    frameUpdate(dt) {
        if (this.isPlaying) {
            this.frame_current += dt * this.frame_speed;
            managerForDOMs.update("タイムライン-canvas");
        } else if (this.isReversePlaying) {
            this.frame_current -= dt * this.frame_speed;
            managerForDOMs.update("タイムライン-canvas");
        }
        if (this.beforeFrame != this.frame_current) {
            if (this.frame_end < this.frame_current) {
                this.frame_current = this.frame_start;
            }
            if (this.frame_current < this.frame_start) {
                this.frame_current = this.frame_end;
            }
            this.beforeFrame = this.frame_current;
            managerForDOMs.update(this, "frame_current");
        }
    }

    update() {
        for (const particle of this.objects.particles) {
            particle.update();
        }
        if (!(this.objects.armatures.length || this.objects.graphicMeshs.length || this.objects.bezierModifiers.length)) return ;
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
        computePassEncoder.setBindGroup(0, this.runtimeData.particle.updateGroup); // 全てのグラフィックスメッシュのデータをバインド
        for (const particle of this.objects.particles) {
            computePassEncoder.setBindGroup(1, particle.C_objectDataGroup); // 全てのグラフィックスメッシュのデータをバインド
            computePassEncoder.setPipeline(particle.updatePipeline.pipeline);
            computePassEncoder.dispatchWorkgroups(Math.ceil(particle.particlesNum / 64), 1, 1); // ワークグループ数をディスパッチ
        }

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
        computePassEncoder.setBindGroup(0, this.runtimeData.armatureData.propagateGroup); // 全てのアーマチュアのデータをバインド
        for (const nowDepthData of this.runtimeData.armatureData.propagate) {
            if ("propagateGroup" in nowDepthData) {
                computePassEncoder.setPipeline(propagateBonePipeline);
                computePassEncoder.setBindGroup(1, nowDepthData.propagateGroup); // 全てのアーマチュアのデータをバインド
                computePassEncoder.dispatchWorkgroups(Math.ceil(nowDepthData.boneNum / 64), 1, 1); // ワークグループ数をディスパッチ
            }
            computePassEncoder.setBindGroup(1, nowDepthData.boneIndexsGroup); // 全てのアーマチュアのデータをバインド
            computePassEncoder.setPipeline(physicsBonePipeline);
            computePassEncoder.dispatchWorkgroups(Math.ceil(nowDepthData.boneNum / 64), 1, 1); // ワークグループ数をディスパッチ
        }

        const childrenRoop = (children) => {
            for (const child of children) {
                if (!child.parent.root) {
                    if (child.type == "ベジェモディファイア") {
                        // ベジェモディファイア親の変形を適応
                        computePassEncoder.setBindGroup(0, child.individualGroup);
                        computePassEncoder.dispatchWorkgroups(Math.ceil(child.verticesNum / 64), 1, 1); // ワークグループ数をディスパッチ
                    }
                }
                if (child.children) { // 子要素がある場合ループする
                    childrenRoop(child.children);
                }
            }
        }
        computePassEncoder.setBindGroup(1, this.runtimeData.bezierModifierData.parentApplyGroup);
        computePassEncoder.setBindGroup(2, this.runtimeData.armatureData.applyParentGroup);
        computePassEncoder.setPipeline(treeAnimationApplyPipeline);
        childrenRoop(this.hierarchy.root[0].children);

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
        const conversion = {"スクリプト": "scripts", "パーティクル": "particles", "グラフィックメッシュ": "graphicMeshs", "ベジェモディファイア": "bezierModifiers", "アーマチュア": "armatures", "アニメーションコレクター": "animationCollectors", "キーフレームブロック": "keyframeBlocks", "パラメーターマネージャー": "parameterManagers"};
        const result = {scripts: [], particles: [], graphicMeshs: [], bezierModifiers: [], armatures: [], rotateMOdifiers: [], animationCollectors: [], keyframeBlocks: [], parameterManagers: []};
        // 各オブジェクトの保存処理を並列化
        const promises = this.objects.allObject.map(async (object) => {
            return { type: object.type, data: await object.getSaveData() };
        });
        const resolved = await Promise.all(promises);
        // 結果を type ごとにまとめる
        for (const { type, data } of resolved) {
            result[conversion[type]].push(data);
        }
        result.hierarchy = this.hierarchy.getSaveData();
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
        this.hierarchy.destroy();
        this.objects.destroy();
    }

    appendMaskTexture(name) {
        arrayToPush(this.maskTextures, new MaskTexture(name, this.app.appConfig.MASKTEXTURESIZE));
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
        if (!id) return null;
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