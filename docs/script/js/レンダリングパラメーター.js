import { app } from "./app.js";
import { editorParameters } from "./main.js";
import { managerForDOMs, updateDataForUI } from "./UI/制御.js";

export let keyfarameCount = 0;
class RenderingParameters {
    constructor() {
        this.keyfarameCount = 0;
        this.keyfarameStep = 0.3;
        this.isPlaying = false;
    }

    setKeyfarameCount(frame) {
        this.keyfarameCount = frame;
        managerForDOMs.update("現在のフレーム");
        app.hierarchy.updateAnimation(frame);
        app.hierarchy.updateManagers();
        app.hierarchy.runHierarchy();
    }

    updateKeyfarameCount() {
        if (!this.isPlaying) return ;
        this.keyfarameCount += this.keyfarameStep;
        this.keyfarameCount %= editorParameters.animtionEndFrame;
        managerForDOMs.update("現在のフレーム");
    }
}

export const renderingParameters = new RenderingParameters();