import { cdt } from "../../utils/objects/graphicMesh/createMesh/cdt.js";
import { createID } from "../../utils/ui/util.js";
import { copyToArray, createArrayN, createArrayNAndFill, hitTestPointTriangle, lerpTriangle } from "../../utils/utility.js";
import { KeyframeBlockManager } from "./keyframeBlockManager.js";

export class ShapeKeyMetaData {
    constructor(data) {
        this.index = data.index;
        this.name = data.name;
        this.object = data.object;
    }
}

class Point {
    constructor(data) {
        this.co = data.co;
        /** @type {Number[]} */
        this.weights = data.weights;
    }
}

export class BlendShape {
    createPoint(co) {
        return new Point({co: co, weights: this.shapeKeys.map(shapeKey => 0)});
    }
    constructor(data) {
        this.id = data.id ? data.id : createID();
        this.name = data.name;
        this.type = "ブレンドシェイプ";
        /** @type {ShapeKeyMetaData[]} */
        this.shapeKeys = data.shapeKeys;
        this.dimension = data.dimension;
        this.value = createArrayNAndFill(this.dimension, 0);
        /** @type {Point[]} */
        this.points = data.points;
        this.max = data.max;
        this.min = data.min;
        this.weights = [];
        this.triangles = []; // ドロネーで自動生成
        this.keyframeBlockManager = new KeyframeBlockManager({type: "キーフレームブロックマネージャー", object: this.value, parameters: createArrayN(this.dimension)});

        // エディターデータ
        this.activePoint = null;
    }

    apppendShapeKey(/** @type {ShapeKeyMetaData} */shapeKey) {
        this.shapeKeys.push(shapeKey);
        this.points.forEach(point => point.weights.push(0))
    }

    updateTriangle() {
        copyToArray(this.triangles, cdt(this.points.map(point => point.co), []).meshes.map(indexs => indexs.map(index => this.points[index])));
    }

    /**
     * valueを点とした時それを内包する三角形を探しその三角形で重みを補完する
     */
    updateWeights() {
        let targetTriangle = null;
        for (const triangle of this.triangles) {
            if (hitTestPointTriangle(triangle[0].co,triangle[1].co,triangle[2].co,this.value)) {
                targetTriangle = triangle;
                break ;
            }
        }
        this.weights = lerpTriangle(
            targetTriangle[0].co,targetTriangle[1].co,targetTriangle[2].co,
            targetTriangle[0].weights,targetTriangle[1].weights,targetTriangle[2].weights,
            this.value
        );
    }

    get aroundPointsNum() {
        return 2 ** this.dimension;
    }

    update() {
        this.updateWeights();
        for (let i = 0; i < this.shapeKeys.length; i ++) {
            this.shapeKeys[i].object.allShapeKeyWeights[this.shapeKeys[i].index] = this.weights[i];
        }
    }
}