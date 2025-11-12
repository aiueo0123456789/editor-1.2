import { GPU } from "../../utils/webGPU.js";
import { ObjectBase, sharedDestroy, UnfixedReference } from "../../utils/objects/util.js";
import { app } from "../../../main.js";
import { ShapeKeyMetaData } from "./blendShape.js";
import { copyToArray, createArrayNAndFill } from "../../utils/utility.js";

export class BezierModifier extends ObjectBase {
    createShapeKeyMetaData(name, index, id = undefined) {
        return new ShapeKeyMetaData({name: name, index: index, object: this, id: id});
    }
    constructor(data) {
        super(data.name, "ベジェモディファイア", data.id);
        this.runtimeData = app.scene.runtimeData.bezierModifierData;

        this.baseTransformIsLock = false;

        this.visible = true;

        /** @type {ShapeKeyMetaData[]} */
        this.shapeKeyMetaDatas = [];
        this.allVertices = [];
        this.allShapeKeys = [];
        this.allShapeKeyWeights = [];
        this.allWeightBlocks = [];

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);
        this.individualGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [this.objectDataBuffer]);

        this.mode = "オブジェクト";

        this.autoWeight = "autoWeight" in data ? data.autoWeight : true;
        this.changeParent(app.scene.objects.getObjectFromID(data.parent));
        copyToArray(this.allVertices, data.vertices.flat());
        copyToArray(this.allWeightBlocks, data.weightBcloks.flat());
        copyToArray(this.shapeKeyMetaDatas, data.shapeKeyMetaDatas.map(shapeKeyMetaData => this.createShapeKeyMetaData(shapeKeyMetaData.name, shapeKeyMetaData.index, shapeKeyMetaData.id)));
        copyToArray(this.allShapeKeyWeights, createArrayNAndFill(this.shapeKeyMetaDatas.length, 0));
        copyToArray(this.allShapeKeys, data.shapeKeys.flat());
        console.log(this);
    }

    get shapeKeysNum() {
        return this.shapeKeyMetaDatas.length;
    }

    get verticesNum() {
        return this.allVertices.length / 2;
    }

    get pointsNum() {
        return this.allVertices.length / 2 / 3;
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

    async getSaveData() {
        return {
            name: this.name,
            id: this.id,
            parent: this.parent ? this.parent.id : null,
            type: this.type,
            autoWeight: this.autoWeight,
            vertices: await this.runtimeData.baseVertices.getObjectData(this),
            weightBcloks: await this.runtimeData.weightBlocks.getObjectData(this),
            shapeKeyMetaDatas: this.shapeKeyMetaDatas.map(shapeKeyMetaData => shapeKeyMetaData.getSaveData()),
            shapeKeys: await this.runtimeData.shapeKeys.getObjectData(this),
        };
    }
}