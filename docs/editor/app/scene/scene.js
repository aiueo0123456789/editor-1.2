import { device, GPU } from '../../utils/webGPU.js';
import { managerForDOMs } from '../../utils/ui/util.js';
import { GraphicMesh } from '../../core/objects/graphicMesh.js';
import { BezierModifier } from '../../core/objects/bezierModifier.js';
import { Armature } from '../../core/objects/armature.js';
import { indexOfSplice, loadFile, pushToArray } from '../../utils/utility.js';
import { Application } from '../app.js';
import { RuntimeDatas } from '../../core/runtime/runtimeDatas.js';
import { ParameterManager } from '../../core/objects/parameterManager.js';
import { Particle } from '../../core/objects/particle.js';
import { Script } from '../../core/objects/script.js';
import { Camera } from '../../core/objects/camera.js';
import { DeleteObjectCommand } from '../../commands/object/object.js';
import { Texture } from '../../core/objects/texture.js';
import { MaskTexture } from '../../core/objects/maskTexture.js';
import { UnfixedReference } from '../../utils/objects/util.js';
import { EditDatas } from '../../core/edit/editData.js';
import { KeyframeBlock } from '../../core/objects/keyframeBlock.js';
import { BArmatureAnimation } from '../../core/edit/objects/BArmatureAnimation.js';
import { BlendShape } from '../../core/objects/blendShape.js';

const parallelAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./editor/shader/compute/object/graphicMesh/parent.wgsl"));
const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Cu"), GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./editor/shader/compute/object/bezierModifier/parent.wgsl"));

const meshShapeKeyApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/object/graphicMesh/shapeKey.wgsl"));
const bezierShapeKeyApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/object/bezierModifier/shapeKey.wgsl"));

const boneAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/object/bone/animation.wgsl"));
const propagateBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csrw"),GPU.getGroupLayout("Csr")], await loadFile("./editor/shader/compute/object/bone/propagation.wgsl"));
const physicsBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csrw"),GPU.getGroupLayout("Csr")], await loadFile("./editor/shader/compute/object/bone/physics.wgsl"));
const calculateBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/object/bone/calculateVertices.wgsl"));

const boneHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/armature/hitTest.wgsl"));
const bezierModifierHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/bezierModifier/hitTest.wgsl"));
const polygonsHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/graphicMesh/hitTest.wgsl"));

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

class ObjectsMetaData {
    constructor(objects) {
        this.objects = objects;
    }

    update() {
    }
}

class Objects {
    constructor(scene) {
        this.scene = scene;
        this.previewCamera = [];
        /** @type {BezierModifier[]} */
        this.bezierModifiers = [];
        /** @type {GraphicMesh[]} */
        this.graphicMeshs = [];
        /** @type {Armature[]} */
        this.armatures = [];
        /** @type {KeyframeBlock[]} */
        this.keyframeBlocks = [];
        /** @type {ParameterManager[]} */
        this.parameterManagers = [];
        /** @type {Particle[]} */
        this.particles = [];
        /** @type {Script[]} */
        this.scripts = [];
        /** @type {Texture[]} */
        this.textures = [];
        /** @type {MaskTexture[]} */
        this.maskTextures = [];
        /** @type {BlendShape[]} */
        this.blendShapes = [];

        this.renderingCamera = new Camera();

        this.metaData = new ObjectsMetaData(this);
    }

    get allObject() {
        return this.previewCamera.concat(this.bezierModifiers).concat(this.graphicMeshs).concat(this.armatures).concat(this.keyframeBlocks).concat(this.parameterManagers).concat(this.particles).concat(this.scripts).concat(this.textures).concat(this.maskTextures).concat(this.blendShapes).concat(this.shapeKeys);
        // return [...this.previewCamera, ...this.bezierModifiers, ...this.graphicMeshs, ...this.armatures, ...this.keyframeBlocks, ...this.parameterManagers, ...this.particles, ...this.scripts, ...this.textures, ...this.maskTextures, ...this.blendShapes, ...this.shapeKeys];
    }

