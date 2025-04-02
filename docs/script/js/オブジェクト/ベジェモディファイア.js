import { device,GPU } from "../webGPU.js";
import { Children } from "../子要素.js";
import { AnimationBlock, VerticesAnimation } from "../アニメーション.js";
import { setBaseBBox, setParentModifierWeight, sharedDestroy } from "./オブジェクトで共通の処理.js";
import { createID } from "../UI/制御.js";

class Editor {
    constructor(bezierModifier) {
        this.baseEdges = [];
        this.baseVertices = [];
        this.BBox = {min: [0,0], max: [0,0], width: 0, height: 0, center: [0,0]};
        this.bezierModifier = bezierModifier;
    }

    destroy() {
        this.bezierModifier = null;
    }
}

export class BezierModifier {
    constructor(name, id) {
        this.id = id ? id : createID();
        this.name = name;
        this.isInit = false;
        this.isChange = false;

        this.CPUbaseVerticesPositionData = [];
        this.s_baseVerticesPositionBuffer = null;
        this.RVrt_coBuffer = null;
        this.s_controlPointBuffer = null;
        this.type = "ベジェモディファイア";
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

        this.children = new Children();
        this.editor = new Editor(this);

        this.parent = "";
        this.weightAuto = true;

        this.init({baseVertices: [-100,0, -150,0, -50,50, 100,0, 50,-50, 150,0], animationKeyDatas: []});
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
        this.verticesNum = data.baseVertices.length / 2;
        this.pointNum = this.verticesNum / 3;

        this.animationBlock.setSaveData(data.animationKeyDatas);

        this.parentWeightBuffer = GPU.createStorageBuffer(4, undefined, ['f32']);

        this.s_baseVerticesPositionBuffer = GPU.createStorageBuffer(this.verticesNum * (2) * 4, data.baseVertices, ["f32","f32","f32","f32","f32","f32"]);
        this.RVrt_coBuffer = GPU.createStorageBuffer(this.verticesNum * (2) * 4, undefined, ["f32","f32","f32","f32","f32","f32"]);

        this.isInit = true;
        this.isChange = true;

        this.setGroup();
        setBaseBBox(this);
    }

    addBaseVertices(add) {
        const newBuffer = GPU.createStorageBuffer((this.verticesNum + add.length) * (2) * 4, undefined, ["f32","f32","f32","f32","f32","f32"]);
        GPU.copyBuffer(this.s_baseVerticesPositionBuffer, newBuffer);
        GPU.writeBuffer(newBuffer, new Float32Array(add.flat(1)), this.verticesNum * (2) * 4);
        this.verticesNum = this.verticesNum + add.length;
        this.pointNum = this.verticesNum / 3;
        this.s_baseVerticesPositionBuffer = newBuffer;
        this.RVrt_coBuffer = GPU.createStorageBuffer(this.verticesNum * (2) * 4, undefined, ["f32","f32","f32","f32","f32","f32"]);
        this.setGroup();
        this.isChange = true;

        this.children.weightReset();
        setParentModifierWeight(this);
    }

    subBaseVertices(sub) {
        sub = sub.filter((x) => x % 3 == 0);
        sub = sub.map((x) => x / 3);
        sub.sort((a,b) => a - b);
        const indexs = [];
        let lastIndex = 0;
        for (const subIndex of sub) {
            if (subIndex - lastIndex >= 1) {
                indexs.push([lastIndex,subIndex - 1]);
            }
            lastIndex = subIndex + 1;
        }
        if (lastIndex < this.pointNum) {
            indexs.push([lastIndex,this.pointNum]);
        }
        GPU.consoleBufferData(this.s_baseVerticesPositionBuffer);
        const newBuffer = GPU.createStorageBuffer((this.verticesNum - sub.length * 3) * (2) * 4, undefined, ["f32","f32","f32","f32","f32","f32"]);
        let offset = 0;
        for (const rOffset of indexs) {
            GPU.copyBuffer(this.s_baseVerticesPositionBuffer, newBuffer, rOffset[0] * 3 * 2 * 4, offset, (rOffset[1] - rOffset[0]) * 3 * 2 * 4);
            offset += (rOffset[1] - rOffset[0] + 1) * 3 * 2 * 4;
        }
        GPU.consoleBufferData(newBuffer);
        this.verticesNum = this.verticesNum - sub.length * 3;
        this.pointNum = this.verticesNum / 3;
        this.s_baseVerticesPositionBuffer = newBuffer;
        this.RVrt_coBuffer = GPU.createStorageBuffer(this.verticesNum * (2) * 4, undefined, ["f32","f32","f32","f32","f32","f32"]);
        this.setGroup();
        this.isChange = true;

        this.children.weightReset();
        setParentModifierWeight(this);
    }

    setGroup() {
        this.modifierDataGroup = GPU.createGroup(GPU.getGroupLayout("Csr"), [{item: this.s_baseVerticesPositionBuffer, type: "b"}]);
        this.modifierTransformDataGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr"), [{item: this.s_baseVerticesPositionBuffer, type: "b"}, {item: this.RVrt_coBuffer, type: "b"}]);
        this.adaptAnimationGroup1 = GPU.createGroup(GPU.getGroupLayout("Csrw"), [{item: this.RVrt_coBuffer, type: 'b'}]);
        this.collisionVerticesGroup = GPU.createGroup(GPU.getGroupLayout("Csr"), [{item: this.RVrt_coBuffer, type: 'b'}]);

        this.modifierTransformGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [{item: this.RVrt_coBuffer, type: "b"}, {item: this.parentWeightBuffer, type: "b"}]);

        this.calculateAllBBoxGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [{item: this.BBoxBuffer, type: 'b'}, {item: this.RVrt_coBuffer, type: 'b'}]);
        this.calculateAllBaseBBoxGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [{item: this.baseBBoxBuffer, type: 'b'}, {item: this.s_baseVerticesPositionBuffer, type: 'b'}]);
        this.GUIrenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [{item: this.RVrt_coBuffer, type: 'b'}]);
    }

    async getSaveData() {
        const animationKeyDatas = await this.animationBlock.getSaveData()
        return {
            name: this.name,
            id: this.id,
            type: this.type,
            baseVertices: [...await GPU.getF32BufferData(this.s_baseVerticesPositionBuffer)],
            animationKeyDatas: animationKeyDatas,
        };
    }
}