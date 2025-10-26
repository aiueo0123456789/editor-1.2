import { app } from "../../../main.js";
import { BMeshWeight } from "../../core/edit/BMeshWeight.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { createArrayNAndFill } from "../../utils/utility.js";

class WeightBlock {
    constructor(data) {
        this.name = data.name;
        this.index = data.index;
        this.weights = data.weights;
    }
}

export class WeightPaintCommand {
    constructor(
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
        this.editObjects = app.scene.editData.allEditObjects.filter(editObject => editObject instanceof BMeshWeight);
        if (this.editObjects[0] instanceof BMeshWeight) {
            this.isBMeshWeight = true;
        }
        if (this.isBMeshWeight) {
            this.editObject_WeightBlocks = this.editObjects.map(editObject => editObject.weightBlocks);
            this.originalWeightBlocks = this.editObject_WeightBlocks.map(weightBlocks => weightBlocks.map(weightBlock => [...weightBlock.weights]));
            this.paintWeightValue = this.editObject_WeightBlocks.map((weightBlocks,objectIndex) => createArrayNAndFill(this.editObjects[objectIndex].verticesNum, 0));
            this.minDistDecays = this.editObject_WeightBlocks.map((weightBlocks,objectIndex) => createArrayNAndFill(this.editObjects[objectIndex].verticesNum, 0));
        }
        console.log(this)
    }

    update(point) {
        const decaysList = this.editObjects.map(editObject => editObject.renderingVerticesCoordinates.map(co => Math.max(0, 1 - (mathVec2.distanceR(point, co) / this.decaySize))));
        decaysList.forEach((decays, objectIndex) => decays.forEach((decay, vertexIndex) => {
            if (this.minDistDecays[objectIndex][vertexIndex] < decay) {
                this.minDistDecays[objectIndex][vertexIndex] = decay;
            }
            if (this.decayType == "ミックス") this.paintWeightValue[objectIndex][vertexIndex] = this.minDistDecays[objectIndex][vertexIndex] * this.weightvalue + this.originalWeightBlocks[objectIndex][this.weightBlockIndex][vertexIndex] * (1 - this.minDistDecays[objectIndex][vertexIndex]);
        }))
        this.editObject_WeightBlocks.forEach((weightBlocks, objectIndex) => {
            for (let vertexIndex = 0; vertexIndex < this.editObjects[objectIndex].verticesNum; vertexIndex ++) {
                weightBlocks[this.weightBlockIndex].weights[vertexIndex] = this.paintWeightValue[objectIndex][vertexIndex];
            }
        })
        // 正規化
        this.editObject_WeightBlocks.forEach((weightBlocks, objectIndex) => {
            for (let vertexIndex = 0; vertexIndex < this.editObjects[objectIndex].verticesNum; vertexIndex ++) {
                let availableWeight = 1 - this.paintWeightValue[objectIndex][vertexIndex]; // ターゲット以外が使える重み
                let sumWeight = 0; // ターゲット以外の重み
                for (let boneIndex = 0; boneIndex < this.originalWeightBlocks[objectIndex].length; boneIndex ++) {
                    if (this.weightBlockIndex != boneIndex) {
                        sumWeight += this.originalWeightBlocks[objectIndex][boneIndex][vertexIndex];
                        weightBlocks[boneIndex].weights[vertexIndex] = this.originalWeightBlocks[objectIndex][boneIndex][vertexIndex];
                    }
                }
                for (let boneIndex = 0; boneIndex < this.originalWeightBlocks[objectIndex].length; boneIndex ++) {
                    if (this.weightBlockIndex != boneIndex) {
                        weightBlocks[boneIndex].weights[vertexIndex] = availableWeight / sumWeight * this.originalWeightBlocks[objectIndex][boneIndex][vertexIndex];
                    }
                }
            }
            this.editObjects[objectIndex].updateGPUData();
        })
    }

    execute() {
        this.editObject_WeightBlocks.forEach((weightBlocks, objectIndex) => {
            for (let vertexIndex = 0; vertexIndex < this.editObjects[objectIndex].verticesNum; vertexIndex ++) {
                weightBlocks[this.weightBlockIndex].weights[vertexIndex] = this.paintWeightValue[objectIndex][vertexIndex];
            }
        })
        // 正規化
        this.editObject_WeightBlocks.forEach((weightBlocks, objectIndex) => {
            for (let vertexIndex = 0; vertexIndex < this.editObjects[objectIndex].verticesNum; vertexIndex ++) {
                let availableWeight = 1 - this.paintWeightValue[objectIndex][vertexIndex]; // ターゲット以外が使える重み
                let sumWeight = 0; // ターゲット以外の重み
                for (let boneIndex = 0; boneIndex < this.originalWeightBlocks[objectIndex].length; boneIndex ++) {
                    if (this.weightBlockIndex != boneIndex) {
                        sumWeight += this.originalWeightBlocks[objectIndex][boneIndex][vertexIndex];
                        weightBlocks[boneIndex].weights[vertexIndex] = this.originalWeightBlocks[objectIndex][boneIndex][vertexIndex];
                    }
                }
                for (let boneIndex = 0; boneIndex < this.originalWeightBlocks[objectIndex].length; boneIndex ++) {
                    if (this.weightBlockIndex != boneIndex) {
                        weightBlocks[boneIndex].weights[vertexIndex] = availableWeight / sumWeight * this.originalWeightBlocks[objectIndex][boneIndex][vertexIndex];
                    }
                }
            }
            this.editObjects[objectIndex].updateGPUData();
        })
        return {consumed: true};
    }

    undo() {
        this.editObject_WeightBlocks.forEach((weightBlocks, objectIndex) => {
            for (let boneIndex = 0; boneIndex < originalWeightBlocks[objectIndex].length; boneIndex ++) {
                for (let vertexIndex = 0; vertexIndex < this.editObjects[objectIndex].verticesNum; vertexIndex ++) {
                    weightBlocks[boneIndex].weights[vertexIndex] = this.originalWeightBlocks[objectIndex][boneIndex][vertexIndex];
                }
            }
            this.editObjects[objectIndex].updateGPUData();
        })
    }
}