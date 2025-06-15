import { Bone } from "../../../オブジェクト/ボーンモディファイア";

class Base {
    constructor(targets) {
        this.targets = [...targets];
    }
}

export class BoneExtrudeMove extends Base {
    constructor(targets) {
        super(targets);
        this.createBones = targets.map(parentBone => {
            new Bone(parentBone.armature, undefined);
        });
        this.value = [0,0];
    }

    update(value) {
    }

    execute() {
    }
}


export class BoneDelete extends Base{
    constructor() {
    }

    update() {
    }

    execute() {
    }
}