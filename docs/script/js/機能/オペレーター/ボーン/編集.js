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
            if (parentBone.selectedHead) {
                this.createBones.push(new Bone(parentBone.armature, undefined, parentBone, parentBone.baseHead,[0,0]));
            }
            if (parentBone.selectedTail) {
                this.createBones.push(new Bone(parentBone.armature, undefined, parentBone, parentBone.baseTail,[0,0]));
            }
        });
        this.value = [0,0];
        this.update([0,0]);
    }

    update(value) {
        this.value = [...value];
        this.createBones.forEach(bone => {
            vec2.add(bone.baseTail,bone.baseHead,this.value);
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
}

export class BoneDelete extends Base{
    constructor(targets) {
        super(targets);
    }

    update() {
    }

    execute() {
        console.log("実行", this.targets)
        this.targets.forEach(bone => {
            bone.armature.deleteBone(bone);
        });
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.updateBaseData(armature);
        }
    }

    undo() {
        this.targets.forEach(bone => {
            bone.armature.insertBone(bone, true);
        });
        for (const armature of this.armatures) {
            app.scene.runtimeData.armatureData.updateBaseData(armature);
        }
    }
}