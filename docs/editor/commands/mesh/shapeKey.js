import { app } from "../../../main.js";
import { BMeshShapeKey } from "../../core/edit/objects/BMeshShapeKey.js";
import { BlendShape, ShapeKeyMetaData } from "../../core/objects/blendShape.js";
import { pushToArray, indexOfSplice, insertToArray, indexRemoveToArray } from "../../utils/utility.js";

export class DeleteShapeKeyInBlendShapeCommand {
    constructor(/** @type {BlendShape} */blendShape, /** @type {ShapeKeyMetaData} */ shapeKey) {
        this.blendShape = blendShape;
        this.shapeKey = shapeKey;
        this.insertIndex = 0;
        // this.originalWeights = blendShape.points;
    }

    execute() {
        this.insertIndex = indexOfSplice(this.blendShape.shapeKeys, this.shapeKey);
        return {consumed: true};
    }

    undo() {
        insertToArray(this.blendShape.shapeKeys, this.insertIndex, this.shapeKey);
    }
}

export class AppendShapeKeyInBlendShapeCommand {
    constructor(/** @type {BlendShape} */blendShape, /** @type {ShapeKeyMetaData} */ shapeKey) {
        this.blendShape = blendShape;
        this.shapeKey = shapeKey;
    }

    execute() {
        pushToArray(this.blendShape.shapeKeys, this.shapeKey);
        this.blendShape.points.forEach(point => point.weights.push(0));
        return {consumed: true};
    }

    undo() {
        indexOfSplice(this.blendShape.shapeKeys, this.shapeKey);
        this.blendShape.points.forEach(point => point.weights.splice(-1, 1));
    }
}

/**
 * ブレンドシェイプにポイントを追加
 */
export class AppendBlendShapePointCommand {
    constructor(/** @type {BlendShape} */blendShape) {
        this.blendShape = blendShape;
        this.newPoint = this.blendShape.createPoint([...blendShape.value]);
    }

    execute() {
        pushToArray(this.blendShape.points, this.newPoint);
        this.blendShape.updateTriangle();
        return {consumed: true};
    }

    undo() {
        indexOfSplice(this.blendShape.points, this.newPoint);
        this.blendShape.updateTriangle();
    }
}

/**
 * アクティブなオブジェクトにシェイプキーを追加
 */
export class CreateShapeKeyCommand {
    constructor(name) {
        /** @type {BMeshShapeKey} */
        this.editObject = app.scene.editData.getEditObjectByObject(app.context.activeObject);
        this.error = !this.editObject;
        this.newShapeKey = this.editObject.createShapeKey(name);
    }

    execute() {
        pushToArray(this.editObject.shapeKeys, this.newShapeKey);
        return {consumed: true};
    }

    undo() {
        indexOfSplice(this.editObject.shapeKeys, this.newShapeKey);
    }
}

export class DeleteShapeKeyCommand {
    constructor(deleteShapeKeys) {
        /** @type {BMeshShapeKey} */
        this.editObject = app.scene.editData.getEditObjectByObject(app.context.activeObject);
        this.error = !this.editObject;
        this.deleteData = deleteShapeKeys.map(deleteShapeKey => {return {index: this.editObject.shapeKeys.indexOf(deleteShapeKey), shapeKey: deleteShapeKey}});
    }

    execute() {
        console.log(this)
        this.deleteData.sort((a,b) => b.index - a.index).forEach(data => indexRemoveToArray(this.editObject.shapeKeys, data.index));
        return {consumed: true};
    }

    undo() {
        this.deleteData.sort((a,b) => a.index - b.index).forEach(data => insertToArray(this.editObject.shapeKeys, data.index, data.shapeKey));
    }
}