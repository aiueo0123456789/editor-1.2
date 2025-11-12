import { app } from "../../../main.js";
import { UnfixedReference } from "../../utils/objects/util.js";
import { copyToArray, pushToArray } from "../../utils/utility.js";
import { KeyframeBlock } from "./keyframeBlock.js";

export class KeyframeBlockManager {
    constructor(data = {object: null, parameters: null}) {
        this.type = "キーフレームブロックマネージャー";
        this.object = data.object;
        /** @type {Array} */
        this.parameters = data.parameters;
        /** @type {KeyframeBlock[]} */
        this.keyframeBlocks = data.keyframeBlocks.map(keyframeBlock => {
            if (keyframeBlock instanceof KeyframeBlock) return keyframeBlock;
            else return app.scene.objects.getObjectFromID(keyframeBlock);
        });
    }

    resolvePhase() {
        this.keyframeBlocks.forEach((keyframeBlock, index) => {
            if (keyframeBlock instanceof UnfixedReference) this.keyframeBlocks[index] = keyframeBlock.getObject();
        })
    }

    setKeyframeBlocks(parameters, keyframeBlocks) {
        copyToArray(this.parameters, parameters);
        copyToArray(this.keyframeBlocks, keyframeBlocks);
    }

    appendParameter(parameter, keyframeBlcok = app.scene.objects.createObjectAndSetUp({type: "キーフレームブロック"})) {
        pushToArray(this.parameters, parameter);
        pushToArray(this.keyframeBlocks, keyframeBlcok);
    }

    update() {
        this.parameters.forEach((parameter, index) => {
            this.object[parameter] = this.keyframeBlocks[index].value;
        })
    }

    getSaveData() {
        return {
            type: this.type,
            parameters: this.parameters,
            keyframeBlocks: this.keyframeBlocks.map(keyframeBlock => keyframeBlock.id)
        };
    }
}