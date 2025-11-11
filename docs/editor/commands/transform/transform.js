import { app } from "../../../main.js";
import { BArmature } from "../../core/edit/objects/BArmature.js";
import { BArmatureAnimation } from "../../core/edit/objects/BArmatureAnimation.js";
import { BBezier } from "../../core/edit/objects/BBezier.js";
import { BBezierShapeKey } from "../../core/edit/objects/BBezierShapeKey.js";
import { BMesh } from "../../core/edit/objects/BMesh.js";
import { BMeshShapeKey } from "../../core/edit/objects/BMeshShapeKey.js";
import { Armature } from "../../core/objects/armature.js";
import { MathMat3x3 } from "../../utils/mathMat.js";
import { MathVec2 } from "../../utils/mathVec.js";
import { roundUp } from "../../utils/utility.js";

class TransformCommand {
    constructor(pivotType, useProportionalEdit, proportionalType, proportionalSize) {
        this.error = false;
        this.editObjects = app.scene.editData.allEditObjects;
        this.value = [0,0];
        this.useProportional = useProportionalEdit;
        this.proportionalType = proportionalType;
        this.proportionalSize = proportionalSize;

        if (this.editObjects[0] instanceof BMesh) this.isBMesh = true;
        else if (this.editObjects[0] instanceof BArmature) this.isBArmature = true;
        else if (this.editObjects[0] instanceof BBezier) this.isBBezier = true;
        else if (this.editObjects[0] instanceof BArmatureAnimation) this.isBArmatureAnimation = true;
        else if (this.editObjects[0] instanceof BMeshShapeKey) this.isBMeshAnimation = true;
        else if (this.editObjects[0] instanceof BBezierShapeKey) this.isBBezierShapeKey = true;

        if (this.isBMesh || this.isBArmature || this.isBBezier) {
            this.processType = "vertex";
            this.selectedVertices = this.editObjects.map(editObject => editObject.selectedVertices).flat();
            this.selectedVerticesCoordinates = this.selectedVertices.map(vertex => vertex.co);
            if (pivotType == "boundingboxCenter") {
                this.pivotPoint = MathVec2.averageR(this.selectedVerticesCoordinates);
            } else if (pivotType == "activeElement") {
                this.pivotPoint = MathVec2.averageR(this.selectedVerticesCoordinates);
            }
            this.targetVertices = this.editObjects.map(editObject => editObject.vertices).flat();
            this.originalVerticesCoordinates = this.targetVertices.map(vertex => [...vertex.co]); // 元の状態の記憶
            this.selectedVerticesIndexs = this.selectedVertices.map(vertex => this.targetVertices.indexOf(vertex));
        } else if (this.isBMeshAnimation || this.isBBezierShapeKey) { // 一つまでしか編集できない
            this.processType = "vertex";
            this.activeShapeKey = this.editObjects[0].activeShapeKey;
            this.error = !this.activeShapeKey;
            this.selectedVertices = this.editObjects[0].selectedVertices;
            this.selectedVerticesCoordinates = this.selectedVertices.map(vertex => this.activeShapeKey.data[vertex.index].co);
            if (pivotType == "boundingboxCenter") {
                this.pivotPoint = MathVec2.averageR(this.selectedVerticesCoordinates);
            } else if (pivotType == "activeElement") {
                this.pivotPoint = MathVec2.averageR(this.selectedVerticesCoordinates);
            }
            this.targetVertices = this.editObjects[0].vertices.map(vertex => this.activeShapeKey.data[vertex.index]); // 対象をアクティブシェイプキーの参照に
            this.originalVerticesCoordinates = this.targetVertices.map(vertex => [...vertex.co]); // 元の状態の記憶
            this.selectedVerticesIndexs = this.selectedVertices.map(vertex => vertex.index);
            console.log(this)
        } else if (this.isBArmatureAnimation) {
            this.processType = "bone";
            this.selectedBones = this.editObjects.map(editObject => editObject.selectedBones).flat();
            this.selectedVerticesCoordinates = this.selectedBones.map(bone => bone.headVertex);
            if (pivotType == "boundingboxCenter") {
                this.pivotPoint = MathVec2.averageR(this.selectedVerticesCoordinates);
            } else if (pivotType == "activeElement") {
                this.pivotPoint = MathVec2.averageR(this.selectedVerticesCoordinates);
            }
            const getSurfaceBones = (bones) => {
                const isSurface = (bone) => {
                    // 全ての親要素を辿って見つけたらfalse
                    let isLoop = true;
                    let nowBone = bone;
                    while (isLoop) {
                        if (nowBone.parent) {
                            if (bones.includes(nowBone.parent)) {
                                return false;
                            }
                            nowBone = nowBone.parent;
                        } else {
                            isLoop = false;
                        }
                    }
                    return true;
                }
                return bones.filter(bone => isSurface(bone));
            }
            this.targetBones = getSurfaceBones(this.selectedBones);
            this.originalBones = this.selectedBones.map(bone => Armature.copyBoneData(bone.animationLocalBoneData)); // 元の状態の記憶
        }
        !this.error && (this.error = !(this.selectedBones?.length || this.selectedVertices?.length));
    }

