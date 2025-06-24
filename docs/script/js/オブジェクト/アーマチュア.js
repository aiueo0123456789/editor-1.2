import { GPU } from "../webGPU.js";
import { Children } from "../子要素.js";
import { createID } from "../UI/制御.js";
import { ObjectBase, sharedDestroy } from "./オブジェクトで共通の処理.js";
import { createArrayN, indexOfSplice } from "../utility.js";
import { Attachments } from "./アタッチメント/attachments.js";
import { app } from "../app.js";
import { KeyframeBlockManager } from "./キーフレームブロック管理.js";

class Color {
    constructor(color = [0,0,0,1]) {
        this.color = color;
        this.colorBuffer = GPU.createUniformBuffer(16, undefined, ["f32"]);
        GPU.writeBuffer(this.colorBuffer, new Float32Array(this.color));
        this.group = GPU.createGroup(GPU.getGroupLayout("Fu"), [this.colorBuffer]);
    }

    setColor(r,g,b,a = 1) {
        this.color = [r,g,b,a];
        GPU.writeBuffer(this.colorBuffer, new Float32Array(this.color));
    }

    getRGB() {
        return this.color.slice(0,3);
    }
}

export class Bone {
    constructor(armature, parent = null, baseHead, baseTail, animations = {blocks: []}) {
        this.type = "ボーン";
        this.name = "名称未設定";
        this.id = createID();
        /** @type {Armature} */
        this.armature = armature;
        // armature.allBone.push(this);
        this.parent = parent;
        if (parent) {
            parent.childrenBone.push(this)
        } else {
            armature.root.push(this);
        }
        this.index = -1;
        armature.appendBone(this);
        /** @type {Bone[]} */
        this.childrenBone = [];
        this.color = [0,0,0,1];
        // this.color = [Math.random(),Math.random(),Math.random(),1];

        this.baseHead = [...baseHead];
        this.baseTail = [...baseTail];

        this.selectedBone = false;
        this.selectedHead = false;
        this.selectedTail = false;

        this.x = 0;
        this.y = 0;
        this.sx = 0;
        this.sy = 0;
        this.r = 0;
        this.keyframeBlockManager = new KeyframeBlockManager(this, ["x","y","sx","sy","r"], animations);

        this.matrix = new Float32Array(4 * 3);
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
            index: this.index,
            parentIndex: this.parent ? this.parent.index : -1,
            baseHead: this.baseHead,
            baseTail: this.baseTail,
            animations: this.keyframeBlockManager.getSaveData(),
            childrenBone: this.childrenBone.map(bone => bone.getSaveData()),
        };
    }
}

export class Armature extends ObjectBase {
    constructor(name, id, data) {
        super(name, "アーマチュア", id);

        this.MAX_BONES = app.appConfig.MAX_BONES_PER_ARMATURE;
        this.vertexBufferOffset = 0;
        this.animationBufferOffset = 0;
        this.weightBufferOffset = 0;
        this.allocationIndex = 0;

        this.BBox = {min: [0,0], max: [0,0]};
        this.BBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);
        this.BBoxRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [this.BBoxBuffer]);

        this.baseBBox = [0,0,0,0];
        this.baseBBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);

        this.boneNum = 0;
        this.baseTransformIsLock = false;

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectMeshData = GPU.createUniformBuffer(2 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);
        this.objectMeshDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectMeshData]);

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

    insertBone(bone, insertIndex) {
        this.allBone.splice(insertIndex, 0, bone);
        this.fixBoneIndex();
    }

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

        app.scene.runtimeData.armatureData.prepare(this);

        const roopChildren = (children, parent = null, depth = 0) => {
            for (const child of children) {
                // const childBone = new Bone(this, child.index, parent, child.baseHead, child.baseTail, child.animations);
                const childBone = new Bone(this, parent, child.baseHead, child.baseTail, child.animations);
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