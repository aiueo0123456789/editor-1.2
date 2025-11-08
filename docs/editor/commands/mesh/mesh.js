
import { app } from "../../../main.js";
import { createEdgeFromTexture } from "../../utils/objects/graphicMesh/createMesh/createMesh.js";
import { copyToArray } from "../../utils/utility.js";

export class DeleteVerticesCommand {
    constructor() {
        this.editObjects = app.scene.editData.allEditObjects;
        this.deleteVertexIndexs = {};
        this.deleteVertices = {};
        this.deleteMeshIndexs = {};
        this.deleteMeshes = {};
        this.deleteEdgeIndexs = {};
        this.deleteEdges = {};
        this.deletesilhouetteEdgeIndexs = {};
        this.deletesilhouetteEdges = {};
    }

    execute() {
        for (const editObject of this.editObjects) {
            // 面の削除対象
            this.deleteMeshes[editObject.id] = editObject.meshes.filter(mesh => mesh.hasSelectedVertexInMesh);
            this.deleteMeshIndexs[editObject.id] = this.deleteMeshes[editObject.id].map(mesh => editObject.meshes.indexOf(mesh));
            editObject.meshes = editObject.meshes.filter(mesh => !this.deleteMeshes[editObject.id].includes(mesh));
            // 辺の削除対象
            this.deleteEdges[editObject.id] = editObject.edges.filter(edge => edge.hasSelectedVertexInEdge);
            this.deleteEdgeIndexs[editObject.id] = this.deleteEdges[editObject.id].map(edge => editObject.edges.indexOf(edge));
            editObject.edges = editObject.edges.filter(edge => !this.deleteEdges[editObject.id].includes(edge));
            // シルエット辺の削除対象
            this.deletesilhouetteEdges[editObject.id] = editObject.silhouetteEdges.filter(silhouetteEdge => silhouetteEdge.hasSelectedVertexInEdge);
            this.deletesilhouetteEdgeIndexs[editObject.id] = this.deletesilhouetteEdges[editObject.id].map(silhouetteEdge => editObject.silhouetteEdges.indexOf(silhouetteEdge));
            editObject.silhouetteEdges = editObject.silhouetteEdges.filter(silhouetteEdge => !this.deletesilhouetteEdges[editObject.id].includes(silhouetteEdge));
            // 頂点の削除
            this.deleteVertices[editObject.id] = editObject.vertices.filter(vert => vert.selected);
            this.deleteVertexIndexs[editObject.id] = this.deleteVertices[editObject.id].map(vert => editObject.vertices.indexOf(vert));
            editObject.vertices = editObject.vertices.filter(vert => !this.deleteVertices[editObject.id].includes(vert));
            editObject.updateGPUData();
        }
        return {consumed: true};
    }

    redo() {
        for (const editObject of this.editObjects) {
            // 面の削除対象
            editObject.meshes = editObject.meshes.filter(mesh => !this.deleteMeshes[editObject.id].includes(mesh));
            // 辺の削除対象
            editObject.edges = editObject.edges.filter(edge => !this.deleteEdges[editObject.id].includes(edge));
            // シルエット辺の削除対象
            editObject.silhouetteEdges = editObject.silhouetteEdges.filter(silhouetteEdge => !this.deletesilhouetteEdges[editObject.id].includes(silhouetteEdge));
            // 頂点の削除
            editObject.vertices = editObject.vertices.filter(vert => !this.deleteVertices[editObject.id].includes(vert));
            editObject.updateGPUData();
        }
    }

    undo() {
        for (const editObject of this.editObjects) {
            // 頂点を戻す
            for (let i = 0; i < this.deleteVertexIndexs[editObject.id].length; i ++) {
                editObject.vertices.splice(this.deleteVertexIndexs[editObject.id][i], 0, this.deleteVertices[editObject.id][i]);
            }
            // シルエット辺を戻す
            for (let i = 0; i < this.deletesilhouetteEdgeIndexs[editObject.id].length; i ++) {
                editObject.silhouetteEdges.splice(this.deletesilhouetteEdgeIndexs[editObject.id][i], 0, this.deletesilhouetteEdges[editObject.id][i]);
            }
            // 辺を戻す
            for (let i = 0; i < this.deleteEdgeIndexs[editObject.id].length; i ++) {
                editObject.edges.splice(this.deleteEdgeIndexs[editObject.id][i], 0, this.deleteEdges[editObject.id][i]);
            }
            // 面を戻す
            for (let i = 0; i < this.deleteMeshIndexs[editObject.id].length; i ++) {
                editObject.meshes.splice(this.deleteMeshIndexs[editObject.id][i], 0, this.deleteMeshes[editObject.id][i]);
            }
            editObject.updateGPUData();
        }
    }
}

// export class CreateEdgeFromeTextureCommand {
//     constructor(targets) {
//         this.targets = targets;
//         this.meta = [];
//         for (const graphicMesh of targets) {
//             this.meta.push({meshes: [...graphicMesh.allMeshes], vertices: [...graphicMesh.allVertices], baseEdges: [...graphicMesh.editor.baseEdges], baseSilhouetteEdges: [...graphicMesh.editor.baseSilhouetteEdges]});
//         }
//         this.pixelDensity = 1;
//         this.scale = 10;
//     }

//     async createEdge(graphicMesh, pixelDensity, scale) {
//         const result = await createEdgeFromTexture(graphicMesh.texture, pixelDensity, scale);
//         result.vertices = graphicMesh.editor.calculateLocalVerticesToWorldVertices(result.vertices);
//         graphicMesh.allVertices.length = 0;
//         for (let i = 0; i < result.vertices.length; i ++) {
//             graphicMesh.allVertices.push(graphicMesh.editor.createVertex(result.vertices[i]));
//         }
//         app.scene.runtimeData.graphicMeshData.update(graphicMesh);
//         graphicMesh.editor.setBaseSilhouetteEdges(result.edges);
//         console.log(result);
//         graphicMesh.editor.createMesh();
//         app.options.assignWeights(graphicMesh);
//     }

//     async execute() {
//         for (const graphicMesh of this.targets) {
//             await this.createEdge(graphicMesh, this.pixelDensity, this.scale);
//         }
//     }

//     async update(pixelDensity, scale) {
//         this.pixelDensity = pixelDensity;
//         this.scale = scale;
//         for (const graphicMesh of this.targets) {
//             await this.createEdge(graphicMesh, this.pixelDensity, this.scale);
//         }
//     }

//     undo() {
//         for (let i = 0; i < this.targets.length; i ++) {
//             copyToArray(this.targets[i].allMeshes, this.meta[i].meshes);
//             copyToArray(this.targets[i].allVertices, this.meta[i].vertices);
//             copyToArray(this.targets[i].editor.baseEdges, this.meta[i].baseEdges);
//             copyToArray(this.targets[i].editor.baseSilhouetteEdges, this.meta[i].baseSilhouetteEdges);
//             app.scene.runtimeData.graphicMeshData.update(this.targets[i]);
//         }
//     }
// }