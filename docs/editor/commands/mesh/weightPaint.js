import { app } from "../../../main.js";
import { BBezierWeight } from "../../core/edit/objects/BBezierWeight.js";
import { BMeshWeight } from "../../core/edit/objects/BMeshWeight.js";
import { MathVec2 } from "../../utils/mathVec.js";
import { createArrayNAndFill } from "../../utils/utility.js";

class WeightBlock {
    constructor(data) {
        /** @type {String} */
        this.name = data.name;
        /** @type {Number} */
        this.index = data.index;
        /** @type {Array} */
        this.weights = data.weights;
    }
}

export class WeightPaintCommand {
    constructor(
        point = [0,0],
        weightBlockIndex = app.appConfig.areasConfig["Viewer"].weightPaintMetaData.weightBlockIndex,
        weightValue = app.appConfig.areasConfig["Viewer"].weightPaintMetaData.weightValue,
        decayType = app.appConfig.areasConfig["Viewer"].weightPaintMetaData.decayType,
        decaySize = app.appConfig.areasConfig["Viewer"].weightPaintMetaData.decaySize,
        bezierType = app.appConfig.areasConfig["Viewer"].weightPaintMetaData.bezierType
    ) {
        this.error = false;
        this.weightBlockIndex = weightBlockIndex;
        this.weightvalue = weightValue;
        this.decayType = decayType;
        this.decaySize = decaySize;
        this.bezierType = bezierType;
        this.editObject = app.scene.editData.getEditObjectByObject(app.context.activeObject);
        if (this.editObject instanceof BMeshWeight) this.isBMeshWeight = true;
        if (this.editObject instanceof BBezierWeight) this.isBBezierWeight = true;
        if (this.isBMeshWeight || this.isBBezierWeight) {
            /** @type {WeightBlock[]} */
            this.weightBlocks = this.editObject.weightBlocks;
            /** @type {Number[]} */
            this.originalWeightBlocks = this.weightBlocks.map(weightBlock => [...weightBlock.weights]);
            /** @type {Number[]} */
            this.resultWegithValues = createArrayNAndFill(this.editObject.verticesNum, 0);
            /** @type {Number[]} */
            this.maxDecays = createArrayNAndFill(this.editObject.verticesNum, 0);
        } else this.error = true;
        console.log(this)
        this.update(point);
    }

    update(point) {
        const decays = this.editObject.renderingVerticesCoordinates.map(co => Math.max(0, 1 - (MathVec2.distanceR(point, co) / this.decaySize)));
        decays.forEach((decay, vertexIndex) => {
            if (this.maxDecays[vertexIndex] < decay) this.maxDecays[vertexIndex] = decay;
            if (this.decayType == "ミックス") this.resultWegithValues[vertexIndex] = this.maxDecays[vertexIndex] * this.weightvalue + this.originalWeightBlocks[this.weightBlockIndex][vertexIndex] * (1 - this.maxDecays[vertexIndex]);
        })
        for (let vertexIndex = 0; vertexIndex < this.editObject.verticesNum; vertexIndex ++) {
            this.weightBlocks[this.weightBlockIndex].weights[vertexIndex] = this.resultWegithValues[vertexIndex];
        }
        // 正規化
        for (let vertexIndex = 0; vertexIndex < this.editObject.verticesNum; vertexIndex ++) {
            let availableWeight = 1 - this.resultWegithValues[vertexIndex]; // ターゲット以外が使える重み
            let sumWeight = 0; // ターゲット以外の重み
            for (let boneIndex = 0; boneIndex < this.originalWeightBlocks.length; boneIndex ++) {
                if (this.weightBlockIndex != boneIndex) {
                    sumWeight += this.originalWeightBlocks[boneIndex][vertexIndex];
                    this.weightBlocks[boneIndex].weights[vertexIndex] = this.originalWeightBlocks[boneIndex][vertexIndex];
                }
            }
            if (sumWeight > 0) {
                for (let boneIndex = 0; boneIndex < this.originalWeightBlocks.length; boneIndex ++) {
                    if (this.weightBlockIndex != boneIndex) {
                        this.weightBlocks[boneIndex].weights[vertexIndex] = availableWeight / sumWeight * this.originalWeightBlocks[boneIndex][vertexIndex];
                    }
                }
            }
        }
        this.editObject.updateGPUData();
    }

    execute() {
        for (let vertexIndex = 0; vertexIndex < this.editObject.verticesNum; vertexIndex ++) {
            this.weightBlocks[this.weightBlockIndex].weights[vertexIndex] = this.resultWegithValues[vertexIndex];
        }
        // 正規化
        for (let vertexIndex = 0; vertexIndex < this.editObject.verticesNum; vertexIndex ++) {
            let availableWeight = 1 - this.resultWegithValues[vertexIndex]; // ターゲット以外が使える重み
            let sumWeight = 0; // ターゲット以外の重み
            for (let boneIndex = 0; boneIndex < this.originalWeightBlocks.length; boneIndex ++) {
                if (this.weightBlockIndex != boneIndex) {
                    sumWeight += this.originalWeightBlocks[boneIndex][vertexIndex];
                    this.weightBlocks[boneIndex].weights[vertexIndex] = this.originalWeightBlocks[boneIndex][vertexIndex];
                }
            }
            if (sumWeight > 0) {
                for (let boneIndex = 0; boneIndex < this.originalWeightBlocks.length; boneIndex ++) {
                    if (this.weightBlockIndex != boneIndex) {
                        this.weightBlocks[boneIndex].weights[vertexIndex] = availableWeight / sumWeight * this.originalWeightBlocks[boneIndex][vertexIndex];
                    }
                }
            }
        }
        this.editObject.updateGPUData();
        return {consumed: true};
    }

    undo() {
        for (let boneIndex = 0; boneIndex < this.originalWeightBlocks.length; boneIndex ++) {
            for (let vertexIndex = 0; vertexIndex < this.editObject.verticesNum; vertexIndex ++) {
                this.weightBlocks[boneIndex].weights[vertexIndex] = this.originalWeightBlocks[boneIndex][vertexIndex];
            }
        }
        this.editObject.updateGPUData();
    }
}