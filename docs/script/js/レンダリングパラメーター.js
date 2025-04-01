import { editorParameters } from "./main.js";
import { managerForDOMs, updateDataForUI } from "./UI/制御.js";
import { hierarchy } from "./ヒエラルキー.js";

export let keyfarameCount = 0;
class RenderingParameters {
    constructor() {
        this.keyfarameCount = 0;
        this.keyfarameStep = 0.2;
        this.isReplay = false;
    }

    setKeyfarameCount(frame) {
        this.keyfarameCount = frame;
        managerForDOMs.update("現在のフレーム");
        hierarchy.updateAnimation(frame);
        hierarchy.updateManagers();
        hierarchy.runHierarchy();
    }

    updateKeyfarameCount() {
        if (!this.isReplay) return ;
        this.keyfarameCount += this.keyfarameStep;
        this.keyfarameCount %= editorParameters.animtionEndFrame;
        managerForDOMs.update("現在のフレーム");
    }
}

export const renderingParameters = new RenderingParameters();