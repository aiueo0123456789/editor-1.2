import { Application } from "../../app/app.js";
import { BArmature } from "./objects/BArmature.js";
import { BArmatureAnimation } from "./objects/BArmatureAnimation.js";
import { BBezier } from "./objects/BBezier.js";
import { BBezierShapeKey } from "./objects/BBezierShapeKey.js";
import { BBezierWeight } from "./objects/BBezierWeight.js";
import { BMesh } from "./objects/BMesh.js";
import { BMeshShapeKey } from "./objects/BMeshShapeKey.js";
import { BMeshWeight } from "./objects/BMeshWeight.js";

export class EditDatas {
    constructor(/** @type {Application} */ app) {
        /** @type {Application} */
        this.app = app;
        this.editObjects = new Map();
    }

    getEditObjectByObject(object) {
        return this.editObjects.get(object.id);
    }
    getEditObjectByObjectID(objectID) {
        return this.editObjects.get(objectID);
    }

    appendEditObject(object, editObject) {
        this.editObjects.set(object.id, editObject);
    }

    createEditObject(object, mode) {
        let b = null;
        if (object.type == "グラフィックメッシュ") {
            if (mode == "メッシュ編集") {
                b = new BMesh();
            } else if (mode == "メッシュウェイト編集") {
                b = new BMeshWeight();
            } else if (mode == "メッシュシェイプキー編集") {
                b = new BMeshShapeKey();
            }
            b.fromMesh(object);
        } else if (object.type == "アーマチュア") {
            if (mode == "ボーン編集") {
                b = new BArmature();
            } else if (mode == "ボーンアニメーション編集") {
                b = new BArmatureAnimation();
            } else if (mode == "メッシュウェイト編集") {
                b = new BArmatureAnimation("weightPaint");
            } else if (mode == "ベジェウェイト編集") {
                b = new BArmatureAnimation("weightPaint");
            }
            b.fromArmature(object);
        } else if (object.type == "ベジェモディファイア") {
            if (mode == "ベジェ編集") {
                b = new BBezier();
            } else if (mode == "ベジェシェイプキー編集") {
                b = new BBezierShapeKey();
            } else if ("ベジェウェイト編集") {
                b = new BBezierWeight();
            }
            b.fromBezier(object);
        }
        console.log(b);
        return b;
    }

    deleteEditObject(object) {
        if (!this.editObjects.delete(object.id)) {
            console.log(this, object);
            console.warn(`${object.id}の編集オブジェクトが削除できませんでした`);
        }
    }

    get allEditObjects() {
        return Array.from(this.editObjects.values());
    }
}