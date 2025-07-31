import { app } from "../../app/app.js";
import { GraphicMesh } from "../../core/objects/graphicMesh.js";
import { createEdgeFromTexture } from "../../utils/objects/graphicMesh/メッシュの自動生成/画像からメッシュを作る.js";
import { arrayToArrayCopy } from "../../utils/utility.js";

export class EdgeJoinCommand {
    constructor(/** @type {GraphicMesh} */target, edge) {
        this.target = target;
        this.edge = edge;
    }

    execute() {
        this.target.editor.appendBaseEdge(this.edge);
    }

    undo() {
        this.target.editor.deleteBaseEdge(this.edge)
    }
}

export class AppendVertexCommand {
    constructor(/** @type {GraphicMesh} */target, coordinate) {
        this.target = target;
        this.vertex = this.target.editor.createVertex(coordinate);
    }

    execute() {
        this.target.editor.appendVertex(this.vertex);
    }

    undo() {
        this.target.editor.deleteVertex(this.vertex)
    }
}

export class DeleteVerticesCommand {
    constructor(vertices) {
        this.vertices = vertices;
    }

    execute() {
        for (const vertex of this.vertices) {
            vertex.graphicMesh.editor.deleteVertex(vertex)
        }
    }

    undo() {
        for (const vertex of this.vertices) {
            vertex.graphicMesh.editor.appendVertex(vertex);
        }
    }
}

export class CreateEdge {
    constructor(targets) {
        this.targets = targets;
        this.meta = [];
        for (const graphicMesh of targets) {
            this.meta.push({meshes: [...graphicMesh.allMeshes], vertices: [...graphicMesh.allVertices], baseEdges: [...graphicMesh.editor.baseEdges], baseSilhouetteEdges: [...graphicMesh.editor.baseSilhouetteEdges]});
        }
        this.pixelDensity = 1;
        this.scale = 10;
    }

    async createEdge(graphicMesh, pixelDensity, scale) {
        const result = await createEdgeFromTexture(graphicMesh.texture, pixelDensity, scale);
        result.vertices = graphicMesh.editor.calculateLocalVerticesToWorldVertices(result.vertices);
        graphicMesh.allVertices.length = 0;
        for (let i = 0; i < result.vertices.length; i ++) {
            graphicMesh.allVertices.push(graphicMesh.editor.createVertex(result.vertices[i]));
        }
        app.scene.runtimeData.graphicMeshData.updateBaseData(graphicMesh);
        graphicMesh.editor.setBaseSilhouetteEdges(result.edges);
        console.log(result);
        graphicMesh.editor.createMesh(true);
        app.options.assignWeights(graphicMesh);
    }

    async execute() {
        for (const graphicMesh of this.targets) {
            await this.createEdge(graphicMesh, this.pixelDensity, this.scale);
        }
    }

    async update(pixelDensity, scale) {
        this.pixelDensity = pixelDensity;
        this.scale = scale;
        for (const graphicMesh of this.targets) {
            await this.createEdge(graphicMesh, this.pixelDensity, this.scale);
        }
    }

    undo() {
        for (let i = 0; i < this.targets.length; i ++) {
            arrayToArrayCopy(this.targets[i].allMeshes, this.meta[i].meshes);
            arrayToArrayCopy(this.targets[i].allVertices, this.meta[i].vertices);
            arrayToArrayCopy(this.targets[i].editor.baseEdges, this.meta[i].baseEdges);
            arrayToArrayCopy(this.targets[i].editor.baseSilhouetteEdges, this.meta[i].baseSilhouetteEdges);
            app.scene.runtimeData.graphicMeshData.updateBaseData(this.targets[i]);
        }
    }
}