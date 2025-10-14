import { app } from "../../../main.js";
import { BArmature } from "../../core/edit/BArmature.js";
import { BBezier } from "../../core/edit/BBezier.js";
import { BMesh } from "../../core/edit/BMesh.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { roundUp } from "../../utils/utility.js";

class TransformCommand {
    constructor(pivotType, useProportionalEdit, proportionalType, proportionalSize) {
        this.editObjects = app.scene.editData.allEditObjects;
        this.value = [0,0];
        this.useProportional = useProportionalEdit;
        this.proportionalType = proportionalType;
        this.proportionalSize = proportionalSize;
        if (this.editObjects[0] instanceof BMesh) {
            this.isBMesh = true;
        } else if (this.editObjects[0] instanceof BArmature) {
            this.isBArmature = true;
        } else if (this.editObjects[0] instanceof BBezier) {
            this.isBBezier = true;
        }
        if (this.isBMesh || this.isBArmature || this.isBBezier) {
            this.selectedVertices = this.editObjects.map(editObject => editObject.selectedVerticesCoordinates).flat();
            if (pivotType == "boundingboxCenter") {
                this.pivotPoint = mathVec2.averageR(this.selectedVertices);
            } else if (pivotType == "activeElement") {
                this.pivotPoint = mathVec2.averageR(this.selectedVertices);
            }
            this.targetVertices = this.editObjects.map(editObject => editObject.verticesCoordinates).flat();
            this.originalVertices = this.targetVertices.map(vertex => [...vertex]); // 元の状態の記憶
        }
    }

    transform(value, useProportional, proportionalType, proportionalSize) {
        this.value = value;
        this.useProportional = useProportional;
        this.proportionalType = proportionalType;
        this.proportionalSize = proportionalSize;
        // 重みの再計算
        if (this.useProportional) {
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.weights = this.targetVertices.map((vertex, index) => {
                    if (this.selectedVertices.includes(vertex)) {
                        return 1;
                    } else {
                        const dist = mathVec2.distanceR(this.originalVertices[index], this.pivotPoint);
                        const weight = roundUp(1 - (dist / this.proportionalSize), 0);
                        return weight;
                    }
                });
            }
        } else {
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.weights = this.targetVertices.map((vertex, index) => {
                    if (this.selectedVertices.includes(vertex)) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
            }
        }
        if (this instanceof TranslateCommand) {
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.targetVertices.forEach((vertex, index) => mathVec2.add(vertex, this.originalVertices[index], mathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            }
        } else if (this instanceof ResizeCommand) {
        }
    }

    execute() {
        if (this instanceof TranslateCommand) {
            if (this.isBMesh || this.isBArmature || this.isBBezier) {
                this.targetVertices.forEach((vertex, index) => mathVec2.add(vertex, this.originalVertices[index], mathVec2.scaleR(this.value, this.weights[index])));
                this.editObjects.forEach(editObject => editObject.updateGPUData());
            }
        } else if (this instanceof ResizeCommand) {
        }
    }

    undo() {
        if (this.isBMesh || this.isBArmature || this.isBBezier) {
            this.targetVertices.forEach((vertex, index) => mathVec2.set(vertex, this.originalVertices[index]));
            this.editObjects.forEach(editObject => editObject.updateGPUData());
        }
    }
}

export class TranslateCommand extends TransformCommand {
    constructor(pivotType = "boundingboxCenter", proportional, proportionalSize = 200) {
        super(pivotType, proportional, proportionalSize);
    }
}

export class ResizeCommand extends TransformCommand {
    constructor(pivotType = "boundingboxCenter", proportional, proportionalSize = 200) {
        super(pivotType, proportional, proportionalSize);
    }
}

export class RotateCommand extends TransformCommand {
    constructor(pivotType = "boundingboxCenter", proportional, proportionalSize = 200) {
        super(pivotType, proportional, proportionalSize);
    }
}