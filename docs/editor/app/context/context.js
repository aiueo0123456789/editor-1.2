import { ChangeEditModeCommand } from "../../commands/utile/changeEditMode.js";
import { SelectObjectsCommand, SetActiveObjectsCommand } from "../../commands/utile/selectObject.js";
import { Armature } from "../../core/objects/armature.js";
import { Application } from "../app.js";

export class Context {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.currentMode = "オブジェクト";
        this.activeObject = null; // 注目されているオブジェクト
        this.activeBlendShapePoint = null;
    }

    // 選択されているオブジェクト
    get selectedObjects() {
        return this.app.scene.objects.allObject.filter(object => object.selected);
    }

    selectAll() {
        this.app.scene.objects.allObject.forEach(object => {
            if ("selected" in object) {
                this.app.operator.appendCommand(new SelectObjectsCommand(object, true));
            }
        });
        this.app.operator.execute();
    }

    selectByAttribute() {
        if (!this.activeObject) return ;
        this.app.scene.objects.allObject.filter(object => object.type == this.activeObject.type).forEach(object => {
            if ("selected" in object) {
                this.app.operator.appendCommand(new SelectObjectsCommand(object, true));
            }
        });
        this.app.operator.execute();
    }

    setSelectedObject(object, append = false) {
        this.app.operator.appendCommand(new SelectObjectsCommand(object, append));
        this.app.operator.execute();
    }

    setActiveObject(object) {
        this.app.operator.appendCommand(new SetActiveObjectsCommand(object));
        this.app.operator.execute();
    }

    setModeForSelected(mode) {
        this.app.operator.appendCommand(new ChangeEditModeCommand(mode));
        this.app.operator.execute();
    }

    get getSelectBones() {
        const result = [];
        for (const /** @type {Armature} */ armature of this.selectedObjects.filter(object => object.type == "アーマチュア")) {
            result.push(...armature.allBone.filter(bone => bone && bone.selected));
        }
        return result;
    }

    get selectVertices() {
        const result = [];
        for (const object of this.selectedObjects) {
            if (object.type == "アーマチュア") {
                for (const bone of object.allBone) {
                    if (bone.baseHead.selected) {
                        result.push(bone.baseHead);
                    }
                    if (bone.baseTail.selected) {
                        result.push(bone.baseTail);
                    }
                }
            } else if (object.type == "グラフィックメッシュ") {
                result.push(...object.allVertices.filter(vertex => vertex && vertex.selected));
            } else if (object.type == "ベジェモディファイア") {
                for (const point of object.allPoint) {
                    if (point.basePoint.selected) {
                        result.push(point.basePoint);
                    }
                    if (point.baseLeftControlPoint.selected) {
                        result.push(point.baseLeftControlPoint);
                    }
                    if (point.baseRightControlPoint.selected) {
                        result.push(point.baseRightControlPoint);
                    }
                }
            }
        }
        return result;
    }

    get getSelcetInSelectedObject() {
        const result = [];
        for (const object of this.selectedObjects) {
            if (object.type == "アーマチュア") {
                for (const bone of object.allBone) {
                    if (bone.selected) result.push(bone);
                }
            } else if (object.type == "グラフィックメッシュ") {
                result.push(...object.allVertices.filter(vertex => vertex && vertex.selected));
            } else if (object.type == "ベジェモディファイア") {
                for (const point of object.allPoint) {
                    if (point.basePoint.selected) {
                        result.push(point.basePoint);
                    }
                    if (point.baseLeftControlPoint.selected) {
                        result.push(point.baseLeftControlPoint);
                    }
                    if (point.baseRightControlPoint.selected) {
                        result.push(point.baseRightControlPoint);
                    }
                }
            }
        }
        return result;
    }
}