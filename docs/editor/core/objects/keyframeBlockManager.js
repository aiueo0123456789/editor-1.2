import { app } from "../../../main.js";
import { KeyframeBlock } from "./keyframe.js";

export class KeyframeBlockManager {
    constructor(object,parameters,data = {blocks: []}) {
        this.type = "キーフレームブロックマネージャー";
        this.object = object;
        this.parameters = parameters;
        this.blocks = parameters.map(targetValue => new KeyframeBlock(object, targetValue));
        this.blocksMap = {};
        for (let i = 0; i < parameters.length; i ++) {
            this.blocksMap[parameters[i]] = this.blocks[i];
        }
        for (const keyframeBlockData of data.blocks) {
            this.blocksMap[keyframeBlockData.targetValue].setKeyframe(keyframeBlockData.keys);
        }
        app.scene.objects.keyframeBlockManagers.push(this);
    }

    update(frame) {
        for (const block of this.blocks) {
            block.update(frame);
        }
    }

    clearAnimatoin() {
        for (const parameter of this.parameters) {
            this.object[parameter] = 0;
        }
    }

    getSaveData() {
        return {
            type: this.type,
            blocks: this.blocks.map(block => block.getSaveData())
        };
    }
}