import { GPU } from "../../utils/webGPU.js";
import { AnimationBlock, VerticesAnimation } from "./animation.js";
import { ObjectBase, ObjectEditorBase, sharedDestroy, UnfixedReference } from "../../utils/objects/util.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { app } from "../../../main.js";
import { KeyframeBlockManager } from "./keyframeBlockManager.js";

class Vertex {
    constructor(/** @type {Point} */point,data) {
        if (!data.parentWeight) data.parentWeight = {indexs: [0,0,0,0], weights: [1,0,0,0]};
        this.type = "ベジェ頂点";
        this.point = point;
        this.co = data.co;
        this.typeIndex = data.typeIndex;
        this.selected = false;
        this.parentWeight = data.parentWeight;

        this.x = 0;
        this.y = 0;
        this.keyframeBlockManager = app.scene.objects.createObjectAndSetUp({type: "キーフレームブロックマネージャー", object: this, parameters: ["x","y"]});
    }

    get name() {
        return `${this.point.name}->${this.typeIndex}`;
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
            parentWeight: this.parentWeight,
            animations: this.keyframeBlockManager.getSaveData(),
        }
    }
}

class Point {
    constructor(/** @type {BezierModifier} */ bezierModifier, data) {
        this.bezierModifier = bezierModifier;
        this.type = "ベジェポイント";

        this.name = data.name ? data.name : `名称未設定${data.index}`;

        this.basePoint = new Vertex(this,Object.assign({typeIndex: 0},data.point));
        this.baseLeftControlPoint = new Vertex(this,Object.assign({typeIndex: 1},data.leftControlPoint));
        this.baseRightControlPoint = new Vertex(this,Object.assign({typeIndex: 2},data.rightControlPoint));
    }

    get localIndex() {
        return this.bezierModifier.allPoint.indexOf(this);
    }

    get worldIndex() {
        return this.bezierModifier.runtimeOffsetData.start.pointOffset + this.bezierModifier.allPoint.indexOf(this);
    }

    getSaveData() {
        return {
            name: this.name,
            index: this.localIndex,
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
        return new Point(this.bezierModifier, {point: {co: coordinate, parentWeight: {indexs: [0,0,0,0], weights: [1,0,0,0]}}, leftControlPoint: {co: mathVec2.addR(coordinate, [0, -10]), parentWeight: {indexs: [0,0,0,0], weights: [1,0,0,0]}}, rightControlPoint: {co: mathVec2.addR(coordinate, [0, 10]), parentWeight: {indexs: [0,0,0,0], weights: [1,0,0,0]}}});
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

        this.animationBlock = new AnimationBlock(this, VerticesAnimation);

        this.baseTransformIsLock = false;

        this.autoWeight = true;

        /** @type {Point[]} */
        this.allPoint = [];

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);
        this.individualGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [this.objectDataBuffer]);

        this.editor = new Editor(this);

        this.mode = "オブジェクト";

        this.init(data);
    }

    get verticesNum() {
        return this.pointNum * 3;
    }

    get pointNum() {
        return this.allPoint.length;
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
    }

    resolvePhase() {
        if (this.parent instanceof UnfixedReference) {
            this.changeParent(this.parent.getObject());
        }
    }

    init(data) {
        this.changeParent(app.scene.objects.getObjectFromID(data.parent));
        for (const point of data.points) {
            this.allPoint.push(new Point(this, point));
        }
        this.isInit = true;
        this.isChange = true;
    }

    async getSaveData() {
        return {
            name: this.name,
            id: this.id,
            parent: this.parent ? this.parent.id : null,
            type: this.type,
            points: this.allPoint.map(point => point.getSaveData()),
        };
    }
}