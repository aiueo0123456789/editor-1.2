import { app } from "../../app.js";
import { vec2 } from "../../ベクトル計算.js";

export class TimelineSpaceData {
    constructor() {
        this.move = "select";
        this.selectKeys = [];
        this.selectVertices = [];
        this.activeKey = null;
        this.sleectBlock = [];
        this.smooth = false;
        this.visibleObject = [];
        this.selectObject = [];
        this.activeObject = null;
    }

    setVisibleObject(object, visible) {
    }

    createModeSelectList() {
        const result = [];
        result.push("オブジェクト");
        result.push("test");

        return result;
    }

    getSelectVerticesCenter() {
        return vec2.averageR(this.selectVertices);
    }

    getVisibleKeyFrame() {
        this.visibleObject = app.scene.objects.allObject;
        const result = [];
        for (const object of this.visibleObject) {
            if (object.keyframe) {
                result.push(...object.keyframe.keys);
            }
        }
        return result;
    }

    getAllKeyframe() {
        const result = [];
        for (const bone of app.scene.state.activeObject.getSelectBones()) {
            for (const keyframeBlock of bone.keyframeBlockManager.blocks) {
                for (const keyData of keyframeBlock.keys) {
                    result.push(keyData);
                }
            }
        }
        return result;
    }

    getSelectVertices() {
        const result = [];
        for (const bone of app.scene.state.activeObject.getSelectBones()) {
            for (const keyframeBlock of bone.keyframeBlockManager.blocks) {
                for (const keyData of keyframeBlock.keys) {
                    if (keyData.pointSelected) {
                        result.push(keyData.point);
                    }
                    if (keyData.leftHandleSelected) {
                        result.push(keyData.wLeftHandle);
                    }
                    if (keyData.rightHandleSelected) {
                        result.push(keyData.wRightHandle);
                    }
                }
            }
        }
        return result;
    }

    getSelectedContainsKeys() {
        const result = [];
        for (const bone of app.scene.state.activeObject.getSelectBones()) {
            for (const keyframeBlock of bone.keyframeBlockManager.blocks) {
                for (const keyData of keyframeBlock.keys) {
                    if (keyData.pointSelected || keyData.leftHandleSelected || keyData.rightHandleSelected) {
                        result.push(keyData);
                    }
                }
            }
        }
        return result;
    }
}