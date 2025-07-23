import { app } from "../../../../app/app.js";
import { managerForDOMs } from "../../../../utils/ui/util.js";
import { Bone } from "../../armature.js";

export class PhysicsAttachmentData {
    constructor(/** @type {Bone} */bone) {
        this.type = "物理アタッチメント";
        this.bone = bone;
        this.x = 0;
        this.y = 0;
        this.rotate = 0;
        this.shearX = 0;
        this.scaleX = 0;
        this.inertia = 0.5;
        this.strength = 50;
        this.damping = 0.95;
        this.mass = 100;
        // this.massInverse = 0.01;
        this.wind = 0;
        this.gravity = 0;
        this.mix = 1;
        this.limit = 100;
        this.step = 0.016;

        managerForDOMs.set({o: this, i: "&all"}, null, () => {
            app.scene.runtimeData.armatureData.updateBaseData(bone.armature);
        });
    }
}