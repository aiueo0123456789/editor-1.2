import { app } from "../../../../app/app.js";
import { managerForDOMs } from "../../../../utils/ui/util.js";
import { Bone } from "../../armature.js";

export class PhysicsAttachmentData {
    constructor(data) {
        this.type = "物理アタッチメント";
        this.bone = data.bone;
        this.x = data.x;
        this.y = data.y;
        this.rotate = data.rotate;
        this.shearX = data.shearX;
        this.scaleX = data.scaleX;
        this.inertia = data.inertia;
        this.strength = data.strength;
        this.damping = data.damping;
        this.mass = data.mass;
        // this.massInverse = 0.01;
        this.wind = data.wind;
        this.gravity = data.gravity;
        this.mix = data.mix;
        this.limit = data.limit;

        managerForDOMs.set({o: this, i: "&all"}, null, () => {
            app.scene.runtimeData.armatureData.updateBaseData(this.bone.armature);
        });
    }

    getSaveData() {
        return {
            type: this.type,
            x: this.x,
            y: this.y,
            rotate: this.rotate,
            shearX: this.shearX,
            scaleX: this.scaleX,
            inertia: this.inertia,
            strength: this.strength,
            damping: this.damping,
            mass: this.mass,
            wind: this.wind,
            gravity: this.gravity,
            mix: this.mix,
            limit: this.limit,
        };
    }
}