import { app } from "../../../main.js";
import { KeyframeBlock } from "../objects/keyframe.js";

export class BKeyframeBlockManager {
    constructor(data = {blocks: null, object: null, parameters: null}) {
        this.type = "キーフレームブロックマネージャー";
        this.object = data.object;
        this.parameters = data.parameters;

        this.blocksMap = new Map();
        for (let i = 0; i < this.parameters.length; i ++) {
            if (data.blocks) {
                this.blocksMap.set(this.parameters[i], data.blocks[i]);
            } else {
                this.blocksMap.set(this.parameters[i], app.scene.objects.createObjectAndSetUp({type: "キーフレームブロック"}));
            }
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

    appendParameter(targetValue) {
        this.blocksMap.set(targetValue, app.scene.objects.createObjectAndSetUp({type: "キーフレームブロック"}));
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