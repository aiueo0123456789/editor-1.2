import { app } from "../../app.js";

export class TimelineSpaceData {
    constructor() {
        this.move = "select";
        this.selectKeys = [];
        this.selectVertices = [];
        this.activeKey = null;
        this.sleectBlock = [];
        this.smooth = false;
        this.visibleObject = [];
        // this.selectObject = [];
        // this.activeObject = null;
    }

    setVisibleObject(object, visible) {
    }

    createModeSelectList() {
        const result = [];
        result.push("オブジェクト");
        result.push("test");

        return result;
    }

    getVisibleKeyFrame() {
        this.visibleObject = app.scene.allObject;
        const result = [];
        for (const object of this.visibleObject) {
            if (object.keyframe) {
                result.push(...object.keyframe.keys);
            }
        }
        return result;
    }
}