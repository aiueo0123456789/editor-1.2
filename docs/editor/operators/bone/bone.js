import { app } from "../../../app.js";
import { indexOfSplice, removeDuplicates } from "../../../utility.js";
import { Bone } from "../../../オブジェクト/アーマチュア.js";
import { vec2 } from "../../../ベクトル計算.js";

class Base {
    constructor(targets) {
        /** @type {Bone[]} */
        this.targets = [...targets];
        this.armatures = removeDuplicates(targets.map(bone => bone.armature));
    }
}

export class BoneExtrudeMoveCommand extends Base {
    constructor(targets) {
        super(targets);
        /** @type {Bone[]} */
        this.createBones = [];
        targets.forEach(parentBone => {
            if (parentBone.baseHead.selected) {
                this.createBones.push(new Bone(parentBone.armature, {parent: parentBone, baseHead: {co: parentBone.baseHead.co}, baseTail: {co: [0,0]}}));
            }
            if (parentBone.baseTail.selected) {
                this.createBones.push(new Bone(parentBone.armature, {parent: parentBone, baseHead: {co: parentBone.baseTail.co}, baseTail: {co: [0,0]}}));
            }
        });
        this.value = [0,0];
        this.update([0,0]);
    }

    update(value) {
        this.value = [...value];
        this.createBones.forEach(bone => {
            vec2.add(bone.baseTail.co,bone.baseHead.co,this.value);
        });
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.updateBaseData(armature);
        }
    }

    execute() {
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.updateBaseData(armature);
        }
    }

    redo() {
        this.createBones.forEach(bone => {
            if (bone.parent) {
                bone.parent.childrenBone.push(bone);
            }
            bone.armature.allBone.push(bone);
        });
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.updateBaseData(armature);
        }
    }

    undo() {
        this.createBones.forEach(bone => {
            if (bone.parent) {
                indexOfSplice(bone.parent.childrenBone, bone);
            }
            indexOfSplice(bone.armature.allBone, bone);
        });
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.updateBaseData(armature);
        }
    }
}

export class BoneDelete extends Base{
    constructor(targets) {
        super(targets);
        this.indexsMeta = new Array(targets.lenght);
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
            bone.armature.fixBoneIndex();
        });
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.updateBaseData(armature);
        }
    }

    undo() {
        this.targets.forEach((bone,index) => {
            bone.armature.allBone.splice(this.indexsMeta[index], 0, bone);
            bone.parent.childrenBone.push(bone);
        });
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.updateBaseData(armature);
        }
    }
}