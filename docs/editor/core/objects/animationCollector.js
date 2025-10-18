import { app } from "../../../main.js";
import { NameAndTypeAndID, searchAnimation } from "../../utils/objects/util.js";
import { createID, managerForDOMs } from "../../utils/ui/util.js";
import { changeParameter } from "../../utils/utility.js";
import { KeyframeBlockManager } from "./keyframeBlockManager.js";

class Editor {
    constructor(animationManager) {
        this.animationManager = animationManager;
    }
}

export class AnimationCollector extends NameAndTypeAndID {
    constructor(data) {
        super(data.name, "アニメーションコレクター", data.id);
        this.weight = 0;
        this.containedAnimations = [];
        this.isChange = false;
        this.keyframeBlockManager = app.scene.objects.createObjectAndSetUp({type: "キーフレームブロックマネージャー", object: this, parameters: ["weight"]});
        this.editor = new Editor();

        this.init(data);
    }

    // gc対象にしてメモリ解放
    destroy() {
        this.name = null;
        this.weight = null;
        this.containedAnimations = null;
    }

    setWeight(weight) {
        changeParameter(this, "weight", weight);
        managerForDOMs.update({o: this, i: "ウェイト"});
    }

    update() {
        for (const animation of this.containedAnimations) {
            changeParameter(animation, "weight", this.weight);
        }
    }

    init(data) {
        this.keyframeBlockManager.setSaveData(data.keyframe);
        for (const [id, animationName] of data.containedAnimations) {
            const object = app.scene.searchObjectFromID(id);
            const animation = searchAnimation(object, animationName);
            if (animation) {
                this.containedAnimations.push(animation);
                animation.belongAnimationCollector = this;
            } else {
                console.log(object, animationName)
            }
        }
    }

    getSaveData() {
        return {
            type: this.type,
            id: this.id,
            name: this.name,
            keyframeBlockManager: this.keyframeBlockManager.getSaveData(),
            containedAnimations : this.containedAnimations.map(x => {
                return [x.belongObject.id, x.name];
            }),
        };
    }
}
