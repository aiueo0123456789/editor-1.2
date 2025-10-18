import { app } from "../../../main.js";
import { createID, managerForDOMs } from "../../utils/ui/util.js";
import { GPU } from "../../utils/webGPU.js";
import { KeyframeBlockManager } from "./keyframeBlockManager.js";

export class AnimationBlock {
    constructor(user,animationClass) {
        this.animations = [];
        this.user = user;
        this.animationClass = animationClass;

        this.activeAnimationIndex = 0;
    }

    get activeAnimation() {
        if (!this.animations.length) return null;
        return this.animations[this.activeAnimationIndex];
    }

    destroy() {
        for (const animation of this.animations) {
            animation.destroy();
        }
        this.animations.length = 0;
        this.user = null;
        this.animationClass = null;
    }

    updateAnimationsIndex() {
        for (let i = 0; i < this.animations.length; i ++) {
            this.animations[i].index = i;
        }
    }

    appendAnimation(name = "名称未設定") {
        const animation = new this.animationClass(name, this.user);
        this.animations.push(animation);
        managerForDOMs.update({o: this.animations});
        managerForDOMs.update({o: this.animations.animationBlock});
        return animation;
    }

    deleteAnimation(animation) {
        let index = this.animations.indexOf(animation);
        if (index != -1) {
            animation.destroy();
            this.animations.splice(index,1);
        }
        managerForDOMs.update({o: this.animations});
        managerForDOMs.update({o: this.animations.animationBlock});
    }

    searchAnimation(animationName) {
        for (const animation of this.animations) {
            if (animation.name == animationName) return animation;
        }
        return null;
    }

    setSaveData(data) {
        for (const keyData of data) {
            const animationData = keyData.transformData;
            const animation = new this.animationClass(keyData.name, this.user);
            animation.setAnimationData(animationData);
            this.animations.push(animation);
        }
    }

    async getSaveData() {
        const animationsSaveData = [];
        await Promise.all(
            this.animations.map(async (animation) => {
                animationsSaveData.push({name : animation.name,transformData: await animation.getSaveData()});
            })
        );
        return animationsSaveData;
    }
}

class AnimationBase {
    constructor(name, user) {
        this.id = createID();
        this.name = name;
        this.keyframeBlockManager = app.scene.objects.createObjectAndSetUp({type: "キーフレームブロックマネージャー", object: this, parameters: ["weight"]});

        this.weight = 0;

        this.user = user;
        this.belongAnimationCollector = null;
    }

    get index() {
        return this.user.animationBlock.animations.indexOf(this);
    }

    get worldIndex() {
        return this.user.runtimeOffsetData.start.animationOffset + this.user.verticesNum * this.index;
    }

    get worldWeightIndex() {
        return this.user.runtimeOffsetData.start.animationWeightOffset + this.index;
    }

    // gc対象にしてメモリ解放
    destroy() {
        this.weight = 0;
        this.belongAnimationCollector = null;
        this.user = null;
    }
}

export class VerticesAnimation extends AnimationBase {
    constructor(name, user) {
        super(name, user);
        this.type = "頂点アニメーション";
    }
}