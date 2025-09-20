import { GPU } from "../../utils/webGPU.js";
import { AnimationBlock, VerticesAnimation } from "./animation.js";
import { ObjectBase, ObjectEditorBase, sharedDestroy } from "../../utils/objects/util.js";
import { vec2 } from "../../utils/mathVec.js";
import { app } from "../../../main.js";

class Vertex {
    constructor(/** @type {Point} */point,data) {
        this.point = point;
        this.co = data.co;
        this.typeIndex = data.typeIndex;
        this.selected = false;
        this.parentWeight = data.parentWeight;
    }

    getWorldAnimationIndex(animation) {
        return (animation.index * this.point.bezierModifier.MAX_POINTS + this.point.bezierModifier.runtimeOffsetData.animationOffset) * 3 + this.localIndex;
    }

    get worldIndex() {
        return this.point.worldIndex * 3 + this.typeIndex;
    }

    get localIndex() {
        return this.point.localIndex * 3 + this.typeIndex;
    }

    getSaveData() {
        return {
            co: this.co,
            parentWeight: this.parentWeight
        }
    }
}

class Point {
    constructor(/** @type {BezierModifier} */ bezierModifier, data) {
        this.bezierModifier = bezierModifier;

        this.index = data.index ? data.index : bezierModifier.allPoint.length;
        this.basePoint = new Vertex(this,Object.assign({typeIndex: 0},data.point));
        this.baseLeftControlPoint = new Vertex(this,Object.assign({typeIndex: 1},data.leftControlPoint));
        this.baseRightControlPoint = new Vertex(this,Object.assign({typeIndex: 2},data.rightControlPoint));
    }

    get localIndex() {
        return this.bezierModifier.allPoint.indexOf(this);
    }

    get worldIndex() {
        return this.bezierModifier.runtimeOffsetData.pointOffset + this.bezierModifier.allPoint.indexOf(this);
    }

    getSaveData() {
        return {
            index: this.index,
            point: this.basePoint.getSaveData(),
            leftControlPoint: this.baseLeftControlPoint.getSaveData(),
            rightControlPoint: this.baseRightControlPoint.getSaveData(),
            parentWeight: this.parentWeight,
        };
    }
}

class Editor extends ObjectEditorBase {
    constructor(/** @type {BezierModifier} */bezierModifier) {
        super();
        this.bezierModifier = bezierModifier;
    }

    destroy() {
        this.bezierModifier = null;
    }

    createPoint(coordinate) {
        return new Point(this.bezierModifier, {point: {co: coordinate, parentWeight: {indexs: [0,0,0,0], weights: [1,0,0,0]}}, leftControlPoint: {co: vec2.addR(coordinate, [0, -10]), parentWeight: {indexs: [0,0,0,0], weights: [1,0,0,0]}}, rightControlPoint: {co: vec2.addR(coordinate, [0, 10]), parentWeight: {indexs: [0,0,0,0], weights: [1,0,0,0]}}});
    }

    appendPoint(point) {
        console.trace("追加")
        this.bezierModifier.allPoint.push(point);
        app.scene.runtimeData.bezierModifierData.updateBaseData(this.bezierModifier);
    }

    deletePoint(point) {
        if (!this.bezierModifier.allPoint.includes(point)) return ;
        this.bezierModifier.allPoint.splice(this.bezierModifier.allPoint.indexOf(point), 1);
        app.scene.runtimeData.bezierModifierData.updateBaseData(this.bezierModifier);
    }
}

export class BezierModifier extends ObjectBase {
    static VERTEX_LEVEL = 3; // 小オブジェクトごとに何個の頂点を持つか
    constructor(data) {
        super(data.name, "ベジェモディファイア", data.id);
        this.runtimeData = app.scene.runtimeData.bezierModifierData;

        this.MAX_POINTS = app.appConfig.MAX_POINTS_PER_BEZIERMODIFIER;
        this.MAX_ANIMATIONS = app.appConfig.MAX_ANIMATIONS_PER_BEZIERMODIFIER;
        this.vertexBufferOffset = 0;
        this.animationBufferOffset = 0;
        this.weightBufferOffset = 0;

        this.animationBlock = new AnimationBlock(this, VerticesAnimation);

        this.pointNum = 0;
        this.baseTransformIsLock = false;

        this.autoWeight = true;

        /** @type {Point[]} */
        this.allPoint = [];

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);
        this.individualGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [this.objectDataBuffer]);

        // this.children = new Children();
        this.editor = new Editor(this);

        this.mode = "オブジェクト";

        this.init(data);
    }

    get verticesNum() {
        return this.pointNum * 3;
    }

    get MAX_VERTICES() {
        return this.MAX_POINTS * 3;
    }

    get allVertices() {
        const result = [];
        for (const point of this.allPoint) {
            result.push(point.basePoint);
            result.push(point.baseLeftControlPoint);
            result.push(point.baseRightControlPoint);
        }
        return result;
    }

    get animationWorldOffset() {
        return this.animationBufferOffset * BezierModifier.VERTEX_LEVEL;
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
        this.children = null;
    }

    init(data) {
        console.log(data)
        for (const point of data.points) {
            this.allPoint.push(new Point(this, point));
        }
        data.animationKeyDatas.forEach((keyData,index) => {
            const animationData = keyData.transformData.transformData;
            app.scene.runtimeData.bezierModifierData.setAnimationData(this, animationData, index);
        })

        this.animationBlock.setSaveData(data.animationKeyDatas);

        this.isInit = true;
        this.isChange = true;
    }

    async getSaveData() {
        const animationKeyDatas = await this.animationBlock.getSaveData();
        return {
            name: this.name,
            id: this.id,
            type: this.type,
            points: this.allPoint.map(point => point.getSaveData()),
            animationKeyDatas: animationKeyDatas,
        };
    }
}