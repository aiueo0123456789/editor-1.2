import { app } from "../../../../main.js";
import { MathVec2 } from "../../../utils/mathVec.js";
import { roundUp } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { GraphicMesh } from "../../objects/graphicMesh.js";

class Vert {
    constructor(data) {
        this.co = data.co;
        this.uv = data.uv;
        this.weightBlock = data.weightBlock;
        this.selected = false;
    }
}

class Mesh {
    constructor(data) {
        this.vertices = data.vertices;
        this.selected = false;
    }

    get hasSelectedVertexInMesh() {
        return this.vertices.filter(vert => vert.selected).length ? true : false;
    }
}

class Edge {
    constructor(data) {
        this.vertices = data.vertices;
        this.selected = false;
    }

    get hasSelectedVertexInEdge() {
        return this.vertices.filter(vert => vert.selected).length ? true : false;
    }
}

export class BMesh {
    static createVertex(co, uv, weightBlock = [0,0,0,0,1,0,0,0]) {
        return new Vert({co: co, uv: uv, weightBlock: weightBlock});
    }
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

        this.activeBone = null;
    }

    // object.id
    get id() {
        return this.object.id;
    }

    // 頂点の表示状況をbool[]でかえす
    get verticesSelectData() {
        return this.vertices.map(vertex => vertex.selected);
    }

    // 頂点(object)から頂点indexを返す
    getVertexIndexByVertex(vertex) {
        return this.vertices.indexOf(vertex);
    }

    // メッシュの頂点indexを返す
    getMeshLoop(mesh) {
        return mesh.vertices.map(vertex => this.getVertexIndexByVertex(vertex));
    }

    // 辺の頂点indexを返す
    geVerticesIndexInEdge(edge) {
        return edge.vertices.map(vertex => this.getVertexIndexByVertex(vertex));
    }

    // 選択情報のクリア
    selectedClear() {
        this.vertices.forEach(vertex => {
            vertex.selected = false;
            GPU.writeBuffer(this.vertexSelectedBuffer, GPU.createBitData([0], ["u32"]), this.getVertexIndexByVertex(vertex) * 4);
        });
        this.activeBone = null;
    }

    // 頂点選択
    select(/** @type {Array} */ indexs) {
        indexs.forEach(index => {
            this.vertices[index].selected = true;
            this.activeVertex = this.vertices[index];
            GPU.writeBuffer(this.vertexSelectedBuffer, GPU.createBitData([1], ["u32"]), index * 4);
        });
    }

    deleteVert() {
        this.meshes = this.meshes.filter(mesh => !mesh.vertices.filter(vertex => vertex.selected).length);
        this.edges = this.edges.filter(edge => !edge.vertices.filter(vertex => vertex.selected).length);
        this.silhouetteEdges = this.silhouetteEdges.filter(silhouetteEdge => !silhouetteEdge.vertices.filter(vertex => vertex.selected).length);
        this.vertices = this.vertices.filter(vert => !vert.selected);
        this.updateGPUData();
    }

    deleteEdge() {
        this.edges = this.edges.filter(edge => !edge.selected);
        this.silhouetteEdges = this.silhouetteEdges.filter(silhouetteEdge => !silhouetteEdge.selected);
        this.updateGPUData();
    }

    appendEdge() {
        if (this.selectedVertices.length == 2) {
            this.edges.push(new Edge({vertices: this.selectedVertices}));
        }
        this.updateGPUData();
    }

    appendVert(data) {
        this.vertices.push(new Vert(data));
    }

    get selectedVertices() {
        return this.vertices.filter(vert => vert.selected);
    }

    get silhouetteEdgesNum() {
        return this.silhouetteEdges.length;
    }

    get edgesNum() {
        return this.edges.length;
    }

    get verticesNum() {
        return this.vertices.length;
    }

    get meshesNum() {
        return this.meshes.length;
    }

    updateGPUData() {
        this.verticesBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.vertices.map(vertex => vertex.co).flat(), ["f32", "f32"]);
        this.uvsBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.vertices.map(vertex => vertex.uv).flat(), ["f32", "f32"]);
        this.silhouetteEdgesBuffer = GPU.createStorageBuffer(roundUp(this.silhouetteEdges.length * 2 * 4, 2 * 4), this.silhouetteEdges.map(edge => this.geVerticesIndexInEdge(edge)).flat(), ["u32", "u32"]);
        this.edgesBuffer = GPU.createStorageBuffer(roundUp(this.edges.length * 2 * 4, 2 * 4), this.edges.map(edge => this.geVerticesIndexInEdge(edge)).flat(), ["u32", "u32"]);
        this.meshesBuffer = GPU.createStorageBuffer(roundUp(this.meshes.length * 3 * 4, 3 * 4), this.meshes.map(mesh => this.getMeshLoop(mesh)).flat(), ["u32", "u32", "u32"]);
        this.vertexSelectedBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 4, 4), this.vertices.map(vertex => vertex.selected ? 1 : 0), ["u32"]);
        this.silhouetteEdgeSelectedBuffer = GPU.createStorageBuffer(roundUp(this.silhouetteEdges.length * 4, 4), this.silhouetteEdges.map(edge => edge.selected ? 1 : 0), ["u32"]);
        this.edgeSelectedBuffer = GPU.createStorageBuffer(roundUp(this.edges.length * 4, 4), this.edges.map(edge => edge.selected ? 1 : 0), ["u32"]);
        this.meshSelectedBuffer = GPU.createStorageBuffer(roundUp(this.meshes.length * 4, 4), this.meshes.map(mesh => mesh.selected ? 1 : 0), ["u32"]);
        this.zIndexBuffer = GPU.createUniformBuffer(4, [1 / (this.zIndex + 1)], ["f32"]);
        this.renderingGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vu_Ft"), [this.verticesBuffer, this.uvsBuffer, this.silhouetteEdgesBuffer, this.edgesBuffer, this.meshesBuffer, this.vertexSelectedBuffer, this.silhouetteEdgeSelectedBuffer, this.edgeSelectedBuffer, this.meshSelectedBuffer, this.zIndexBuffer, this.texture.view]);
    }

    async fromMesh(object) {
        const graphicMeshData = app.scene.runtimeData.graphicMeshData;
        this.object = object;
        const [coordinates,meshes,weightBlocks,uvs] = await Promise.all([
            graphicMeshData.baseVertices.getObjectData(object),
            graphicMeshData.meshes.getObjectData(object),
            graphicMeshData.weightBlocks.getObjectData(object),
            graphicMeshData.uv.getObjectData(object)
        ]);
        for (let i = 0; i < coordinates.length; i ++) {
            this.vertices.push(new Vert({co: coordinates[i], uv: uvs[i], weightBlock: weightBlocks[i]}));
        }
        for (let i = 0; i < meshes.length; i ++) {
            this.meshes.push(new Mesh({vertices: meshes[i].map(vertexIndex => this.vertices[vertexIndex])}));
        }
        this.texture = object.texture;
        this.zIndex = object.zIndex;
        this.updateGPUData();
    }

    toRutime() {
        this.object.allVertices.length = 0;
        this.object.allUVs.length = 0;
        this.object.allWeightBlocks.length = 0;
        this.object.allMeshes.length = 0;
        for (const vert of this.vertices) {
            this.object.allVertices.push(...vert.co);
            this.object.allUVs.push(...vert.uv);
            this.object.allWeightBlocks.push(...vert.weightBlock);
        }
        for (const mesh of this.meshes) {
            this.object.allMeshes.push(...this.getMeshLoop(mesh));
        }
        const graphicMeshData = app.scene.runtimeData.graphicMeshData;
        graphicMeshData.update(this.object);
    }
}