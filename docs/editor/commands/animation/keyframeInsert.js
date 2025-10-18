import { app } from "../../../main.js";
import { BArmatureAnimation } from "../../core/edit/BArmatureAnimation.js";
import { KeyframeBlock } from "../../core/objects/keyframe.js";
import { KeyframeBlockManager } from "../../core/objects/keyframeBlockManager.js";

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
                /** @type {KeyframeBlockManager} */
                const keyframeBlockManager = bone.keyframeBlockManager;
                return keyframeBlockManager.blocks.map((keyframeBlock, valueIndex) => KeyframeBlock.createKeyframe(app.scene.frame_current, values[valueIndex]));
            });
        }
    }

    execute() {
        this.selectedBones.forEach((bone, boneIndex) => {
            /** @type {KeyframeBlockManager} */
            const keyframeBlockManager = bone.keyframeBlockManager;
            keyframeBlockManager.blocks.forEach((keyframeBlock, keyframeIndex) => {
                keyframeBlock.addKeyframe(this.createdKeyframes[boneIndex][keyframeIndex]);
            });
        });
    }

    undo() {
        this.selectedBones.forEach((bone, boneIndex) => {
            /** @type {KeyframeBlockManager} */
            const keyframeBlockManager = bone.keyframeBlockManager;
            keyframeBlockManager.blocks.forEach((keyframeBlock, keyframeIndex) => {
                keyframeBlock.removeKeyframe(this.createdKeyframes[boneIndex][keyframeIndex]);
            });
        });
    }
}