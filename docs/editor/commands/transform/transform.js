import { app } from "../../../main.js";
import { BArmature } from "../../core/edit/BArmature.js";
import { BArmatureAnimation } from "../../core/edit/BArmatureAnimation.js";
import { BBezier } from "../../core/edit/BBezier.js";
import { BMesh } from "../../core/edit/BMesh.js";
import { Armature } from "../../core/objects/armature.js";
import { mathMat3x3 } from "../../utils/mathMat.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { roundUp } from "../../utils/utility.js";

class TransformCommand {
    constructor(pivotType, useProportionalEdit, proportionalType, proportionalSize) {
        this.editObjects = app.scene.editData.allEditObjects;
        this.value = [0,0];
        this.useProportional = useProportionalEdit;
        this.proportionalType = proportionalType;
        this.proportionalSize = proportionalSize;
        if (this.editObjects[0] instanceof BMesh) {
            this.isBMesh = true;
        } else if (this.editObjects[0] instanceof BArmature) {
            this.isBArmature = true;
        } else if (this.editObjects[0] instanceof BBezier) {
            this.isBBezier = true;
        } else if (this.editObjects[0] instanceof BArmatureAnimation) {
            this.isBArmatureAnimation = true;
        }
        if (this.isBMesh || this.isBArmature || this.isBBezier) {
            this.selectedVertices = this.editObjects.map(editObject => editObject.selectedVerticesCoordinates).flat();
            if (pivotType == "boundingboxCenter") {
                this.pivotPoint = mathVec2.averageR(this.selectedVertices);
            } else if (pivotType == "activeElement") {
                this.pivotPoint = mathVec2.averageR(this.selectedVertices);
            }
            this.targetVertices = this.editObjects.map(editObject => editObject.verticesCoordinates).flat();
            this.originalVertices = this.targetVertices.map(vertex => [...vertex]); // 元の状態の記憶
        } else if (this.isBArmatureAnimation) {
            this.selectedBones = this.editObjects.map(editObject => editObject.selectedBones).flat();
            this.selectedVertices = this.selectedBones.map(bone => bone.headVertex);
            if (pivotType == "boundingboxCenter") {
                this.pivotPoint = mathVec2.averageR(this.selectedVertices);
            } else if (pivotType == "activeElement") {
                this.pivotPoint = mathVec2.averageR(this.selectedVertices);
            }
            const getSurfaceBones = (bones) => {
                const isSurface = (bone) => {
                    // 全ての子要素を平坦化してincludes
                    // const getChildren = (bone) => {
                    //     if (!bone.children) return [];
                    //     const result = [...bone.children]; // ボーンの子要素
                    //     for (const childBone of bone.children) {
                    //         result.push(...getChildren(childBone)); // 子要素の子要素
                    //     }
                    //     return result;
                    // }
                    // for (const checkBone of bones) {
                    //     if (getChildren(checkBone).includes(bone)) {
                    //         return false;
                    //     }
                    // }
                    // return true;

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
    }

    transform(value, useProportional, proportionalType, proportionalSize) {
        this.value = value;
        this.useProportional = useProportional;
        this.proportionalType = proportionalType;
        this.proportionalSize = proportionalSize;
        // 重みの再計算
        if (this.useProportional) {
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.weights = this.targetVertices.map((vertex, index) => {
                    if (this.selectedVertices.includes(vertex)) {
                        return 1;
                    } else {
                        const dist = mathVec2.distanceR(this.originalVertices[index], this.pivotPoint);
                        const weight = roundUp(1 - (dist / this.proportionalSize), 0);
                        return weight;
                    }
                });
            }
        } else {
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.weights = this.targetVertices.map((vertex, index) => {
                    if (this.selectedVertices.includes(vertex)) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
            }
        }
        if (this instanceof TranslateCommand) {
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.targetVertices.forEach((vertex, index) => mathVec2.add(vertex, this.originalVertices[index], mathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            } else if (this.isBArmatureAnimation) {
                this.targetBones.forEach((bone, index) => {
                    // mathVec2.add(bone, this.originalVertices[index], mathVec2.scaleR(this.value, this.weights[index]))
                    const localValue = mathMat3x3.getLocalVec2(bone.parent.poseWorldMatrix, this.value);
                    Armature.addBoneData(bone.animationLocalBoneData, this.originalBones[index], {x: localValue[0], y: localValue[1]});
                });
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            }
        } else if (this instanceof ResizeCommand) {
        } else if (this instanceof RotateCommand) {
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.targetVertices.forEach((vertex, index) => mathVec2.add(vertex, this.originalVertices[index], mathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            } else if (this.isBArmatureAnimation) {
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
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.targetVertices.forEach((vertex, index) => mathVec2.add(vertex, this.originalVertices[index], mathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            } else if (this.isBArmatureAnimation) {
                this.targetBones.forEach((bone, index) => {
                    // mathVec2.add(bone, this.originalVertices[index], mathVec2.scaleR(this.value, this.weights[index]))
                    const localValue = mathMat3x3.getLocalVec2(bone.parent.poseWorldMatrix, this.value);
                    Armature.addBoneData(bone.animationLocalBoneData, this.originalBones[index], {x: localValue[0], y: localValue[1]});
                });
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            }
        } else if (this instanceof ResizeCommand) {
        } else if (this instanceof RotateCommand) {
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.targetVertices.forEach((vertex, index) => mathVec2.add(vertex, this.originalVertices[index], mathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            } else if (this.isBArmatureAnimation) {
                this.targetBones.forEach((bone, index) => {
                    Armature.addBoneData(bone.animationLocalBoneData, this.originalBones[index], {r: this.value[0]});
                });
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            }
        }
    }

    undo() {
        if (this.isBMesh || this.isBArmature || this.isBBezier) {
            this.targetVertices.forEach((vertex, index) => mathVec2.set(vertex, this.originalVertices[index]));
            this.editObjects.forEach(editObject => editObject.updateGPUData());
        } else if (this.isBArmatureAnimation) {
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