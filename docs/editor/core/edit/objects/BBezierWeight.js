import { app } from "../../../../main.js";
import { MathMat3x3 } from "../../../utils/mathMat.js";
import { MathVec2 } from "../../../utils/mathVec.js";
import { createArrayNAndFill, roundUp } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { BezierModifier } from "../../objects/bezierModifier.js";

class Vert {
    constructor(data) {
        this.co = data.co;
    }
}

class WeightBlock {
    constructor(data) {
        this.name = data.name;
        this.index = data.index;
        this.weights = data.weights;
    }
}

class Bone {
    constructor(data) {
        this.baseMatrix = data.baseMatrix;
        this.poseMatrix = data.poseMatrix;
    }
}

export class BBezierWeight {
    constructor() {
        /** @type {BezierModifier} */
        this.object = null;
        /** @type {Vert[]} */
        this.vertices = [];

        /** @type {WeightBlock[]} */
        this.weightBlocks = [];

        this.activeBone = null;

        /** @type {Bone[]} */
        this.bones = [];

        this.isInit = false;
    }

    // object.id
    get id() {
        return this.object.id;
    }

    // 頂点(object)から頂点indexを返す
    getVertexIndexByVertex(vertex) {
        return this.vertices.indexOf(vertex);
    }

    get verticesNum() {
        return this.vertices.length;
    }

    get pointsNum() {
        return this.verticesNum / 3;
    }

    get renderingVerticesCoordinates() {
        return this.vertices.map((vertex, vertexIndex) => {
            let vertexCo = [0,0];
            this.weightBlocks.forEach((weightBlock, boneIndex) => {
                MathVec2.add(vertexCo,vertexCo,
                    MathVec2.scaleR(
                        MathMat3x3.multiplyMatrix3x3WithVec2(
                            this.bones[boneIndex].poseMatrix,
                            MathMat3x3.multiplyMatrix3x3WithVec2(
                                MathMat3x3.invertMatrix3x3(
                                    this.bones[boneIndex].baseMatrix
                                ),
                                vertex.co
                            )
                        ),
                        weightBlock.weights[vertexIndex]
                    )
                );
            })
            return vertexCo;
        });
    }

    updateGPUData() {
        // this.verticesBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.vertices.map(vertex => vertex.co).flat(), ["f32", "f32"]);
        if (!this.isInit) {
            this.verticesBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.renderingVerticesCoordinates.flat(), ["f32", "f32"]);
            this.weightBlocksBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 4, 4), this.weightBlocks[app.appConfig.areasConfig["Viewer"].weightPaintMetaData.weightBlockIndex].weights, ["f32"]);
            this.renderingGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.verticesBuffer, this.weightBlocksBuffer]);
            this.isInit = true;
        } else {
            GPU.writeBuffer(this.verticesBuffer, new Float32Array(this.renderingVerticesCoordinates.flat()));
            GPU.writeBuffer(this.weightBlocksBuffer, new Float32Array(this.weightBlocks[app.appConfig.areasConfig["Viewer"].weightPaintMetaData.weightBlockIndex].weights));
        }
    }

    async fromBezier(/** @type {BezierModifier} */object) {
        const bezierModifierData = app.scene.runtimeData.bezierModifierData;
        const armatureData = app.scene.runtimeData.armatureData;
        this.object = object;
        let [coordinates,vertexWeightBlocks,boneBaseMatrixs,bonePoseMatrixs] = await Promise.all([
            bezierModifierData.baseVertices.getObjectData(object),
            bezierModifierData.weightBlocks.getObjectData(object),
            armatureData.baseBoneMatrix.getObjectData(object.parent),
            armatureData.renderingBoneMatrix.getObjectData(object.parent),
        ]);
        coordinates = coordinates.map(coordinate => [coordinate.slice(0,2),coordinate.slice(2,4),coordinate.slice(4,6)]).flat();
        vertexWeightBlocks = vertexWeightBlocks.map(vertexWeightBlock => [vertexWeightBlock.slice(0,8),(vertexWeightBlock.slice(8,16)),vertexWeightBlock.slice(16,24)]).flat();
        this.weightBlocks = object.parent.boneMetaDatas.map((bone, boneIndex) => new WeightBlock({name: bone.name, index: boneIndex, weights: createArrayNAndFill(coordinates.length, 0)}));
        for (let vertexIndex = 0; vertexIndex < coordinates.length; vertexIndex ++) {
            vertexWeightBlocks[vertexIndex].slice(0,4).forEach((boneIndex, localIndex) => {
                const weightValue = vertexWeightBlocks[vertexIndex].slice(4,8)[localIndex];
                if (isNaN(weightValue)) this.weightBlocks[boneIndex].weights[vertexIndex] = 0;
                else this.weightBlocks[boneIndex].weights[vertexIndex] = weightValue;
            })
            this.vertices.push(new Vert({co: coordinates[vertexIndex]}));
        }
        for (let boneIndex = 0; boneIndex < boneBaseMatrixs.length; boneIndex ++) {
            this.bones.push(new Bone({baseMatrix: MathMat3x3.mat3x3ToArray(boneBaseMatrixs[boneIndex]), poseMatrix: MathMat3x3.mat3x3ToArray(bonePoseMatrixs[boneIndex])}));
        }
        this.object.autoWeight = false;
        this.isInit = false;
        this.updateGPUData();
    }

    toRutime() {
        this.object.allWeightBlocks.length = 0;
        for (let vertexIndex = 0; vertexIndex < this.verticesNum; vertexIndex ++) {
            // 上位4つの重みをデータにする
            let upToFourTh = [];
            for (const weightBlock of this.weightBlocks) {
                upToFourTh.push({index: weightBlock.index, weight: weightBlock.weights[vertexIndex]});
                upToFourTh = upToFourTh.sort((a,b) => b.weight - a.weight);
                upToFourTh.splice(4,1);
            }
            this.object.allWeightBlocks.push(...upToFourTh.map(x => x.index), ...upToFourTh.map(x => x.weight));
        }
        console.log(this.object);
        const bezierModifierData = app.scene.runtimeData.bezierModifierData;
        bezierModifierData.update(this.object);
    }
}