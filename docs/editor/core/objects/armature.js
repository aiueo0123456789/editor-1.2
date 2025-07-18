import { GPU } from "../../../editor/utils/webGPU.js";
import { Children } from "../子要素.js";
import { ObjectBase, sharedDestroy } from "./オブジェクトで共通の処理.js";
import { indexOfSplice } from "../../../editor/utils/utility.js";
import { Attachments } from "./アタッチメント/attachments.js";
import { app } from "../app.js";
import { KeyframeBlockManager } from "./キーフレームブロック管理.js";
import { managerForDOMs } from "../UI/制御.js";

class Vertex {
    constructor(/** @type {Bone} */bone,data) {
        this.bone = bone;
        this.co = data.co;
        this.typeIndex = data.typeIndex;
        this.selected = false;
    }

    setCoordinate(newCoordinate) {
        this.co[0] = newCoordinate[0];
        this.co[1] = newCoordinate[1];
        managerForDOMs.update(this.co)
    }

    get worldIndex() {
        return this.bone.worldIndex * 2 + this.typeIndex;
    }

    get localIndex() {
        return this.bone.localIndex * 2 + this.typeIndex;
    }

    getSaveData() {
        return {
            co: this.co,
        }
    }
}

export class Bone {
    // constructor(armature, index = armature.allBone.length, parent = null, baseHead, baseTail, animations = {blocks: []}) {
    constructor(armature, data) {
        if (!data.index) data.index = armature.allBone.length;
        if (!data.name) data.name = "名称未設定" + data.index;
        this.type = "ボーン";
        this.name = data.name;
        /** @type {Armature} */
        this.armature = armature;
        this.parent = data.parent;
        if (this.parent) {
            this.parent.childrenBone.push(this)
        } else {
            armature.root.push(this);
        }
        this.index = data.index;
        armature.setBone(this);
        /** @type {Bone[]} */
        this.childrenBone = [];
        this.color = [0,0,0,1];
        // this.color = [Math.random(),Math.random(),Math.random(),1];

        // this.baseHead = [...baseHead];
        // this.baseTail = [...baseTail];
        this.baseHead = new Vertex(this, Object.assign({typeIndex: 0}, data.baseHead));
        this.baseTail = new Vertex(this, Object.assign({typeIndex: 1}, data.baseTail));

        this.selectedBone = false;

        this.x = 0;
        this.y = 0;
        this.sx = 0;
        this.sy = 0;
        this.r = 0;
        this.attachments = new Attachments();
        this.keyframeBlockManager = new KeyframeBlockManager(this, ["x","y","sx","sy","r"], data.animations);

        this.matrix = new Float32Array(4 * 3);
    }

    clearAnimatoin() {
        this.x = 0;
        this.y = 0;
        this.sx = 0;
        this.sy = 0;
        this.r = 0;
    }

    get localIndex() {
        return this.armature.allBone.indexOf(this);
    }

    get worldIndex() {
        return this.armature.runtimeOffsetData.boneOffset + this.armature.allBone.indexOf(this);
    }

    async getWorldMatrix() {
        await app.scene.runtimeData.armatureData.getBoneWorldMatrix(this);
    }

    containsParentBone(targetBones) {
        if (!this.parent) return false;
        const looper = (bone) => {
            if (targetBones.includes(bone)) {
                return targetBones.indexOf(bone);
            }
            if (bone.parent) {
                return looper(bone.parent);
            }
            return false;
        }
        return looper(this.parent);
    }

    getSaveData() {
        return {
            name: this.name,
            index: this.index,
            parentIndex: this.parent ? this.parent.index : -1,
            baseHead: this.baseHead.getSaveData(),
            baseTail: this.baseTail.getSaveData(),
            animations: this.keyframeBlockManager.getSaveData(),
            childrenBone: this.childrenBone.map(bone => bone.getSaveData()),
        };
    }
}

export class Armature extends ObjectBase {
    static VERTEX_LEVEL = 2; // 小オブジェクトごとに何個の頂点を持つか
    constructor(name, id, data) {
        super(name, "アーマチュア", id);
        this.runtimeData = app.scene.runtimeData.armatureData;

        this.MAX_BONES = app.appConfig.MAX_BONES_PER_ARMATURE;
        this.animationBufferOffset = 0;
        this.weightBufferOffset = 0;

        this.BBox = {min: [0,0], max: [0,0]};
        this.BBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);
        this.BBoxRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [this.BBoxBuffer]);

        this.baseBBox = [0,0,0,0];
        this.baseBBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);

        this.boneNum = 0;
        this.baseTransformIsLock = false;

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);

        this.children = new Children();
        /** @type {Bone[]} */
        this.root = [];
        /** @type {Bone[]} */
        this.allBone = [];
        this.parent = "";

        this.mode = "オブジェクト";

        this.attachments = new Attachments(this);

        this.init(data);
    }

    clearAnimatoin() {
        this.allBone.forEach(bone => bone.clearAnimatoin())
    }

    get MAX_VERTICES() {
        return this.MAX_BONES * 2;
    }

    get VERTEX_OFFSET() {
        return this.runtimeOffsetData.boneOffset * 2;
    }

    get animationWorldOffset() {
        return this.animationBufferOffset * Armature.VERTEX_LEVEL;
    }

    getBoneIndexFromBoneID(id) {
        for (const bone of this.allBone) {
            if (id = bone.id) {
                return bone;
            }
        }
        return null;
    }

    getSelectBones() {
        return this.allBone.filter(bone => bone.selectedBone);
    }

    fixBoneIndex() {
        for (let i = 0; i < this.allBone.length; i ++) {
            this.allBone[i].index = i;
        }
    }

    // ボーンを削除してindexを返す
    deleteBone(bone) {
        if (bone.parent) {
            indexOfSplice(bone.parent.childrenBone, bone);
        }
        const index = this.allBone.indexOf(bone);
        this.allBone.splice(index, 1);
        this.fixBoneIndex();
        return index;
    }

    // indexを指定してbone追加する
    setBone(bone) {
        if (bone.index > this.allBone.length) {
            this.allBone.length = bone.index;
        }
        this.allBone[bone.index] = bone;
    }

    // boneを追加してindexを再計算する
    appendBone(bone) {
        this.allBone.push(bone);
        this.fixBoneIndex();
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
    }

    init(data) {
        this.verticesNum = data.boneNum * 2;
        this.boneNum = data.boneNum;
        this.propagateBuffers = [];

        // app.scene.runtimeData.armatureData.prepare(this);
        app.scene.runtimeData.append(app.scene.runtimeData.armatureData, this);

        const roopChildren = (children, parent = null, depth = 0) => {
            for (const child of children) {
                const childBone = new Bone(this, Object.assign(child, {parent: parent}));
                roopChildren(child.childrenBone, childBone, depth + 1);
            }
        }
        roopChildren(data.bones);

        app.scene.runtimeData.armatureData.updateBaseData(this);

        this.isInit = true;
        this.isChange = true;
    }

    // ボーンのindexからボーンの行列
    async getBoneMatrixFromIndex(index) {
        return await GPU.getF32BufferPartsData(this.boneMatrixBuffer, index, 4 * 3);
    }
    // indexを指定して行列を書き込み
    setBoneMatrixFromIndex(index,matrix) {
        GPU.writeBuffer(this.boneMatrixBuffer, matrix, (index + 4 * 3) * 4);
    }

    async getSaveData() {
        return {
            name: this.name,
            id: this.id,
            type: this.type,
            // bones: this.allBone.map(bone => bone.getSaveData()),
            bones: this.root.map(bone => bone.getSaveData()),
        };
    }
}