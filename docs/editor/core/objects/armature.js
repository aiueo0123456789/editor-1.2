import { Attachments } from "./attachments/attachments.js";
import { GPU } from "../../utils/webGPU.js";
import { Children } from "../../utils/objects/children.js";
import { ObjectBase, sharedDestroy, UnfixedReference } from "../../utils/objects/util.js";
import { indexOfSplice } from "../../utils/utility.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { KeyframeBlockManager } from "./keyframeBlockManager.js";
import { app } from "../../../main.js";

class Vertex {
    constructor(/** @type {Bone} */bone,data) {
        this.bone = bone;
        this.co = [...data.co];
        this.typeIndex = data.typeIndex;
        this.selected = false;
    }

    setCoordinate(newCoordinate) {
        this.co[0] = newCoordinate[0];
        this.co[1] = newCoordinate[1];
        managerForDOMs.update(this.co);
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
        armature.allBone.push(this);
        /** @type {Bone[]} */
        this.childrenBone = [];
        this.color = data.color ? data.color : [0,0,0,1];

        this.baseHead = new Vertex(this, Object.assign({typeIndex: 0}, data.baseHead));
        this.baseTail = new Vertex(this, Object.assign({typeIndex: 1}, data.baseTail));

        this.selected = false;

        this.x = 0;
        this.y = 0;
        this.sx = 0;
        this.sy = 0;
        this.r = 0;
        this.attachments = new Attachments(Object.assign({bone: this}, data.attachments));
        this.keyframeBlockManager = new KeyframeBlockManager(this, ["x","y","sx","sy","r"], data.animations);

        this.matrix = new Float32Array(4 * 3);

        managerForDOMs.set({o: this, i: "color"}, null, () => {
            app.scene.runtimeData.armatureData.updateBaseData(this.armature);
        });
    }

    clearAnimatoin() {
        this.keyframeBlockManager.clearAnimatoin();
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
            index: this.localIndex,
            parentIndex: this.parent ? this.parent.localIndex : -1,
            color: this.color,
            baseHead: this.baseHead.getSaveData(),
            baseTail: this.baseTail.getSaveData(),
            animations: this.keyframeBlockManager.getSaveData(),
            childrenBone: this.childrenBone.map(bone => bone.getSaveData()),
            attachments: this.attachments.getSaveData(),
        };
    }
}

export class Armature extends ObjectBase {
    static VERTEX_LEVEL = 2; // 小オブジェクトごとに何個の頂点を持つか
    constructor(data) {
        super(data.name, "アーマチュア", data.id);
        this.runtimeData = app.scene.runtimeData.armatureData;

        this.MAX_BONES = app.appConfig.MAX_BONES_PER_ARMATURE;

        this.baseTransformIsLock = false;

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);

        /** @type {Bone[]} */
        this.root = [];
        /** @type {Bone[]} */
        this.allBone = [];

        this.mode = "オブジェクト";

        this.init(data);
    }

    resolvePhase() {
        if (this.parent instanceof UnfixedReference) {
            this.changeParent(this.parent.getObject());
        }
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

    get verticesNum() {
        return this.allBone.length * 2;
    }
    get boneNum() {
        return this.allBone.length;
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
        return this.allBone.filter(bone => bone.selected);
    }

    // ボーンを削除してindexを返す
    deleteBone(bone) {
        if (bone.parent) {
            indexOfSplice(bone.parent.childrenBone, bone);
        }
        const index = this.allBone.indexOf(bone);
        this.allBone.splice(index, 1);
        return index;
    }

    // boneを追加してindexを再計算する
    appendBone(bone) {
        this.allBone.push(bone);
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
    }

    init(data) {
        this.changeParent(app.scene.objects.getObjectFromID(data.parent));
        this.propagateBuffers = [];

        const roopChildren = (children, parent = null, depth = 0) => {
            for (const child of children) {
                const childBone = new Bone(this, Object.assign(child, {parent: parent}));
                roopChildren(child.childrenBone, childBone, depth + 1);
            }
        }
        roopChildren(data.bones);

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
            parent: this.parent ? this.parent.id : null,
            type: this.type,
            // bones: this.allBone.map(bone => bone.getSaveData()),
            bones: this.root.map(bone => bone.getSaveData()),
        };
    }
}