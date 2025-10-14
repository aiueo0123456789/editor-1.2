import { app } from "../../../../../main.js";
import { GraphicMesh } from "../../../../core/objects/graphicMesh.js";
import { mathVec2 } from "../../../../utils/mathVec.js";

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
        return mathVec2.averageR(this.selectVertices.map(vertex => vertex.worldPosition));
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

    get getAllObject() {
        const result = [];
        for (const object of app.context.getSelcetInSelectedObject) { // ボーンやベジェ頂点など
            if ("keyframeBlockManager" in object) { // keyframeBlockManagerを持つものだけ
                result.push(object)
            }
        }
        for (const /** @type {GraphicMesh} */ object of app.context.selectedObjects) { // グラフィックメッシュなど
            if ("animationBlock" in object) {
                for (const keyframeBlock of object.animationBlock.animations) {
                    result.push(keyframeBlock)
                }
            }
        }
        return result;
    }

    get getAllKeyframeBlockManager() {
        const result = [];
        for (const object of this.getAllObject) { // ボーンやベジェ頂点など
            result.push(object.keyframeBlockManager)
        }
        return result;
    }

    get getAllKeyframeBlock() {
        const result = [];
        for (const keyframeBlockManager of this.getAllKeyframeBlockManager) {
            for (const keyframeBlock of keyframeBlockManager.blocks) {
                result.push(keyframeBlock);
            }
        }
        return result;
    }

    get getAllKeyframe() {
        const result = [];
        for (const keyframeBlock of this.getAllKeyframeBlock) {
            for (const keyframe of keyframeBlock.keys) {
                result.push(keyframe)
            }
        }
        return result;
    }

    getSelectedContainsKeys() {
        const result = [];
        for (const bone of app.context.activeObject.getSelectBones()) {
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