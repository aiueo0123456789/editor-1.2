import { app } from "../../../main.js";
import { mathMat3x3 } from "../../utils/mathMat.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { createArrayNAndFill, roundUp } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";
import { GraphicMesh } from "../objects/graphicMesh.js";

class Vert {
    constructor(data) {
        this.co = data.co;
        this.uv = data.uv;
    }
}

class Mesh {
    constructor(data) {
        this.vertices = data.vertices;
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

export class BMeshWeight {
    constructor() {
        /** @type {GraphicMesh} */
        this.object = null;
        /** @type {Vert[]} */
        this.vertices = [];
        /** @type {Mesh[]} */
        this.meshes = [];
        /** @type {Edge[]} */
        this.edges = [];
        /** @type {Edge[]} */
        this.silhouetteEdges = [];
        this.texture = null;
        this.zIndex = 0;

        /** @type {WeightBlock[]} */
        this.weightBlocks = [];

        this.activeBone = null;

        /** @type {Bone[]} */
        this.bones = [];
    }

    // object.id
    get id() {
        return this.object.id;
    }

    // 頂点(object)から頂点indexを返す
    getVertexIndexByVertex(vertex) {
        return this.vertices.indexOf(vertex);
    }

    // メッシュの頂点indexを返す
    getMeshLoop(mesh) {
        return mesh.vertices.map(vertex => this.getVertexIndexByVertex(vertex));
    }

    get verticesNum() {
        return this.vertices.length;
    }

    get meshesNum() {
        return this.meshes.length;
    }

    get verticesCoordinates() {
        return this.vertices.map(vertex => vertex.co);
    }
    get verticesWeightBlocks() {
        return this.vertices.map(vertex => vertex.weightBlock);
    }

    get renderingVerticesCoordinates() {
        return this.vertices.map((vertex, vertexIndex) => {
            let vertexCo = [0,0];
            this.weightBlocks.forEach((weightBlock, boneIndex) => {
                mathVec2.add(vertexCo,vertexCo,
                    mathVec2.scaleR(
                        mathMat3x3.multiplyMatrix3x3WithVec2(
                            this.bones[boneIndex].poseMatrix,
                            mathMat3x3.multiplyMatrix3x3WithVec2(
                                mathMat3x3.invertMatrix3x3(
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
        this.verticesBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.renderingVerticesCoordinates.flat(), ["f32", "f32"]);
        this.uvsBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.vertices.map(vertex => vertex.uv).flat(), ["f32", "f32"]);
        this.weightBlocksBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 4, 4), this.weightBlocks[app.appConfig.areasConfig["Viewer"].weightPaintMetaData.weightBlockIndex].weights, ["f32"]);
        this.meshesBuffer = GPU.createStorageBuffer(roundUp(this.meshes.length * 3 * 4, 3 * 4), this.meshes.map(mesh => this.getMeshLoop(mesh)).flat(), ["u32", "u32", "u32"]);
        this.zIndexBuffer = GPU.createUniformBuffer(4, [1 / (this.zIndex + 1)], ["f32"]);
        this.renderingGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vu_Ft"), [this.verticesBuffer, this.uvsBuffer, this.weightBlocksBuffer, this.meshesBuffer, this.zIndexBuffer, this.texture.view]);
    }

    async fromMesh(/** @type {GraphicMesh} */object) {
        const graphicMeshData = app.scene.runtimeData.graphicMeshData;
        const armatureData = app.scene.runtimeData.armatureData;
        this.object = object;
        const [coordinate,uvs,vertexWeightBlocks,meshes,boneBaseMatrixs,bonePoseMatrixs] = await Promise.all([
            graphicMeshData.baseVertices.getObjectData(object),
            graphicMeshData.uv.getObjectData(object),
            graphicMeshData.weightBlocks.getObjectData(object),
            graphicMeshData.meshes.getObjectData(object),
            armatureData.baseBoneMatrix.getObjectData(object.parent),
            armatureData.renderingBoneMatrix.getObjectData(object.parent),
        ]);
        this.weightBlocks = object.parent.bonesMetaData.map((bone, boneIndex) => new WeightBlock({name: bone.name, index: boneIndex, weights: createArrayNAndFill(coordinate.length, 0)}));
        for (let vertexIndex = 0; vertexIndex < coordinate.length; vertexIndex ++) {
            vertexWeightBlocks[vertexIndex].slice(0,4).forEach((boneIndex, localIndex) => {
                const weightValue = vertexWeightBlocks[vertexIndex].slice(4,8)[localIndex];
                if (boneIndex != 0 || weightValue != 0) {
                    this.weightBlocks[boneIndex].weights[vertexIndex] = weightValue;
                }
            })
            this.vertices.push(new Vert({co: coordinate[vertexIndex], uv: uvs[vertexIndex]}));
        }
        for (let boneIndex = 0; boneIndex < boneBaseMatrixs.length; boneIndex ++) {
            this.bones.push(new Bone({baseMatrix: mathMat3x3.mat3x3ToArray(boneBaseMatrixs[boneIndex]), poseMatrix: mathMat3x3.mat3x3ToArray(bonePoseMatrixs[boneIndex])}));
        }
        for (let i = 0; i < meshes.length; i ++) {
            this.meshes.push(new Mesh({vertices: meshes[i].map(vertexIndex => this.vertices[vertexIndex])}));
        }
        console.log(this)
        this.texture = object.texture;
        this.zIndex = object.zIndex;
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
        const graphicMeshData = app.scene.runtimeData.graphicMeshData;
        graphicMeshData.update(this.object);
    }
}