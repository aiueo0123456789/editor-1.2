import { app } from "../../../../main.js";

export class BKeyframeBlockManager {
    constructor(data = {blocks: null, object: null, parameters: null}) {
        this.type = "キーフレームブロックマネージャー";
        this.object = data.object;
        this.parameters = data.parameters;

        this.blocksMap = new Map();
        for (let i = 0; i < this.parameters.length; i ++) {
            this.blocksMap.set(this.parameters[i], data.blocks[i]);
        }
    }

    get valuesInObject() {
        return this.parameters.map(targetValue => this.object[targetValue]);
    }

    setKeyframeBlocks(parameters, keyframeBlocks) {
        this.parameters = parameters;
        this.blocksMap.clear();
        for (let i = 0; i < this.parameters.length; i ++) {
            this.blocksMap.set(this.parameters[i], keyframeBlocks[i]);
        }
    }

    /** @type {KeyframeBlock[]} */
    get blocks() {
        return [...this.blocksMap.values()];
    }

    appendParameter(targetValue, keyframeBlcok) {
        this.blocksMap.set(targetValue, keyframeBlcok);
    }

    update() {
        for (const parameter of this.parameters) {
            this.object[parameter] = this.blocksMap.get(parameter).value;
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
        };
    }
}