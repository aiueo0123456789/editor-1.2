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
    constructor(armature, index = armature.allBone.length, parent = null, baseHead, baseTail, animations = []) {
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
        this.index = index;
        armature.insertBone(this);
        console.log(armature.allBone);
        this.childrenBone = [];
        this.color = [0,0,0,1];

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
        this.keyframeBlockManager = new KeyframeBlockManager(this, ["x","y","sx","sy","r"]);
        this.keyframeBlockManager.setSaveData(animations);

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
        };
    }
}

class Colors {
    constructor(armature) {
        this.armature = armature;
        this.buffer = null;
        this.group = null;
    }

    setColor() {
        this.buffer = GPU.createStorageBuffer(4 * this.armature.armature.boneNum * 4, createArrayN(4 * this.armature.armature.boneNum, [1,0,0,1, 0,1,0,1, 0,0,1,1]), ["f32", "f32", "f32", "f32"]);
        this.group = GPU.createGroup(GPU.getGroupLayout("Vsr"), [this.buffer]);
    }

    changeColor(index, color) {

    }
}

export class Armature extends ObjectBase {
    constructor(name, id, data) {
        super(name, "アーマチュア", id);

        this.MAX_BONES = app.appConfig.MAX_VERTICES_PER_BONEMODIFIER;
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
        this.relationship = null;

        this.init(data);
    }

    fixBoneIndex() {
        for (let i = 0; i < this.allBone.length; i ++) {
            this.allBone[i].index = i;
        }
    }

    deleteBone(bone) {
        if (bone.parent) {
            indexOfSplice(bone.parent.childrenBone, bone);
        }
        indexOfSplice(this.allBone, bone);
        this.fixBoneIndex();
    }

    insertBone(bone, indexFix = false) {
        for (let i = 0; i < this.allBone.length; i ++) {
            const bone_ = this.allBone[i];
            if (bone_.index > bone.index) {
                this.allBone.splice(i, 0, bone);
                if (indexFix) {
                    this.fixBoneIndex();
                }
                return ;
            }
        }
        this.allBone.push(bone);
        if (indexFix) {
            this.fixBoneIndex();
        }
    }

    appendBone(bone) {
        this.allBone.push(bone);
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
    }

    init(data) {
        this.verticesNum = data.boneNum * 2;
        this.boneNum = data.boneNum;
        this.propagateBuffers = [];

        this.relationship = data.relationship;
        app.scene.runtimeData.armatureData.prepare(this);

        const roopChildren = (children, parent = null, depth = 0) => {
            for (const child of children) {
                // const childBone = new Bone(this, child.index, parent, child.baseHead, child.baseTail, child.animations);
                const childBone = new Bone(this, undefined, parent, child.baseHead, child.baseTail, child.animations);
                roopChildren(child.children, childBone, depth + 1);
            }
        }
        roopChildren(this.relationship);

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
        // const relationship = [{
        //     parent: 0,
        //     children: [],
        // }];
        // // const propagateDatas = this.editor.getPropagateData();
        // let parentsOfDepthNow = new Map();
        // parentsOfDepthNow.set(0, relationship[0].children)
        // for (let depth = 0; depth < propagateDatas.length; depth ++) {
        //     const nowDepthData = propagateDatas[depth];
        //     for (let i = 0; i < nowDepthData.length; i += 2) {
        //         const myBoneIndex = nowDepthData[i];
        //         const parentBoneIndex = nowDepthData[i + 1];
        //         const myData = {
        //             parent: myBoneIndex,
        //             children: [],
        //         };
        //         parentsOfDepthNow.set(myBoneIndex, myData.children);
        //         parentsOfDepthNow.get(parentBoneIndex).push(myData);
        //     }
        // }
        // console.log(relationship);
        return {
            name: this.name,
            id: this.id,
            type: this.type,
            bones: this.allBone.map(bone => bone.getSaveData()),
        };
    }
}