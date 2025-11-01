import { app } from "../../../main.js";
import { BMeshShapeKey } from "../../core/edit/BMeshShapeKey.js";
import { pushToArray, indexOfSplice, insertToArray, indexRemoveToArray } from "../../utils/utility.js";

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
        console.log(this)
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