    get shapeKeys() {
        return this.graphicMeshs.map(graphicMesh => graphicMesh.shapeKeyMetaDatas).concat(this.bezierModifiers.map(bezierModifier => bezierModifier.shapeKeyMetaDatas)).flat();
    }

    get rootObjects() {
        return this.allObject.filter(object => {return "parent" in object && object.parent == null});
    }

    // 参照されていないオブジェクトの削除
    clean() {
        const removeTextures = this.textures.filter(texture => !texture.isReferenced);
        for (const texture of removeTextures) {
            this.removeObject(texture);
        }
    }

    destroy() {
        this.bezierModifiers.length = 0;
        this.graphicMeshs.length = 0;
        this.armatures.length = 0;
        this.keyframeBlocks.length = 0;
    }

    createObject(data) {
        let objectType = data.type;
        if (objectType == "グラフィックメッシュ") {
            return new GraphicMesh(data);
        } else if (objectType == "ベジェモディファイア") {
            return new BezierModifier(data);
        } else if (objectType == "アーマチュア") {
            return new Armature(data);
        } else if (objectType == "キーフレームブロック") {
            return new KeyframeBlock(data);
        } else if (objectType == "パラメーターマネージャー") {
            return new ParameterManager(data);
        } else if (objectType == "パーティクル") {
            return new Particle(data);
        } else if (objectType == "スクリプト") {
            return new Script(data);
        } else if (objectType == "テクスチャ") {
            return new Texture(data);
        } else if (objectType == "マスクテクスチャ") {
            return new MaskTexture(data);
        } else if (objectType == "ブレンドシェイプ") {
            return new BlendShape(data);
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
        if (objectType == "グラフィックメッシュ") return this.graphicMeshs;
        else if (objectType == "ベジェモディファイア") return this.bezierModifiers;
        else if (objectType == "アーマチュア") return this.armatures;
        else if (objectType == "キーフレームブロック") return this.keyframeBlocks;
        else if (objectType == "パラメーターマネージャー") return this.parameterManagers;
        else if (objectType == "パーティクル") return this.particles;
        else if (objectType == "スクリプト") return this.scripts;
        else if (objectType == "テクスチャ") return this.textures;
        else if (objectType == "マスクテクスチャ") return this.maskTextures;
        else if (objectType == "ブレンドシェイプ") return this.blendShapes;
        else if (objectType == "シェイプキー") return this.shapeKeys;
    }

    getObjectFromID(id) {
        if (!id) return null;
        const foundObject = this.allObject.filter(object => object.id == id);
        if (foundObject.length == 0) return new UnfixedReference(id);
        else return foundObject[0];
    }

    getObjectsFromeTypes(types) {
        return this.allObject.filter(object => types.includes(object.type));
    }

    // オブジェクトの削除
    removeObject(object) {
        indexOfSplice(this.searchArrayFromObject(object), object);
        if (object.runtimeData) {
            this.scene.runtimeData.delete(object.runtimeData, object);
        }
    }

    appendObject(object) {
        if (object.runtimeData) {
            object.runtimeData.append(object);
            object.runtimeData.update(object);
        }
        pushToArray(this.searchArrayFromType(object.type), object);
        return object;
    }
}

// オブジェクトの保持・設定
export class Scene {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.objects = new Objects(this);
        // this.objects.createObjectAndSetUp({type: "パラメーターマネージャー"});

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
        this.editData = new EditDatas(app);

        const updateKeyframe = () => {
            this.updateAnimation(this.frame_current);
        }

        managerForDOMs.set({o: this, g: "_", i: "frame_current"}, updateKeyframe);
    }

    get allRenderingOrder() {
        return this.renderingOrder.concat(this.objects.bezierModifiers).concat(this.objects.armatures);
    }

