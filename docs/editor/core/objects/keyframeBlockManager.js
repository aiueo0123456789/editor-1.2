import { app } from "../../../main.js";
import { KeyframeBlock } from "./keyframe.js";

export class KeyframeBlockManager {
    constructor(data = {object: null, parameters: null}) {
        this.type = "キーフレームブロックマネージャー";
        this.object = data.object;
        this.parameters = data.parameters;

        this.blocksMap = new Map();
        for (let i = 0; i < this.parameters.length; i ++) {
            this.blocksMap.set(this.parameters[i], app.scene.objects.createObjectAndSetUp({type: "キーフレームブロック"}));
        }
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