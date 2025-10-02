import { app } from "../../../../../main.js";
import { vec2 } from "../../../../utils/mathVec.js";

export class TimelineSpaceData {
    constructor() {
        this.move = "select";
        this.selectKeys = [];
        this.activeKey = null;
        this.sleectBlock = [];
        this.smooth = false;
        this.selectObject = [];
        this.activeObject = null;
    }

    setVisibleObject(object, visible) {
    }

    getSelectKey() {
        const keys = this.getAllKeyframe;
        const result = [];
        for (const key of keys) {
            if (key.pointSelected) {
                result.push(key);
            }
        }
        return result;
    }

    createModeSelectList() {
        const result = [];
        result.push("オブジェクト");
        result.push("test");

        return result;
    }

    getSelectVerticesCenter() {
        return vec2.averageR(this.selectVertices.map(vertex => vertex.worldPosition));
    }

    get selectVertices() {
        const result = [];
        for (const keyframe of this.getAllKeyframe) {
            if (keyframe.point.selected) {
                result.push(keyframe.point);
            }
            if (keyframe.rightHandle.selected) {
                result.push(keyframe.rightHandle);
            }
            if (keyframe.leftHandle.selected) {
                result.push(keyframe.leftHandle);
            }
        }
        return result;
    }

    get getAllKeyframeBlock() {
        const result = [];
        for (const object of app.scene.state.getSelcetInSelectedObject) {
            for (const keyframeBlock of object.keyframeBlockManager.blocks) {
                result.push(keyframeBlock)
            }
        }
        return result;
    }

    get getAllKeyframe() {
        const result = [];
        for (const object of app.scene.state.getSelcetInSelectedObject) {
            for (const keyframeBlock of object.keyframeBlockManager.blocks) {
                for (const keyframe of keyframeBlock.keys) {
                    result.push(keyframe)
                }
            }
        }
        return result;
    }

    get getAllObject() {
        const result = [];
        if (!app.scene.state.activeObject) return result;
        if (app.scene.state.activeObject.type == "アーマチュア") {
            for (const bone of app.scene.state.activeObject.getSelectBones()) {
                result.push(bone);
            }
        } else {
        }
        return result;
    }

    getSelectedContainsKeys() {
        const result = [];
        for (const bone of app.scene.state.activeObject.getSelectBones()) {
            for (const keyframeBlock of bone.keyframeBlockManager.blocks) {
                for (const keyData of keyframeBlock.keys) {
                    if (keyData.point.selected || keyData.leftHandle.selected || keyData.rightHandle.selected) {
                        result.push(keyData);
                    }
                }
            }
        }
        return result;
    }
}