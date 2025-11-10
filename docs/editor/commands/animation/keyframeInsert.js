import { app } from "../../../main.js";
import { BArmatureAnimation } from "../../core/edit/objects/BArmatureAnimation.js";
import { BKeyframeBlockManager } from "../../core/edit/objects/BKeyframeBlockManager.js";
import { KeyframeBlock } from "../../core/objects/keyframe.js";

export class KeyframeInsertCommand {
    constructor() {
        this.editObjects = app.scene.editData.allEditObjects;
        if (this.editObjects[0] instanceof BArmatureAnimation) {
            this.isBArmatureAnimation = true;
        }
        if (this.isBArmatureAnimation) {
            this.selectedBones = this.editObjects.map(editObject => editObject.selectedBones).flat();
            this.createdKeyframes = this.selectedBones.map(bone => {
                const values = bone.keyframeBlockManager.valuesInObject;
                /** @type {BKeyframeBlockManager} */
                const keyframeBlockManager = bone.keyframeBlockManager;
                return keyframeBlockManager.blocks.map((keyframeBlock, valueIndex) => KeyframeBlock.createKeyframe(app.scene.frame_current, values[valueIndex]));
            });
        }
    }

    execute() {
        this.selectedBones.forEach((bone, boneIndex) => {
            /** @type {BKeyframeBlockManager} */
            const keyframeBlockManager = bone.keyframeBlockManager;
            keyframeBlockManager.blocks.forEach((keyframeBlock, keyframeIndex) => {
                keyframeBlock.addKeyframe(this.createdKeyframes[boneIndex][keyframeIndex]);
            });
        });
        return {consumed: true};
    }

    undo() {
        this.selectedBones.forEach((bone, boneIndex) => {
            /** @type {BKeyframeBlockManager} */
            const keyframeBlockManager = bone.keyframeBlockManager;
            keyframeBlockManager.blocks.forEach((keyframeBlock, keyframeIndex) => {
                keyframeBlock.removeKeyframe(this.createdKeyframes[boneIndex][keyframeIndex]);
            });
        });
    }
}