import { Application } from "../../app/app.js";
import { BArmature } from "./BArmature.js";
import { BArmatureAnimation } from "./BArmatureAnimation.js";
import { BBezier } from "./BBezier.js";
import { BMesh } from "./BMesh.js";
import { BMeshWeight } from "./BMeshWeight.js";

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
        if (object.type == "グラフィックメッシュ") {
            if (mode == "メッシュ編集") {
                const bm = new BMesh();
                bm.fromMesh(object);
                return bm;
            } else if (mode == "メッシュウェイト編集") {
                const bmw = new BMeshWeight();
                bmw.fromMesh(object);
                return bmw;
            }
        } else if (object.type == "アーマチュア") {
            if (mode == "ボーン編集") {
                const ba = new BArmature();
                ba.fromArmature(object);
                return ba;
            } else if (mode == "ボーンアニメーション編集") {
                const baa = new BArmatureAnimation();
                baa.fromArmature(object);
                return baa;
            } else if (mode == "メッシュウェイト編集") {
                const baa = new BArmatureAnimation("weightPaint");
                baa.fromArmature(object);
                return baa;
            }
        } else if (object.type == "ベジェモディファイア") {
            if (mode == "ベジェ編集") {
                const bb = new BBezier();
                bb.fromBezier(object);
                return bb;
            }
        }
    }

    deleteEditObject(object) {
        this.editObjects.delete(object.id);
    }

    get allEditObjects() {
        return Array.from(this.editObjects.values());
    }
}