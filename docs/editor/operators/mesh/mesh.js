import { GraphicMesh } from "../../core/objects/graphicMesh.js";

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