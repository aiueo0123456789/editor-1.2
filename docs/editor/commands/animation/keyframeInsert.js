import { app } from "../../../main.js";
import { BArmatureAnimation } from "../../core/edit/objects/BArmatureAnimation.js";
import { BKeyframeBlockManager } from "../../core/edit/objects/BKeyframeBlockManager.js";
import { KeyframeBlock } from "../../core/objects/keyframeBlock.js";

export class KeyframeInsertInSelectedElementCommand {
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
                return keyframeBlockManager.keyframeBlocks.map((keyframeBlock, valueIndex) => KeyframeBlock.createKeyframe(app.scene.frame_current, values[valueIndex]));
            });
        }
    }

    execute() {
        this.selectedBones.forEach((bone, boneIndex) => {
            /** @type {BKeyframeBlockManager} */
            const keyframeBlockManager = bone.keyframeBlockManager;
            keyframeBlockManager.keyframeBlocks.forEach((keyframeBlock, keyframeIndex) => {
                keyframeBlock.addKeyframe(this.createdKeyframes[boneIndex][keyframeIndex]);
            });
        });
        return {consumed: true};
    }

    undo() {
        this.selectedBones.forEach((bone, boneIndex) => {
            /** @type {BKeyframeBlockManager} */
            const keyframeBlockManager = bone.keyframeBlockManager;
            keyframeBlockManager.keyframeBlocks.forEach((keyframeBlock, keyframeIndex) => {
                keyframeBlock.removeKeyframe(this.createdKeyframes[boneIndex][keyframeIndex]);
            });
        });
    }
}

export class KeyframeInsertInKeyframeCommand {
    constructor(/** @type {KeyframeBlock} */ keyframeBlock, frame, value) {
        this.keyframeBlock = keyframeBlock;
        this.newKey = KeyframeBlock.createKeyframe(frame, value);
    }

    execute() {
        this.keyframeBlock.addKeyframe(this.newKey);
        return {consumed: true};
    }

    undo() {
        this.keyframeBlock.removeKeyframe(this.newKey);
    }
}