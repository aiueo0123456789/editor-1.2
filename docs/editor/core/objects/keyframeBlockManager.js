import { KeyframeBlock } from "./keyframe.js";

export class KeyframeBlockManager {
    constructor(object,struct,data = {blocks: []}) {
        this.type = "キーフレームブロックマネージャー";
        this.object = object;
        this.struct = struct;
        this.blocks = struct.map(targetValue => new KeyframeBlock(object, targetValue));
        this.blocksMap = {};
        for (let i = 0; i < struct.length; i ++) {
            this.blocksMap[struct[i]] = this.blocks[i];
        }
        for (const keyframeBlockData of data.blocks) {
            this.blocksMap[keyframeBlockData.targetValue].setKeyframe(keyframeBlockData.keys);
        }
    }

    getSaveData() {
        return {
            type: this.type,
            blocks: this.blocks.map(block => block.getSaveData())
        };
    }
}