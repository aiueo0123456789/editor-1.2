import { Application } from "../../app/app.js";
import { BArmature } from "./BArmature.js";
import { BArmatureAnimation } from "./BArmatureAnimation.js";
import { BBezier } from "./BBezier.js";
import { BKeyframeBlockManager } from "./BKeyframeBlockManager.js";
import { BMesh } from "./BMesh.js";

export class EditDatas {
    constructor(/** @type {Application} */ app) {
        /** @type {Application} */
        this.app = app;
        this.editObjects = new Map();
        /** @type {BKeyframeBlockManager} */
        this.bkeyframeBlockManagers = [];
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

    appendBKeyframeBlockManager(bkeyframeBlockManager) {
        this.bkeyframeBlockManagers.push(bkeyframeBlockManager);
        return bkeyframeBlockManager;
    }

    createBKeyframeBlockManager(object, parameters, blocks = null) {
        return new BKeyframeBlockManager({object: object, parameters: parameters, blocks: blocks});
    }

    createAndAppendBKeyframeBlockManager(object, parameters, blocks = null) {
        return this.appendBKeyframeBlockManager(this.createBKeyframeBlockManager(object, parameters, blocks));
    }

    createEditObject(object, mode) {
        if (object.type == "グラフィックメッシュ") {
            if (mode == "メッシュ編集") {
                const bm = new BMesh();
                bm.fromMesh(object);
                return bm;
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