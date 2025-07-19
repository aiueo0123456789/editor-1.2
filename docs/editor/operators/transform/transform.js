import { app } from "../../app/app.js";
import { Armature } from "../../core/objects/armature.js";
import { BezierModifier } from "../../core/objects/bezierModifier.js";
import { GraphicMesh } from "../../core/objects/graphicMesh.js";
import { mathMat3x3 } from "../../utils/mathMat.js";
import { loadFile } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";

const createInitDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Cu_Cu_Cu")], await loadFile("./editor/shader/compute/command/transform/init.wgsl"));

const updateForUVPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu")], await loadFile("./editor/shader/compute/command/transform/updateForUV.wgsl"));

const createOriginalPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr")], await loadFile("./editor/shader/compute/command/transform/createOriginal.wgsl"));
const setOriginalPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr")], await loadFile("./editor/shader/compute/command/transform/setOriginal.wgsl"));

const verticesTranslatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu")], await loadFile("./editor/shader/compute/command/transform/vertices/translate.wgsl"));
const verticesResizePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu")], await loadFile("./editor/shader/compute/command/transform/vertices/resize.wgsl"));
const verticesRotatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu")], await loadFile("./editor/shader/compute/command/transform/vertices/rotate.wgsl"));

class TransformCommand {
    constructor(type, targets, options) {
        console.log(type, targets, options)
        this.worldOriginalBuffer = null;
        this.valueBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32"]);
        this.centerPointBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32","f32"]);
        this.proportionalEditTypeBuffer = GPU.createUniformBuffer(4, undefined, ["u32"]);
        this.proportionalSizeBuffer = GPU.createUniformBuffer(4, undefined, ["f32"]);
        this.configGroup = GPU.createGroup(GPU.getGroupLayout("Cu_Cu_Cu"), [{item: this.proportionalEditTypeBuffer, type: "b"}, {item: this.proportionalSizeBuffer, type: "b"}, {item: this.centerPointBuffer, type: "b"}]);

        this.writeGroup = null;
        this.undoWriteGroup = null;

        this.value = [0,0];
        this.proportionalEditType = 0;
        this.proportionalSize = 0;

        this.targets = [...targets];
        this.type = type;
        if (this.type == "ボーンアニメーション編集") {
            this.parentWorldMatrix = [];
            this.root = [];
            for (const bone of targets) {
                if (!bone.containsParentBone(targets)) {
                    this.root.push(bone);
                }
            }
            for (const bone of this.root) {
                if (bone.parent) {
                    bone.parent.getWorldMatrix();
                }
            }
            this.originalBones = new Map();
            for (const bone of targets) {
                this.originalBones.set(bone, {"x": bone.x, "y": bone.y, "sx": bone.sx, "sy": bone.sy, "r": bone.r});
            }
        } else {
            const subjectIndex = [];
            this.selectIndexs = [];
            this.writeIndexs = [];
            let source = null;
            let vertexLevel = 0;
            if (type == "メッシュ編集" || this.type == "メッシュ頂点アニメーション編集") {
                source = app.scene.runtimeData.graphicMeshData;
                vertexLevel = GraphicMesh.VERTEX_LEVEL;
            } else if (type == "ボーン編集") {
                source = app.scene.runtimeData.armatureData;
                vertexLevel = Armature.VERTEX_LEVEL;
            } else if (type == "ベジェ編集" || type == "ベジェ頂点アニメーション編集") {
                source = app.scene.runtimeData.bezierModifierData;
                vertexLevel = BezierModifier.VERTEX_LEVEL;
            }
            console.log(source,vertexLevel)
            if (this.type == "メッシュ頂点アニメーション編集") {
                this.targetAnimation = options.targetAnimation;
                this.targetObject = this.targetAnimation.belongObject;
                for (const vertex of targets) {
                    this.selectIndexs.push(vertex.worldIndex);
                }
                for (let i = this.targetObject.runtimeOffsetData.vertexOffset * vertexLevel; i < this.targetObject.verticesNum + this.targetObject.runtimeOffsetData.vertexOffset * vertexLevel; i ++) {
                    subjectIndex.push(i);
                }
                for (const vertex of this.targetObject.allVertices) {
                    this.writeIndexs.push(vertex.localIndex + this.targetAnimation.worldIndex);
                }
                this.writeIndexsBuffer = GPU.createStorageBuffer(this.writeIndexs.length * 4, this.writeIndexs, ["u32"]);
                this.subjectIndexBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, subjectIndex, ["u32"]);
                this.worldOriginalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットの頂点のワールド座標を取得
                this.workNumX = Math.ceil(subjectIndex.length / 64);
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.worldOriginalBuffer, source.renderingVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
                this.writeBuffer = source.animations.buffer;
                this.targetBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4);
                this.differentialBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4, undefined, ["f32"]); // 頂点の基準
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.differentialBuffer, source.baseVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
                // GPU.consoleBufferData(this.differentialBuffer, ["f32","f32"], "base")
                this.weightBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, undefined, ["f32"]);
                this.originalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットのオリジナル状態を保持(undoで使用する値)
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.originalBuffer, source.renderingVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
            } else if (this.type == "ベジェ頂点アニメーション編集") {
                this.targetAnimation = options.targetAnimation;
                this.targetObject = this.targetAnimation.belongObject;
                for (const vertex of targets) {
                    this.selectIndexs.push(vertex.worldIndex);
                }
                for (let i = this.targetObject.runtimeOffsetData.pointOffset * vertexLevel; i < this.targetObject.verticesNum + (this.targetObject.runtimeOffsetData.pointOffset) * vertexLevel; i ++) {
                    subjectIndex.push(i);
                }
                for (const vertex of this.targetObject.allVertices) {
                    this.writeIndexs.push(vertex.getWorldAnimationIndex(this.targetAnimation));
                }
                this.writeIndexsBuffer = GPU.createStorageBuffer(this.writeIndexs.length * 4, this.writeIndexs, ["u32"]);
                this.subjectIndexBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, subjectIndex, ["u32"]);
                this.worldOriginalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットの頂点のワールド座標を取得
                this.workNumX = Math.ceil(subjectIndex.length / 64);
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.worldOriginalBuffer, source.renderingVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
                this.writeBuffer = source.animations.buffer;
                this.targetBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4);
                this.differentialBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4, undefined, ["f32"]); // 頂点の基準
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.differentialBuffer, source.baseVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
                // GPU.consoleBufferData(this.differentialBuffer, ["f32","f32"], "base")
                this.weightBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, undefined, ["f32"]);
                this.originalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットのオリジナル状態を保持(undoで使用する値)
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.originalBuffer, source.renderingVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
            } else if (this.type == "ベジェ編集") {
                this.bezierModifiers = [];
                for (const vertex of targets) {
                    if (!this.bezierModifiers.includes(vertex.point.bezierModifier)) {
                        this.bezierModifiers.push(vertex.point.bezierModifier);
                    }
                    this.selectIndexs.push(vertex.worldIndex);
                }
                for (const bezierModifier of this.bezierModifiers) {
                    for (let i = bezierModifier.runtimeOffsetData.pointOffset * vertexLevel; i < (bezierModifier.pointNum + bezierModifier.runtimeOffsetData.pointOffset) * vertexLevel; i ++) {
                        subjectIndex.push(i);
                        this.writeIndexs.push(i);
                    }
                }
                console.log(subjectIndex,this.selectIndexs,this.writeIndexs);
                this.writeIndexsBuffer = GPU.createStorageBuffer(this.writeIndexs.length * 4, this.writeIndexs, ["u32"]);
                this.subjectIndexBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, subjectIndex, ["u32"]);
                this.worldOriginalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットの頂点のワールド座標を取得
                this.workNumX = Math.ceil(subjectIndex.length / 64);
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.worldOriginalBuffer, source.baseVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
                // GPU.consoleBufferData(this.worldOriginalBuffer, ["f32","f32"])
                this.writeBuffer = source.baseVertices.buffer;
                // GPU.consoleBufferData(this.writeBuffer, ["f32","f32"])
                this.targetBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4);
                this.differentialBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4, undefined, ["f32"]); // 頂点の基準
                this.weightBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, undefined, ["f32"]);
                this.originalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットのオリジナル状態を保持(undoで使用する値)
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.originalBuffer, source.baseVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
            } else if (this.type == "メッシュ編集") {
                this.graphicMeshs = [];
                for (const vertex of targets) {
                    if (!this.graphicMeshs.includes(vertex.graphicMesh)) {
                        this.graphicMeshs.push(vertex.graphicMesh);
                    }
                    this.selectIndexs.push(vertex.worldIndex);
                }
                for (const graphicMesh of this.graphicMeshs) {
                    for (let i = graphicMesh.runtimeOffsetData.vertexOffset * vertexLevel; i < graphicMesh.verticesNum + (graphicMesh.runtimeOffsetData.vertexOffset) * vertexLevel; i ++) {
                        subjectIndex.push(i);
                        this.writeIndexs.push(i);
                    }
                }
                this.writeIndexsBuffer = GPU.createStorageBuffer(this.writeIndexs.length * 4, this.writeIndexs, ["u32"]);
                this.subjectIndexBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, subjectIndex, ["u32"]);
                this.worldOriginalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットの頂点のワールド座標を取得
                this.workNumX = Math.ceil(subjectIndex.length / 64);
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.worldOriginalBuffer, source.baseVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
                this.writeBuffer = source.baseVertices.buffer;
                this.targetBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4);
                this.differentialBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4, undefined, ["f32"]); // 頂点の基準
                this.weightBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, undefined, ["f32"]);
                this.originalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットのオリジナル状態を保持(undoで使用する値)
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.originalBuffer, source.baseVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
            } else if (this.type == "ボーン編集") {
                this.armatures = [];
                for (const vertex of targets) {
                    if (!this.armatures.includes(vertex.bone.armature)) {
                        this.armatures.push(vertex.bone.armature);
                    }
                    this.selectIndexs.push(vertex.worldIndex);
                }
                for (const armature of this.armatures) {
                    for (let i = armature.runtimeOffsetData.boneOffset * vertexLevel; i < (armature.boneNum + armature.runtimeOffsetData.boneOffset) * vertexLevel; i ++) {
                        subjectIndex.push(i);
                        this.writeIndexs.push(i);
                    }
                }
                this.writeIndexsBuffer = GPU.createStorageBuffer(this.writeIndexs.length * 4, this.writeIndexs, ["u32"]);
                this.subjectIndexBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, subjectIndex, ["u32"]);
                this.worldOriginalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットの頂点のワールド座標を取得
                this.workNumX = Math.ceil(subjectIndex.length / 64);
                console.log(this.worldOriginalBuffer, source.baseVertices.buffer, this.subjectIndexBuffer)
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.worldOriginalBuffer, source.baseVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
                this.writeBuffer = source.baseVertices.buffer;
                this.targetBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4);
                this.differentialBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4, undefined, ["f32"]); // 頂点の基準
                this.weightBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, undefined, ["f32"]);
                this.originalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットのオリジナル状態を保持(undoで使用する値)
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.originalBuffer, source.baseVertices.buffer, this.subjectIndexBuffer])], this.workNumX);
            }
            const selectIndexBuffer = GPU.createStorageBuffer(this.selectIndexs.length * 4, this.selectIndexs, ["u32"]);
            this.undoWriteGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.writeBuffer, this.originalBuffer, this.writeIndexsBuffer]);
            this.writeGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.writeBuffer, this.targetBuffer, this.writeIndexsBuffer]);
            this.weightAndIndexsGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"),  [this.weightBuffer, selectIndexBuffer, this.worldOriginalBuffer, this.subjectIndexBuffer]);
            this.transformGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu"),  [this.targetBuffer, this.worldOriginalBuffer, this.differentialBuffer, this.weightBuffer, this.centerPointBuffer, this.valueBuffer]);
        }
    }

    setCenterPoint(centerPoint) {
        GPU.writeBuffer(this.centerPointBuffer, new Float32Array(centerPoint));
    }

    async transform(pipeline) {
        GPU.writeBuffer(this.valueBuffer, new Float32Array(this.value));
        if (this.type == "ボーンアニメーション編集") {
            if (pipeline == "Translate") {
                this.root.forEach(bone => {
                    if (bone.parent) {
                        const localValue = mathMat3x3.getLocalVec2(bone.parent.matrix, this.value);
                        bone.x = this.originalBones.get(bone).x + localValue[0];
                        bone.y = this.originalBones.get(bone).y + localValue[1];
                    } else {
                        bone.x = this.value[0] + this.originalBones.get(bone).x;
                        bone.y = this.value[1] + this.originalBones.get(bone).y;
                    }
                });
            } else if (pipeline == "Rotate") {
                this.root.forEach(bone => {
                    bone.r = this.value[0] + this.originalBones.get(bone).r;
                });
            }
        } else {
            if (!this.workNumX) {
                return ;
            }
            GPU.writeBuffer(this.proportionalEditTypeBuffer, new Uint32Array([this.proportionalEditType]));
            GPU.writeBuffer(this.proportionalSizeBuffer, new Float32Array([this.proportionalSize]));
            GPU.runComputeShader(createInitDataPipeline,[this.weightAndIndexsGroup, this.configGroup], this.workNumX);
            // GPU.consoleBufferData(this.weightBuffer, ["f32"], "weight")

            GPU.runComputeShader(pipeline, [this.transformGroup], this.workNumX);
            // GPU.consoleBufferData(this.targetBuffer, ["f32","f32"], "vertices")
            GPU.runComputeShader(setOriginalPipeline, [this.writeGroup], this.workNumX);
            // GPU.consoleBufferData(this.writeBuffer, ["f32","f32"], "write", this.writeIndexs);
            if (this.type == "ボーン編集") {
                // await Promise.all(
                //     this.targets.map(target => {
                //         app.scene.runtimeData.armatureData.calculateBaseBoneData(target);
                //         return app.scene.runtimeData.armatureData.updateCPUDataFromGPUBuffer(target);
                //     })
                // );
                for (const armature of this.armatures) {
                    app.scene.runtimeData.armatureData.calculateBaseBoneData(armature);
                    app.scene.runtimeData.armatureData.updateCPUDataFromGPUBuffer(armature);
                }
            } else if (this.type == "メッシュ編集") {
                for (const graphicMesh of this.graphicMeshs) {
                    GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.runtimeData.graphicMeshData.uv.buffer, app.scene.runtimeData.graphicMeshData.baseVertices.buffer, graphicMesh.editor.imageBBoxBuffer, graphicMesh.objectDataBuffer])],this.workNumX);
                    app.scene.runtimeData.graphicMeshData.updateCPUDataFromGPUBuffer(graphicMesh, {vertex: {base: true, uv: true}});
                    graphicMesh.editor.createMesh();
                }
            } else if (this.type == "ベジェ編集") {
                for (const bezierModifier of this.bezierModifiers) {
                    app.scene.runtimeData.bezierModifierData.updateCPUDataFromGPUBuffer(bezierModifier, {vertex: {base: true}});
                }
            }
        }
    }

    // 変形を取り消し
    cancel() {
        GPU.runComputeShader(setOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.targetBuffer, this.originalBuffer, this.subjectIndexBuffer])], this.workNumX);
        if (this.type == "ボーン編集") {
            for (const armature of this.armatures) {
                app.scene.runtimeData.armatureData.calculateBaseBoneData(armature);
                app.scene.runtimeData.armatureData.updateCPUDataFromGPUBuffer(armature);
            }
        } else if (this.type == "メッシュ編集") {
            for (const graphicMesh of this.graphicMeshs) {
                GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.runtimeData.graphicMeshData.uv.buffer, app.scene.runtimeData.graphicMeshData.baseVertices.buffer, graphicMesh.editor.imageBBoxBuffer, graphicMesh.objectDataBuffer])],this.workNumX);
                graphicMesh.editor.createMesh(true);
            }
        }
    }

    undo() {
        if (this.type == "ボーンアニメーション編集") {
            for (const bone of this.targets) {
                const data = this.originalBones.get(bone);
                bone.x = data.x;
                bone.y = data.y;
                bone.sx = data.sx;
                bone.sy = data.sy;
                bone.r = data.r;
            }
        } else {
            GPU.runComputeShader(setOriginalPipeline, [this.undoWriteGroup], this.workNumX);
            if (this.type == "ボーン編集") {
                for (const armature of this.armatures) {
                    app.scene.runtimeData.armatureData.calculateBaseBoneData(armature);
                    app.scene.runtimeData.armatureData.updateCPUDataFromGPUBuffer(armature);
                }
            } else if (this.type == "メッシュ編集") {
                for (const graphicMesh of this.graphicMeshs) {
                    GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.runtimeData.graphicMeshData.uv.buffer, app.scene.runtimeData.graphicMeshData.baseVertices.buffer, graphicMesh.editor.imageBBoxBuffer, graphicMesh.objectDataBuffer])],this.workNumX);
                    app.scene.runtimeData.graphicMeshData.updateCPUDataFromGPUBuffer(graphicMesh, {vertex: {base: true, uv: true}});
                    graphicMesh.editor.createMesh(true);
                }
            } else if (this.type == "ベジェ編集") {
                for (const bezierModifier of this.bezierModifiers) {
                    app.scene.runtimeData.bezierModifierData.updateCPUDataFromGPUBuffer(bezierModifier, {vertex: {base: true}});
                }
            }
        }
    }
}

