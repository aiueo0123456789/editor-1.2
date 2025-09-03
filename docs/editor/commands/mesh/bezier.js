import { BezierModifier } from "../../core/objects/bezierModifier.js";

export class AppendPointCommand {
    constructor(/** @type {BezierModifier} */target, coordinate) {
        this.target = target;
        this.point = this.target.editor.createPoint(coordinate);
    }

    execute() {
        this.target.editor.appendPoint(this.point);
    }

    undo() {
        this.target.editor.deletePoint(this.point)
    }
}