import { cdt } from "../../utils/objects/graphicMesh/createMesh/cdt.js";
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
        this.weights = data.weights;
    }
}

export class BlendShape {
    static createPoint(co, weight) {
        return new Point({co: co, weight: weight});
    }
    constructor(data) {
        this.name = data.name;
        this.type = "ブレンドシェイプ";
        /** @type {ShapeKeyMetaData[]} */
        this.shapeKeys = data.shapeKeys;
        this.dimension = data.dimension;
        this.value = createArrayNAndFill(this.dimension, 0);
        /** @type {Point} */
        this.points = data.points;
        this.max = data.max;
        this.min = data.min;
        this.weights = [];
        this.triangles = []; // ドロネーで自動生成
        this.keyframeBlockManager = new KeyframeBlockManager({type: "キーフレームブロックマネージャー", object: this.value, parameters: createArrayN(this.dimension)});
    }

    updateTriangle() {
        copyToArray(this.triangles, cdt(this.points.map(point => point.co)).meshes);
    }

    /**
     * valueを点とした時それを内包する三角形を探しその三角形で重みを補完する
     */
    updateWeights() {
        let targetTriangle = null;
        for (const triangle of this.triangles) {
            console.log(triangle);
            if (hitTestPointTriangle(this.points[triangle[0]].co,this.points[triangle[1]].co,this.points[triangle[2]].co,this.value)) {
                targetTriangle = triangle;
                break ;
            }
        }
        this.weights = lerpTriangle(
            this.points[targetTriangle[0]].co,this.points[targetTriangle[1]].co,this.points[targetTriangle[2]].co,
            this.points[targetTriangle[0]].weights,this.points[targetTriangle[1]].weights,this.points[targetTriangle[2]].weights,
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