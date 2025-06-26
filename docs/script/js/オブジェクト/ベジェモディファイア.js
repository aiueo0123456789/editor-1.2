import { device,GPU } from "../webGPU.js";
import { Children } from "../子要素.js";
import { AnimationBlock, VerticesAnimation } from "../アニメーション.js";
import { ObjectBase, ObjectEditorBase, sharedDestroy } from "./オブジェクトで共通の処理.js";
import { app } from "../app.js";

class Vertex {
    constructor(/** @type {Point} */point,data) {
        this.point = point;
        this.co = data.co;
        this.parentWeight = data.parentWeight ? data.parentWeight : {indexs: [0,0,0,0], weights: [0,0,0,0]};
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
        this.basePoint = new Vertex(this,data.point);
        this.baseLeftControlPoint = new Vertex(this,data.leftControlPoint);
        this.baseRightControlPoint = new Vertex(this,data.rightControlPoint);

        this.selectedPoint = false;
        this.selectedLeftControlPoint = false;
        this.selectedRightControlPoint = false;

        bezierModifier.allPoint.push(this);
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
    constructor(bezierModifier) {
        super();
        this.bezierModifier = bezierModifier;
    }

    destroy() {
        this.bezierModifier = null;
    }
}

export class BezierModifier extends ObjectBase {
    constructor(name, id, data) {
        super(name, "ベジェモディファイア", id);

        this.MAX_VERTICES = app.appConfig.MAX_VERTICES_PER_BEZIERMODIFIER;
        this.MAX_ANIMATIONS = app.appConfig.MAX_ANIMATIONS_PER_BEZIERMODIFIER;
        this.vertexBufferOffset = 0;
        this.animationBufferOffset = 0;
        this.weightBufferOffset = 0;
        this.allocationIndex = 0;

        this.renderBBoxData = {max: [1,1], min: [-1,-1]};
        this.animationBlock = new AnimationBlock(this, VerticesAnimation);

        this.calculateAllBBoxGroup = null;
        this.GUIrenderGroup = null;

        this.BBox = {min: [0,0], max: [0,0]};
        this.BBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);
        this.BBoxRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [{item: this.BBoxBuffer, type: 'b'}]);

        this.baseBBox = [0,0,0,0];
        this.baseBBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);

        this.verticesNum = 0;
        this.pointNum = 0;
        this.baseTransformIsLock = false;

        this.autoWeight = true;

        /** @type {Point[]} */
        this.allPoint = [];

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);

        this.children = new Children();
        this.editor = new Editor(this);

        this.parent = "";

        this.mode = "オブジェクト";

        this.init(data);
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
        this.children = null;
    }

    init(data) {
        console.log(data)
        for (const point of data.points) {
            new Point(this, point);
        }
        app.scene.runtimeData.bezierModifierData.prepare(this);
        app.scene.runtimeData.bezierModifierData.updateBaseData(this);
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