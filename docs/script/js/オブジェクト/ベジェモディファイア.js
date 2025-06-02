import { device,GPU } from "../webGPU.js";
import { Children } from "../子要素.js";
import { AnimationBlock, VerticesAnimation } from "../アニメーション.js";
import { ObjectBase, ObjectEditorBase, setBaseBBox, setParentModifierWeight, sharedDestroy } from "./オブジェクトで共通の処理.js";
import { app } from "../app.js";

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
    constructor(name, id) {
        super(name, "ベジェモディファイア", id);

        this.MAX_VERTICES = app.appConfig.MAX_VERTICES_PER_GRAPHICMESH;
        this.MAX_ANIMATIONS = app.appConfig.MAX_ANIMATIONS_PER_GRAPHICMESH;
        this.vertexBufferOffset = 0;
        this.animationBufferOffset = 0;
        this.weightBufferOffset = 0;
        this.allocationIndex = 0;

        this.CPUbaseVerticesPositionData = [];
        this.s_baseVerticesPositionBuffer = null;
        this.RVrt_coBuffer = null;
        this.s_controlPointBuffer = null;
        this.renderBBoxData = {max: [1,1], min: [-1,-1]};
        this.animationBlock = new AnimationBlock(this, VerticesAnimation);

        this.modifierDataGroup = null;
        this.modifierTransformDataGroup = null;
        this.adaptAnimationGroup1 = null;
        this.parentWeightBuffer = null;

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

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);

        this.children = new Children();
        this.editor = new Editor(this);

        this.parent = "";
        this.weightAuto = false;

        this.mode = "オブジェクト";

        this.init({baseVertices: [-100,0, -150,0, -50,50, 100,0, 50,-50, 150,0], animationKeyDatas: [], modifierEffectData: {data: [0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0], type: "u32*4,f32*4"}});
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
        this.name = null;
        this.CPUbaseVerticesPositionData = null;
        this.s_baseVerticesPositionBuffer = null;
        this.RVrt_coBuffer = null;
        this.s_controlPointBuffer = null;
        this.type = null;
        this.renderBBoxData = null;
        this.animationBlock = null;
        this.modifierTransformDataGroup = null;
        this.adaptAnimationGroup1 = null;
        this.parentWeightBuffer = null;

        this.calculateAllBBoxGroup = null;
        this.GUIrenderGroup = null;

        this.BBox = null;
        this.BBoxBuffer = null;
        this.BBoxRenderGroup = null;

        this.roop = null;
        this.verticesNum = null;
        this.pointNum = null;
        this.baseTransformIsLock = null;

        this.children = null;
    }

    init(data) {
        console.log(data)
        let weightGroupData = [];
        if (data.modifierEffectData) {
            if (data.modifierEffectData.type == "u32*4,f32*4") {
                weightGroupData = data.modifierEffectData.data;
            } else if (data.modifierEffectData.type == "u32,f32") {
                for (let i = 0; i < data.modifierEffectData.data.length; i += 2) {
                    weightGroupData.push(
                        data.modifierEffectData.data[i],0,0,0,
                        data.modifierEffectData.data[i + 1],0,0,0
                    );
                }
            }
        }
        app.scene.gpuData.bezierModifierData.prepare(this);
        app.scene.gpuData.bezierModifierData.setBase(this, data.baseVertices, weightGroupData);
        data.animationKeyDatas.forEach((keyData,index) => {
            const animationData = keyData.transformData.transformData;
            app.scene.gpuData.bezierModifierData.setAnimationData(this, animationData, index);
        })
        this.verticesNum = data.baseVertices.length / 2;
        this.pointNum = this.verticesNum / 3;

        this.animationBlock.setSaveData(data.animationKeyDatas);

        this.isInit = true;
        this.isChange = true;
    }

    async getSaveData() {
        const animationKeyDatas = await this.animationBlock.getSaveData();
        let modifierEffectData = null;
        if (this.parent) {
            if (this.parent.type == "モディファイア") {
                modifierEffectData = {type: "u32*4,f32*4", data: await GPU.getBufferDataAsStruct(this.parentWeightBuffer, this.verticesNum * (4 + 4) * 4, ["u32","u32","u32","u32","f32","f32","f32","f32"])};
            } else if (this.parent.type == "ベジェモディファイア") {
                modifierEffectData = {type: "u32,f32", data: await GPU.getBufferDataAsStruct(this.parentWeightBuffer, this.verticesNum * (1 + 1) * 4, ["u32","f32"])};
            } else if (this.parent.type == "ボーンモディファイア") {
                modifierEffectData = {type: "u32*4,f32*4", data: await GPU.getBufferDataAsStruct(this.parentWeightBuffer, this.verticesNum * (4 + 4) * 4, ["u32","u32","u32","u32","f32","f32","f32","f32"])};
            }
        }
        return {
            name: this.name,
            id: this.id,
            type: this.type,
            modifierEffectData: modifierEffectData,
            baseVertices: await app.scene.gpuData.bezierModifierData.getBaseVerticesFromObject(this),
            animationKeyDatas: animationKeyDatas,
        };
    }
}