export class TranslateCommand extends TransformCommand {
    constructor(type, targets, options) {
        super(type, targets, options);
    }

    update(value, orientType, proportionalEditType, proportionalSize) {
        this.value = [...value];
        this.proportionalEditType = proportionalEditType;
        this.proportionalSize = proportionalSize;
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        if (this.type == "ボーンアニメーション編集") {
            this.transform("Translate");
        } else {
            this.transform(verticesTranslatePipeline);
        }
    }

    execute() {
        if (this.type == "ボーンアニメーション編集") {
            this.transform("Translate");
        } else {
            this.transform(verticesTranslatePipeline);
        }
    }
}

export class ResizeCommand extends TransformCommand {
    constructor(type, targets, options) {
        super(type, targets, options);
    }

    update(value, orientType, proportionalEditType, proportionalSize) {
        this.value = [...value];
        this.proportionalEditType = proportionalEditType;
        this.proportionalSize = proportionalSize;
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        if (this.type == "ボーンアニメーション編集") {
            this.transform();
        } else {
            this.transform(verticesResizePipeline);
        }
    }

    execute() {
        if (this.type == "ボーンアニメーション編集") {
            this.transform();
        } else {
            this.transform(verticesResizePipeline);
        }
    }
}

export class RotateCommand extends TransformCommand {
    constructor(type, targets, options) {
        super(type, targets, options);
    }

    update(value, orientType, proportionalEditType, proportionalSize) {
        this.value[0] = value;
        this.proportionalEditType = proportionalEditType;
        this.proportionalSize = proportionalSize;
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        if (this.type == "ボーンアニメーション編集") {
            this.transform("Rotate");
        } else {
            this.transform(verticesRotatePipeline);
        }
    }

    execute() {
        if (this.type == "ボーンアニメーション編集") {
            this.transform("Rotate");
        } else {
            this.transform(verticesRotatePipeline);
        }
    }
}