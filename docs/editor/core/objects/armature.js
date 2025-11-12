import { GPU } from "../../utils/webGPU.js";
import { ObjectBase, sharedDestroy, UnfixedReference } from "../../utils/objects/util.js";
import { KeyframeBlockManager } from "./keyframeBlockManager.js";
import { app } from "../../../main.js";
import { MathVec2 } from "../../utils/mathVec.js";
import { MathMat3x3 } from "../../utils/mathMat.js";
import { copyToArray, createArrayN, createArrayNAndFill, isNumber } from "../../utils/utility.js";

class BoneMetaData {
    constructor(data) {
        this.name = data.name;
        /** @type {BoneMetaData} */
        this.parentIndex = data.parentIndex;
        this.index = data.index;
        this.depth = data.depth;
        this.relations = data.relations;

        /** @type {BoneMetaData[]} */
        this.children = [];
    }

    getSaveData() {
        return {
            name: this.name,
            parentIndex: this.parentIndex,
            index: this.index,
            depth: this.depth,
            children: this.children.map(child => child.index)
        };
    }
}

export class Armature extends ObjectBase {
    static createBoneMetaData(name, index, parentIndex = -1, depth = 0, connected) {
        return new BoneMetaData({name: name, index: index, parentIndex: parentIndex, depth: depth, relations: {connected: connected}});
    }
    static addBoneDataR(a,b) {
        const result = {x:0,y:0,sx:0,sy:0,r:0,l:0};
        for (const key in a) {
            result[key] += a[key];
        }
        for (const key in b) {
            result[key] += b[key];
        }
        return result;
    }
    static addBoneData(t,a,b) {
        const aCopy = this.copyBoneData(a);
        const bCopy = this.copyBoneData(b);
        for (const key in t) {
            t[key] = 0;
        }
        for (const key in aCopy) {
            t[key] += aCopy[key];
        }
        for (const key in bCopy) {
            t[key] += bCopy[key];
        }
    }
    static copyBoneData(a) {
        if (!a.x) a.x = 0;
        if (!a.y) a.y = 0;
        if (!a.sx) a.sx = 0;
        if (!a.sy) a.sy = 0;
        if (!a.r) a.r = 0;
        if (!a.l) a.l = 0;
        return {x: a.x, y: a.y, sx: a.sx, sy: a.sy, r: a.r, l: a.l};
    }
    static getWorldBoneDataByVertices(head, tail) {
        return [head[0], head[1], 1, 1, MathVec2.getAngle(head, tail), MathVec2.distanceR(head, tail)];
    }
    static getLocalBoneDataByVertices(head, tail, parentHead, parentTail) {
        const myMatrix = MathMat3x3.createTransformMatrix([1,1], MathVec2.getAngle(head, tail), head);
        if (parentHead && parentTail) {
            const parentMatrix = MathMat3x3.createTransformMatrix([1,1], MathVec2.getAngle(parentHead, parentTail), parentHead);
            const invMatrix = MathMat3x3.invertMatrix3x3(parentMatrix);
            const localMatrix = MathMat3x3.multiplyMat3x3(myMatrix, invMatrix);
            return {worldMatrix: myMatrix, bone: [localMatrix[2][0], localMatrix[2][1], 1, 1, Math.atan2(localMatrix[0][1], localMatrix[0][0]), MathVec2.distanceR(head, tail)]};
        } else {
            return {worldMatrix: myMatrix, bone: [head[0], head[1], 1, 1, MathVec2.getAngle(head, tail), MathVec2.distanceR(head, tail)]};
        }
    }
    static getMatrixByBoneData(bone) {
        return MathMat3x3.createTransformMatrix([bone.sx,bone.sy], bone.r, [bone.x,bone.y]);
    }
    static getLocalMatrixByWorldMatrixs(world, parentWorld) {
        return MathMat3x3.multiplyMat3x3(world, MathMat3x3.invertMatrix3x3(parentWorld));
    }
    static getBoneDataByMatrix(matrix, l) {
        return [matrix[2][0], matrix[2][1], 1, 1, Math.atan2(matrix[0][1], matrix[0][0]), l];
    }

    constructor(data) {
        super(data.name, "アーマチュア", data.id);
        this.runtimeData = app.scene.runtimeData.armatureData;

        this.baseTransformIsLock = false;

        this.visible = true;

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);

        // ベースローカル行列
        this.allBone = [];
        // ベースワールド行列
        this.allBoneWorldMatrix = [];
        // ボーンの色
        this.allColors = [];
        // 物理演算パラメーター
        this.allPhysics = [];
        // 頂点
        this.allVertices = [];
        // 名前など
        /** @type {BoneMetaData[]} */
        this.boneMetaDatas = [];

        this.allAnimations = [];

        this.mode = "オブジェクト";

        this.changeParent(app.scene.objects.getObjectFromID(data.parent));
        console.log(data);

        // メタデータの作成
        for (const boneMetaData of data.boneMetaDatas) {
            this.boneMetaDatas.push(Armature.createBoneMetaData(boneMetaData.name, boneMetaData.index, boneMetaData.parentIndex, boneMetaData.depth, false));
        }
        copyToArray(this.allBone, data.bones.flat());
        copyToArray(this.allAnimations, createArrayNAndFill(this.allBone.length, 0));
        copyToArray(this.allBoneWorldMatrix, data.worldMatrix.flat());
        copyToArray(this.allColors, data.boneColors.flat());
        copyToArray(this.allPhysics, data.physicsDatas.flat().map(x => Math.abs(x - 0.4) < 0.01 ? 0.2 : x));
        copyToArray(this.allVertices, data.vertices.flat());

        /** @type {KeyframeBlockManager} */
        this.keyframeBlockManager = new KeyframeBlockManager({
            type: "キーフレームブロックマネージャー",
            object: this.allAnimations,
            parameters: createArrayN(this.allAnimations.length),
            keyframeBlocks: createArrayN(this.allAnimations.length).map(x => app.scene.objects.createObjectAndSetUp({type: "キーフレームブロック"}))
        });
        console.log(this)
    }

    get root() {
        return this.boneMetaDatas.filter(boneMetaData => boneMetaData.depth == 0);
    }

    getBoneChildren(bone) {
        return this.boneMetaDatas.filter(boneMetaData => boneMetaData.parentIndex == bone.index);
    }

    resolvePhase() {
        if (this.parent instanceof UnfixedReference) {
            this.changeParent(this.parent.getObject());
        }
        this.keyframeBlockManager.resolvePhase();
    }

    get VERTEX_OFFSET() {
        return this.runtimeOffsetData.start.boneOffset * 2;
    }

    get verticesNum() {
        return this.allVertices.length / 2;
    }
    get bonesNum() {
        return this.allBone.length / 6;
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
    }

    async getSaveData() {
        return {
            name: this.name,
            id: this.id,
            parentIndex: this.parent ? this.parent.id : null,
            type: this.type,
            boneMetaDatas: this.boneMetaDatas.map(bone => bone.getSaveData()),
            bones: await this.runtimeData.baseBone.getObjectData(this),
            worldMatrix: await this.runtimeData.baseBoneMatrix.getObjectData(this),
            physicsDatas: await this.runtimeData.physicsData.getObjectData(this),
            boneColors: await this.runtimeData.colors.getObjectData(this),
            vertices: await this.runtimeData.baseVertices.getObjectData(this),
            keyframeBlockManager: this.keyframeBlockManager.getSaveData(),
        };
    }
}