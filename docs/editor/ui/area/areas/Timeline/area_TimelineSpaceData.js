import { app } from "../../../../../main.js";
import { BArmatureAnimation } from "../../../../core/edit/objects/BArmatureAnimation.js";
import { BKeyframeBlockManager } from "../../../../core/edit/objects/BKeyframeBlockManager.js";
import { GraphicMesh } from "../../../../core/objects/graphicMesh.js";
import { Keyframe, KeyframeBlock } from "../../../../core/objects/keyframeBlock.js";
import { MathVec2 } from "../../../../utils/mathVec.js";

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

    getSelectVerticesCenter() {
        return MathVec2.averageR(this.selectVertices.map(vertex => vertex.worldPosition));
    }

    /** @type {KeyframeBlock[]} */
    get keyframeBlocks() {
        return app.scene.objects.keyframeBlocks.filter(keyframeBlock => this.outlineKefyframeData.map(object => object.object).includes(keyframeBlock));
    }

    /** @type {Keyframe[]} */
    get keyframes() {
        return this.keyframeBlocks.map(keyframeBlock => keyframeBlock.keys).flat();
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

    get outlineData() {
        const looper = (objects, othersData = {}, result = []) => {
            for (const object of objects) {
                if (object instanceof BArmatureAnimation) {
                    object.selectedBones.forEach(bone => result.push({name: bone.name, type: "ボーン", children: looper([bone.keyframeBlockManager], {object: bone}), object: object}))
                    // object.bones.forEach(bone => result.push({name: bone.name, type: "ボーン", children: looper([bone.keyframeBlockManager], {object: bone})}))
                } else if (object instanceof BKeyframeBlockManager) {
                    object.parameters.forEach((parameter, index) => result.push({parameter: parameter, type: "キーフレームブロック", pathID: `${othersData.object.id}/${object.keyframeBlocks[index].id}`, object: object.keyframeBlocks[index]}))
                }
            }
            return result;
        }
        return looper(app.scene.editData.allEditObjects);
    }

    get outlineKefyframeData() {
        const result = [];
        const looper = (objects) => {
            for (const object of objects) {
                if (object.type == "キーフレームブロック") result.push(object);
                else looper(object.children);
            }
        }
        looper(this.outlineData);
        return result;
    }

    get getAllObject() {
        const result = [];
        for (const object of app.scene.editData.allEditObjects) {
            if (object instanceof BArmatureAnimation) {
                for (const bone of object.bones) {
                    result.push(bone);
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