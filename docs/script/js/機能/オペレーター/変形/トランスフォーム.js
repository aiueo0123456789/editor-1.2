import { app } from "../../../app.js";
import { mathMat3x3 } from "../../../MathMat.js";
import { loadFile } from "../../../utility.js";
import { GPU } from "../../../webGPU.js";
import { Bone } from "../../../オブジェクト/ボーンモディファイア.js";

// const pipelines = {
//     graphicMesh: {rotate: },
// };

const createInitDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Cu_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/init.wgsl"));

const updateForUVPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/updateForUV.wgsl"));

const createOriginalPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr")], await loadFile("./script/js/機能/オペレーター/変形/GPU/createOriginal.wgsl"));
const setOriginalPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr")], await loadFile("./script/js/機能/オペレーター/変形/GPU/setOriginal.wgsl"));

const verticesTranslatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/vertices/translate.wgsl"));
const verticesResizePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/vertices/resize.wgsl"));
const verticesRotatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/vertices/rotate.wgsl"));

class TransformCommand {
    constructor(type, targets, selectIndexs) {
        this.targets = [];
        this.worldOriginalBuffer = null;
        this.valueBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32"]);
        this.centerPointBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32","f32"]);
        this.proportionalEditTypeBuffer = GPU.createUniformBuffer(4, undefined, ["u32"]);
        this.proportionalSizeBuffer = GPU.createUniformBuffer(4, undefined, ["f32"]);
        this.configGroup = GPU.createGroup(GPU.getGroupLayout("Cu_Cu_Cu"), [{item: this.proportionalEditTypeBuffer, type: "b"}, {item: this.proportionalSizeBuffer, type: "b"}, {item: this.centerPointBuffer, type: "b"}]);

        this.value = [0,0];
        this.proportionalEditType = 0;
        this.proportionalSize = 0;

        this.targets = targets;
        this.type = type;
        const source = this.type == "メッシュ編集" ? app.scene.runtimeData.graphicMeshData : this.type == "ボーン編集" ? app.scene.runtimeData.boneModifierData : app.scene.runtimeData.bezierModifierData;
        const groupNum = this.type == "メッシュ編集" ? 1 : this.type == "ボーン編集" ? 2 : 3;
        if (this.type == "ボーンアニメーション編集") {
            this.parentWorldMatrix = [];
            this.root = [];
            for (const bone of targets) {
                if (!bone.containsParentBone(targets)) {
                    this.root.push(bone);
                }
            }
            for (const bone of this.root) {
                bone.parent.getWorldMatrix();
            }
            this.originalBones = new Map();
            for (const bone of targets) {
                this.originalBones.set(bone, {"x": bone.x, "y": bone.y, "sx": bone.sx, "sy": bone.sy, "r": bone.r});
            }
        } else {
            const selectIndexBuffer = GPU.createStorageBuffer(selectIndexs.length * 4, selectIndexs, ["u32"]);
            if (this.type == "頂点アニメーション") {
                this.worldOriginalBuffer = targets.getWorldVerticesPositionBuffer(); // ターゲットの頂点のワールド座標を取得
                this.targetBuffer = targets.s_verticesAnimationBuffer;
                this.baseBuffer = targets.belongObject.s_baseVerticesPositionBuffer; // 頂点の基準
                this.workNumX = Math.ceil(this.targets.belongObject.verticesNum / 64);
                this.weightBuffer = GPU.createStorageBuffer(this.targets.belongObject.verticesNum * 4, undefined, ["f32"]);
            } else {
                const subjectIndex = [];
                for (const target of targets) {
                    for (let i = target.vertexBufferOffset * groupNum; i < target.verticesNum + (target.vertexBufferOffset) * groupNum; i ++) {
                        subjectIndex.push(i);
                    }
                }
                this.subjectIndexBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, subjectIndex, ["u32"]);
                this.worldOriginalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットの頂点のワールド座標を取得
                this.workNumX = Math.ceil(subjectIndex.length / 64);
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.worldOriginalBuffer, source.baseVertices, this.subjectIndexBuffer])], this.workNumX);
                this.targetBuffer = source.baseVertices;
                this.baseBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4, undefined, ["f32"]); // 頂点の基準
                this.weightBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, undefined, ["f32"]);
                this.originalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットのオリジナル状態を保持(undoで使用する値)
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.originalBuffer, source.baseVertices, this.subjectIndexBuffer])], this.workNumX);
            }
            this.weightAndIndexsGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"),  [{item: this.weightBuffer, type: "b"}, {item: selectIndexBuffer, type: "b"}, {item: this.worldOriginalBuffer, type: "b"}, {item: this.subjectIndexBuffer, type: "b"}]);
            this.transformGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu_Cu"),  [{item: this.targetBuffer, type: "b"}, {item: this.worldOriginalBuffer, type: "b"}, {item: this.baseBuffer, type: "b"}, {item: this.weightBuffer, type: "b"}, {item: this.subjectIndexBuffer, type: "b"}, {item: this.centerPointBuffer, type: "b"}, {item: this.valueBuffer, type: "b"}]);
        }
    }

    setCenterPoint(centerPoint) {
        GPU.writeBuffer(this.centerPointBuffer, new Float32Array(centerPoint));
    }

    transform(pipeline) {
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

            GPU.runComputeShader(pipeline, [this.transformGroup], this.workNumX);
            if (this.type == "ボーン編集") {
                for (const target of this.targets) {
                    app.scene.runtimeData.boneModifierData.calculateBaseBoneData(target);
                }
            } else if (this.type == "メッシュ編集") {
                for (const target of this.targets) {
                    GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.runtimeData.graphicMeshData.uv,app.scene.runtimeData.graphicMeshData.baseVertices,target.editor.imageBBoxBuffer, target.objectDataBuffer])],this.workNumX);
                    target.editor.createMesh();
                }
            }
            if (this.type == "頂点アニメーション") {
                this.targets.belongObject.isChange = true;
            } else {
                // this.targets.children?.weightReset();
                // setBaseBBox(this.targets);
                // setParentModifierWeight(this.targets);
                this.targets.isChange = true;
            }
        }
    }

    // 変形を取り消し
    cancel() {
        GPU.runComputeShader(setOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.targetBuffer, this.originalBuffer, this.subjectIndexBuffer])], this.workNumX);
        this.targets.isChange = true;
        if (this.type == "ボーン編集") {
            for (const target of this.targets) {
                app.scene.runtimeData.boneModifierData.calculateBaseBoneData(target);
            }
        } else if (this.type == "メッシュ編集") {
            for (const target of this.targets) {
                GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.runtimeData.graphicMeshData.uv,app.scene.runtimeData.graphicMeshData.baseVertices,target.editor.imageBBoxBuffer, target.objectDataBuffer])],this.workNumX);
                target.editor.createMesh(true);
            }
        }
    }

    undo() {
        console.log("巻き戻し")
        GPU.runComputeShader(setOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.targetBuffer, this.originalBuffer, this.subjectIndexBuffer])], this.workNumX);
        this.targets.isChange = true;
        if (this.type == "ボーン編集") {
            for (const target of this.targets) {
                app.scene.runtimeData.boneModifierData.calculateBaseBoneData(target);
            }
        } else if (this.type == "メッシュ編集") {
            for (const target of this.targets) {
                GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.runtimeData.graphicMeshData.uv,app.scene.runtimeData.graphicMeshData.baseVertices,target.editor.imageBBoxBuffer, target.objectDataBuffer])],this.workNumX);
                target.editor.createMesh(true);
            }
        }
    }

    redo() {
        console.log("巻き戻しの取り消し",data)
        const object = data.object;
        GPU.copyBuffer(data.undo, data.target);
        object.isChange = true;
        if (object.type == "ボーン編集") {
            for (const target of this.targets) {
                app.scene.runtimeData.boneModifierData.calculateBaseBoneData(target);
            }
        } else if (object.type == "メッシュ編集") {
            for (const target of this.targets) {
                GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.runtimeData.graphicMeshData.uv,app.scene.runtimeData.graphicMeshData.baseVertices,target.editor.imageBBoxBuffer, target.objectDataBuffer])],this.workNumX);
                target.editor.createMesh(true);
            }
        }
    }
}

export class TranslateCommand extends TransformCommand {
    constructor(type, targets, selectIndexs) {
        super(type, targets, selectIndexs);
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
    constructor(type, targets, selectIndexs) {
        super(type, targets, selectIndexs);
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
    constructor(type, targets, selectIndexs) {
        super(type, targets, selectIndexs);
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