    transform(value, useProportional, proportionalType, proportionalSize) {
        this.value = value;
        this.useProportional = useProportional;
        this.proportionalType = proportionalType;
        this.proportionalSize = proportionalSize;
        // 重みの再計算
        if (this.useProportional) {
            if (this.processType == "vertex") {
                this.weights = this.targetVertices.map((vertex, index) => {
                    if (this.selectedVerticesIndexs.includes(index)) {
                        return 1;
                    } else {
                        const dist = MathVec2.distanceR(this.originalVerticesCoordinates[index], this.pivotPoint);
                        const weight = roundUp(1 - (dist / this.proportionalSize), 0);
                        return weight;
                    }
                });
            }
        } else {
            if (this.processType == "vertex") {
                this.weights = this.targetVertices.map((vertex, index) => {
                    if (this.selectedVerticesIndexs.includes(index)) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
            }
        }
        if (this instanceof TranslateCommand) {
            if (this.processType == "vertex") {
                this.targetVertices.forEach((vertex, index) => MathVec2.add(vertex.co, this.originalVerticesCoordinates[index], MathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            } else if (this.processType == "bone") {
                this.targetBones.forEach((bone, index) => {
                    let localValue = this.value;
                    if (bone.parent) localValue = MathMat3x3.getLocalVec2(bone.parent.poseWorldMatrix, this.value);
                    Armature.addBoneData(bone.animationLocalBoneData, this.originalBones[index], {x: localValue[0], y: localValue[1]});
                });
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            }
        } else if (this instanceof ResizeCommand) {
        } else if (this instanceof RotateCommand) {
            if (this.processType == "vertex") {
                this.targetVertices.forEach((vertex, index) => MathVec2.add(vertex.co, this.originalVerticesCoordinates[index], MathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            } else if (this.processType == "bone") {
                this.targetBones.forEach((bone, index) => {
                    // mathVec2.add(bone, this.originalVertices[index], mathVec2.scaleR(this.value, this.weights[index]))
                    // const localValue = mathMat3x3.getLocalVec2(bone.parent.poseWorldMatrix, this.value);
                    Armature.addBoneData(bone.animationLocalBoneData, this.originalBones[index], {r: this.value[0]});
                });
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            }
        }
    }

    execute() {
        if (this instanceof TranslateCommand) {
            if (this.processType == "vertex") {
                this.targetVertices.forEach((vertex, index) => MathVec2.add(vertex.co, this.originalVerticesCoordinates[index], MathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            } else if (this.processType == "bone") {
                this.targetBones.forEach((bone, index) => {
                    let localValue = this.value;
                    if (bone.parent) localValue = MathMat3x3.getLocalVec2(bone.parent.poseWorldMatrix, this.value);
                    Armature.addBoneData(bone.animationLocalBoneData, this.originalBones[index], {x: localValue[0], y: localValue[1]});
                });
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            }
        } else if (this instanceof ResizeCommand) {
        } else if (this instanceof RotateCommand) {
            if (this.processType == "vertex") {
                this.targetVertices.forEach((vertex, index) => MathVec2.add(vertex.co, this.originalVerticesCoordinates[index], MathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            } else if (this.processType == "bone") {
                this.targetBones.forEach((bone, index) => {
                    Armature.addBoneData(bone.animationLocalBoneData, this.originalBones[index], {r: this.value[0]});
                });
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            }
        }
        return {consumed: true};
    }

    undo() {
        if (this.processType == "vertex") {
            this.targetVertices.forEach((vertex, index) => MathVec2.set(vertex.co, this.originalVerticesCoordinates[index]));
            this.editObjects.forEach(editObject => editObject.updateGPUData());
        } else if (this.processType == "bone") {
            this.targetBones.forEach((bone, index) => {
                Armature.addBoneData(bone.animationLocalBoneData, this.originalBones[index], {});
            });
            this.editObjects.forEach(editObject => editObject.updateGPUData());
        }
    }
}

export class TranslateCommand extends TransformCommand {
    constructor(pivotType = "boundingboxCenter", proportional, proportionalSize = 200) {
        super(pivotType, proportional, proportionalSize);
    }
}

export class ResizeCommand extends TransformCommand {
    constructor(pivotType = "boundingboxCenter", proportional, proportionalSize = 200) {
        super(pivotType, proportional, proportionalSize);
    }
}

export class RotateCommand extends TransformCommand {
    constructor(pivotType = "boundingboxCenter", proportional, proportionalSize = 200) {
        super(pivotType, proportional, proportionalSize);
    }
}