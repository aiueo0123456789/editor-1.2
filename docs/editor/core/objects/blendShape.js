import { app } from "../../../main.js";
import { cdt } from "../../utils/objects/graphicMesh/createMesh/cdt.js";
import { UnfixedReference } from "../../utils/objects/util.js";
import { createID } from "../../utils/ui/util.js";
import { copyToArray, createArrayN, createArrayNAndFill, hitTestPointTriangle, IsString, lerpTriangle } from "../../utils/utility.js";
import { KeyframeBlockManager } from "./keyframeBlockManager.js";

export class ShapeKeyMetaData {
    constructor(data) {
        this.id = data.id ? data.id : createID();
        this.index = data.index;
        this.name = data.name;
        this.object = data.object;
    }

    getSaveData() {
        return {
            id: this.id,
            name: this.name,
            object: this.object.id,
            index: this.index,
        }
    }
}

class Point {
    constructor(data) {
        this.co = data.co;
        /** @type {Number[]} */
        this.weights = data.weights;
    }

    getSaveData() {
        return {
            co: this.co,
            weights: this.weights,
        };
    }
}

export class BlendShape {
    createPoint(co, weights = undefined) {
        return new Point({co: co, weights: weights ? weights : this.shapeKeys.map(shapeKey => 0)});
    }
    constructor(data) {
        this.id = data.id ? data.id : createID();
        this.name = data.name;
        this.type = "ブレンドシェイプ";
        /** @type {ShapeKeyMetaData[]} */
        this.shapeKeys = data.shapeKeys.map(shapeKey => {
            if (shapeKey instanceof ShapeKeyMetaData) return shapeKey;
            else return app.scene.objects.getObjectFromID(shapeKey);
        })
        this.dimension = data.dimension;
        this.value = createArrayNAndFill(this.dimension, 0);
        /** @type {Point[]} */
        this.points = data.points.map(point => this.createPoint(point.co, point.weights));
        this.max = data.max;
        this.min = data.min;
        this.weights = createArrayNAndFill(this.shapeKeys.length, 0);
        this.triangles = []; // ドロネーで自動生成
        /** @type {KeyframeBlockManager} */
        this.keyframeBlockManager = new KeyframeBlockManager({
            type: "キーフレームブロックマネージャー",
            object: this.value,
            parameters: createArrayN(this.dimension),
            keyframeBlocks: createArrayN(this.dimension).map(x => app.scene.objects.createObjectAndSetUp({type: "キーフレームブロック"}))
        });

        // エディターデータ
        this.activePoint = null;

        console.log(data,this)

        this.updateTriangle();
    }

    resolvePhase() {
        this.shapeKeys.forEach((shapeKey, index) => {
            if (shapeKey instanceof UnfixedReference) {
                this.shapeKeys[index] = shapeKey.getObject();
            }
        })
        this.keyframeBlockManager.resolvePhase();
    }

    updateTriangle() {
        copyToArray(this.triangles, cdt(this.points.map(point => point.co), []).meshes.map(indexs => indexs.map(index => this.points[index])));
    }

    /**
     * valueを点とした時それを内包する三角形を探しその三角形で重みを補完する
     */
    updateWeights() {
        for (const triangle of this.triangles) {
            if (hitTestPointTriangle(triangle[0].co,triangle[1].co,triangle[2].co,this.value)) {
                copyToArray(
                    this.weights,
                    lerpTriangle(
                        triangle[0].co,triangle[1].co,triangle[2].co,
                        triangle[0].weights,triangle[1].weights,triangle[2].weights,
                        this.value
                    )
                );
                return ;
            }
        }
    }

    update() {
        this.updateWeights();
        for (let i = 0; i < this.shapeKeys.length; i ++) {
            const object = this.shapeKeys[i].object;
            object.allShapeKeyWeights[this.shapeKeys[i].index] = this.weights[i];
        }
    }

    async getSaveData() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            min: this.min,
            max: this.max,
            dimension: this.dimension,
            shapeKeys: this.shapeKeys.map(shapeKey => shapeKey.id),
            points: this.points.map(point => point.getSaveData()),
        };
    }
}