    init() {
        // const texture = this.objects.createObject({
        //     type: "テクスチャ",
        //     name: "未設定テクスチャ",
        //     id: "isNotTexture",
        //     texture: GPU.isNotTexture
        // });
        // this.objects.appendObject(texture);

        // const script = this.objects.createObject({
        //     type: "スクリプト",
        //     name: "スクリプトテスト",
        //     id: "templateParticleUpdateCode",
        //     text: templateParticleUpdateCode
        // });
        // this.objects.appendObject(script);

        if (true) { // 白のマスクテクスチャ
            const baseMaskTexture = this.objects.createObjectAndSetUp({name: "base", type: "マスクテクスチャ", id: "baseMaskTexture"});
        }
    }

    reset() {
        this.app.operator.appendCommand(new DeleteObjectCommand(this.objects.allObject));
        this.app.operator.execute();
    }

    // オブジェクトとの当たり判定
    async rayCast(point, option = {types: ["グラフィックメッシュ", "アーマチュア", "ベジェモディファイア"], depth: true}) {
        const optionBuffer = GPU.createUniformBuffer(4, [0], ["u32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, [...point], ["f32"]);
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
                    GPU.runComputeShader(polygonsHitTestPipeline, [hitTestGroup], Math.ceil(object.meshesNum / 64));
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
                    GPU.runComputeShader(boneHitTestPipeline, [hitTestGroup], Math.ceil(object.bonesNum / 64));
                } else if (object.type === "ベジェモディファイア") {
                    hitTestGroup = GPU.createGroup(
                        GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Cu"),
                        [
                            resultBuffer,
                            this.runtimeData.bezierModifierData.renderingVertices.buffer,
                            object.objectDataBuffer,
                            this.app.activeArea.uiModel.camera.cameraDataBuffer,
                            optionBuffer,
                            pointBuffer
                        ]
                    );
                    GPU.runComputeShader(bezierModifierHitTestPipeline, [hitTestGroup], Math.ceil(object.verticesNum / 64));
                }
                const resultBufferData = await GPU.getU32BufferData(resultBuffer, 4);
                if (resultBufferData[0] === 1) {
                    return object;
                } else {
                    return null;
                }
            });
        const allResults = await Promise.all(promises);
        const result = [];
        for (const obj of allResults) {
            if (obj) result.push(obj);
        }
        if (option.depth) {
            result.sort((a, b) => {
                const az = a.zIndex;
                const bz = b.zIndex;

                // どちらかがzIndexを持たない場合
                if (az === undefined && bz !== undefined) return -1; // aを先に
                if (az !== undefined && bz === undefined) return 1;  // bを先に

                // 両方zIndexを持たないなら順序を変えない
                if (az === undefined && bz === undefined) return 0;

                // どちらも存在するなら数値で降順ソート
                return bz - az;
            });
        }
        return result;
    }

    frameUpdate(dt) {
        if (this.isPlaying) {
            this.frame_current += dt * this.frame_speed;
            managerForDOMs.update({o: "タイムライン-canvas"});
        } else if (this.isReversePlaying) {
            this.frame_current -= dt * this.frame_speed;
            managerForDOMs.update({o: "タイムライン-canvas"});
        }
        if (this.beforeFrame != this.frame_current) {
            if (this.frame_end < this.frame_current) {
                this.frame_current = this.frame_start;
            }
            if (this.frame_current < this.frame_start) {
                this.frame_current = this.frame_end;
            }
            this.beforeFrame = this.frame_current;
            managerForDOMs.update({o: this, i: "frame_current"});
        }
    }

    update() {
        for (const blendShape of this.objects.blendShapes) {
            blendShape.update();
        }
        for (const particle of this.objects.particles) {
            particle.update();
        }
        for (const graphicMesh of this.objects.graphicMeshs) {
            GPU.writeBuffer(this.runtimeData.graphicMeshData.shapeKeyWights.buffer, new Float32Array(graphicMesh.allShapeKeyWeights), graphicMesh.runtimeOffsetData.start.shapeKeyWeightsOffset * 4);
        }
        for (const bezierModifier of this.objects.bezierModifiers) {
            GPU.writeBuffer(this.runtimeData.bezierModifierData.shapeKeyWights.buffer, new Float32Array(bezierModifier.allShapeKeyWeights), bezierModifier.runtimeOffsetData.start.shapeKeyWeightsOffset * 4);
        }
        for (const armature of this.objects.armatures) {
            GPU.writeBuffer(this.runtimeData.armatureData.runtimeAnimationData.buffer, new Float32Array(armature.allAnimations), armature.runtimeOffsetData.start.boneOffset * this.runtimeData.armatureData.boneBlockByteLength);
        }
        const computeCommandEncoder = device.createCommandEncoder();
        const computePassEncoder = computeCommandEncoder.beginComputePass();
        if (this.objects.graphicMeshs.length && this.objects.armatures.length  && this.objects.bezierModifiers.length) {
            if (this.objects.particles.length) {
                computePassEncoder.setBindGroup(0, this.runtimeData.particle.updateGroup); // 全てのパーティクルのデータをバインド
                for (const particle of this.objects.particles) {
                    computePassEncoder.setBindGroup(1, particle.C_objectDataGroup); // 全てのパーティクルのデータをバインド
                    computePassEncoder.setPipeline(particle.updatePipeline.pipeline);
                    computePassEncoder.dispatchWorkgroups(Math.ceil(particle.particlesNum / 64), 1, 1); // ワークグループ数をディスパッチ
                }
            }

            if (this.objects.graphicMeshs.length) {
                computePassEncoder.setPipeline(meshShapeKeyApplyPipeline);
                computePassEncoder.setBindGroup(0, this.runtimeData.graphicMeshData.shapeKeyApplyGroup); // 全てのグラフィックスメッシュのデータをバインド
                computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
            }
            if (this.objects.bezierModifiers.length) {
                computePassEncoder.setPipeline(bezierShapeKeyApplyPipeline);
                computePassEncoder.setBindGroup(0, this.runtimeData.bezierModifierData.shapeKeyApplyGroup); // 全てのベジェモディファイアのデータをバインド
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
                computePassEncoder.setBindGroup(1, nowDepthData.propagateGroup); // 全てのアーマチュアのデータをバインド
                computePassEncoder.setPipeline(propagateBonePipeline);
                computePassEncoder.dispatchWorkgroups(Math.ceil(nowDepthData.bonesNum / 64), 1, 1); // ワークグループ数をディスパッチ
                computePassEncoder.setPipeline(physicsBonePipeline);
                computePassEncoder.dispatchWorkgroups(Math.ceil(nowDepthData.bonesNum / 64), 1, 1); // ワークグループ数をディスパッチ
            }

            const childrenRoop = (children) => {
                for (const child of children) {
                    if (child instanceof BezierModifier) {
                        // ベジェモディファイア親の変形を適応
                        computePassEncoder.setBindGroup(0, child.individualGroup);
                        computePassEncoder.dispatchWorkgroups(Math.ceil(child.verticesNum / 64), 1, 1); // ワークグループ数をディスパッチ
                    }
                    if (!(child instanceof GraphicMesh)) {
                        const children = child.children;
                        if (children && children.length) { // 子要素がある場合ループする
                            childrenRoop(children);
                        }
                    }
                }
            }
            computePassEncoder.setBindGroup(1, this.runtimeData.bezierModifierData.parentApplyGroup);
            computePassEncoder.setBindGroup(2, this.runtimeData.armatureData.applyParentGroup);
            computePassEncoder.setPipeline(treeAnimationApplyPipeline);
            childrenRoop(this.objects.rootObjects);

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
        } else if (this.objects.graphicMeshs.length && this.objects.armatures.length) {
            if (this.objects.graphicMeshs.length) {
                computePassEncoder.setPipeline(meshShapeKeyApplyPipeline);
                computePassEncoder.setBindGroup(0, this.runtimeData.graphicMeshData.shapeKeyApplyGroup); // 全てのグラフィックスメッシュのデータをバインド
                computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
            }
        } else if (this.objects.graphicMeshs.length && this.objects.bezierModifiers.length) {
            if (this.objects.graphicMeshs.length) {
                computePassEncoder.setPipeline(meshShapeKeyApplyPipeline);
                computePassEncoder.setBindGroup(0, this.runtimeData.graphicMeshData.shapeKeyApplyGroup); // 全てのグラフィックスメッシュのデータをバインド
                computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
            }
        } else if (this.objects.graphicMeshs.length) {
            if (this.objects.graphicMeshs.length) {
                computePassEncoder.setPipeline(meshShapeKeyApplyPipeline);
                computePassEncoder.setBindGroup(0, this.runtimeData.graphicMeshData.shapeKeyApplyGroup); // 全てのグラフィックスメッシュのデータをバインド
                computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
            }
        }

        computePassEncoder.end();

        device.queue.submit([computeCommandEncoder.finish()]);
        // GPU.consoleBufferData(this.runtimeData.armatureData.renderingBoneMatrix.buffer, this.runtimeData.armatureData.renderingBoneMatrix.struct);
        // GPU.consoleBufferData(this.runtimeData.armatureData.baseBoneMatrix.buffer, this.runtimeData.armatureData.baseBoneMatrix.struct);
    }

    async getSaveData() {
        const conversion = {
            "マスクテクスチャ": "maskTextures",
            "テクスチャ": "textures",
            "スクリプト": "scripts",
            "パーティクル": "particles",
            "グラフィックメッシュ": "graphicMeshs",
            "ベジェモディファイア": "bezierModifiers",
            "アーマチュア": "armatures",
            "キーフレームブロック": "keyframeBlocks",
            "パラメーターマネージャー": "parameterManagers",
            "ブレンドシェイプ": "blendShapes"
        };
        const object = {maskTextures: [], textures: [], scripts: [], particles: [], graphicMeshs: [], bezierModifiers: [], armatures: [], rotateMOdifiers: [], keyframeBlocks: [], parameterManagers: [], blendShapes: []};
        // 各オブジェクトの保存処理を並列化
        const promises = this.objects.allObject.map(async (object) => {
            return { type: object.type, data: await object.getSaveData() };
        });
        const resolved = await Promise.all(promises);
        // 結果を type ごとにまとめる
        for (const { type, data } of resolved) {
            if (type in conversion) {
                object[conversion[type]].push(data);
            }
        }
        return {"scene": {
                    "objects": object,
                    "frame_speed": this.frame_speed,
                    "frame_start": this.frame_start,
                    "frame_end": this.frame_end,
                    "frame_current": this.frame_current,
                }};
    }

    // フレームを適応
    updateAnimation(frame) {
        for (const keyframeBlock of this.objects.keyframeBlocks) {
            keyframeBlock.update(frame);
        }
        for (const armatures of this.objects.armatures) {
            armatures.keyframeBlockManager.update();
        }
        for (const blendShape of this.objects.blendShapes) {
            blendShape.keyframeBlockManager.update();
        }
        for (const editObject of this.editData.allEditObjects) {
            if (editObject instanceof BArmatureAnimation) {
                editObject.bones.forEach(bone => {
                    bone.keyframeBlockManager.update();
                })
            }
        }
        for (const editObject of this.editData.allEditObjects) {
            editObject.updateGPUData();
        }
    }

    destroy() {
        this.objects.destroy();
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
        managerForDOMs.update({o: "表示順番"});
    }
}

class World {
    constructor() {
        this.color = [0,0,0,1];
    }
}