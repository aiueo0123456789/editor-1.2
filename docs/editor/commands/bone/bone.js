import { app } from "../../../main.js";
import { BArmature } from "../../core/edit/objects/BArmature.js";
import { MathVec2 } from "../../utils/mathVec.js";
import { indexOfSplice, removeDuplicates } from "../../utils/utility.js";

class Base {
    constructor(targets) {
        this.targets = [...targets];
        this.armatures = removeDuplicates(targets.map(bone => bone.armature));
    }
}

export class BoneExtrudeMoveCommand {
    constructor() {
        this.editObjects = app.scene.editData.allEditObjects;
        this.value = [0,0];
        if (this.editObjects[0] instanceof BArmature) {
            this.isBArmature = true;
            this.createBonesIneditObject = {};
            for (const /** @type {BArmature} */ editObject of this.editObjects) {
                const bones = [];
                this.createBonesIneditObject[editObject.id] = bones;
                editObject.selectedVertices.forEach(vertex => {
                    const bone = BArmature.createBone(vertex.co, vertex.co, editObject.getBoneByVertex(vertex));
                    editObject.bones.push(bone);
                    bones.push({bone: bone, baseCo: vertex.co});
                });
            }
        }
    }

    extrudeMove(value) {
        this.value = [...value];
        this.editObjects.forEach(editObject => {
            this.createBonesIneditObject[editObject.id].forEach(boneAndBaseCo => MathVec2.add(boneAndBaseCo.bone.tailVertex.co, boneAndBaseCo.baseCo, this.value));
            editObject.updateGPUData();
        });
    }

    execute() {
        this.editObjects.forEach(editObject => {
            this.createBonesIneditObject[editObject.id].forEach(boneAndBaseCo => MathVec2.add(boneAndBaseCo.bone.tailVertex.co, boneAndBaseCo.baseCo, this.value));
            editObject.updateGPUData();
        });
        return {consumed: true};
    }

    redo() {
        this.editObjects.forEach(editObject => {
            this.createBonesIneditObject[editObject.id].forEach(boneAndBaseCo => editObject.bones.push(boneAndBaseCo.bone));
            editObject.updateGPUData();
        });
    }

    undo() {
        this.editObjects.forEach(editObject => {
            this.createBonesIneditObject[editObject.id].forEach(boneAndBaseCo => indexOfSplice(editObject.bones, boneAndBaseCo.bone));
            editObject.updateGPUData();
        });
    }
}

export class BoneDelete extends Base{
    constructor(targets) {
        super(targets);
        this.indexsMeta = new Array(targets.length);
    }

    update() {
    }

    execute() {
        console.log("実行", this.targets)
        this.targets.forEach((bone,index) => {
            if (bone.parent) {
                indexOfSplice(bone.parent.childrenBone, bone);
            }
            this.indexsMeta[index] = bone.armature.allBone.indexOf(bone);
            bone.armature.allBone.splice(this.indexsMeta[index], 1);
        });
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.update(armature);
        }
    }

    undo() {
        this.targets.forEach((bone,index) => {
            bone.armature.allBone.splice(this.indexsMeta[index], 0, bone);
            bone.parent.childrenBone.push(bone);
        });
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.update(armature);
        }
    }
}