import { Attachments } from "./attachments/attachments.js"
import { GPU } from "../../utils/webGPU.js";
import { ObjectBase, sharedDestroy, UnfixedReference } from "../../utils/objects/util.js";
import { indexOfSplice, range } from "../../utils/utility.js";
import { KeyframeBlockManager } from "./keyframeBlockManager.js";
import { app } from "../../../main.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { mathMat3x3 } from "../../utils/mathMat.js";

export class Armature extends ObjectBase {
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
        return [head[0], head[1], 1, 1, mathVec2.getAngle(head, tail), mathVec2.distanceR(head, tail)];
    }

    static getLocalBoneDataByVertices(head, tail, parentHead, parentTail) {
        const myMatrix = mathMat3x3.createTransformMatrix([1,1], mathVec2.getAngle(head, tail), head);
        if (parentHead && parentTail) {
            const parentMatrix = mathMat3x3.createTransformMatrix([1,1], mathVec2.getAngle(parentHead, parentTail), parentHead);
            const invMatrix = mathMat3x3.invertMatrix3x3(parentMatrix);
            const localMatrix = mathMat3x3.multiplyMat3x3(myMatrix, invMatrix);
            return {worldMatrix: myMatrix, bone: [localMatrix[2][0], localMatrix[2][1], 1, 1, Math.atan2(localMatrix[0][1], localMatrix[0][0]), mathVec2.distanceR(head, tail)]};
        } else {
            return {worldMatrix: myMatrix, bone: [head[0], head[1], 1, 1, mathVec2.getAngle(head, tail), mathVec2.distanceR(head, tail)]};
        }
    }

    static getWorldMatrixByBoneData(bone) {
        return mathMat3x3.createTransformMatrix([bone.sx,bone.sy], bone.r, [bone.x,bone.y]);
    }

    static getLocalMatrixByWorldMatrix(world, parentWorld) {
        return mathMat3x3.multiplyMat3x3(world, mathMat3x3.invertMatrix3x3(parentWorld));
    }

    static getBoneDataByMatrix(matrix, l) {
        return [matrix[2][0], matrix[2][1], 1, 1, Math.atan2(matrix[0][1], matrix[0][0]), l];
    }

    static VERTEX_LEVEL = 2; // 小オブジェクトごとに何個の頂点を持つか
    constructor(data) {
        super(data.name, "アーマチュア", data.id);
        this.runtimeData = app.scene.runtimeData.armatureData;

        this.baseTransformIsLock = false;

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);

        this.root = [];
        this.allBone = [];
        this.allBoneWorldMatrix = [];
        // 物理演算パラメーター
        this.allPhysics = [];
        // 頂点
        this.allVertices = [];
        this.allColors = [];

        this.allAnimations = [];
        /** @type {KeyframeBlockManager} */
        this.keyframeBlockManager = app.scene.objects.createObjectAndSetUp({type: "キーフレームブロックマネージャー", object: this.allAnimations, parameters: range(0, this.allAnimations.length)});

        this.mode = "オブジェクト";

        this.init(data);
    }

    resolvePhase() {
        if (this.parent instanceof UnfixedReference) {
            this.changeParent(this.parent.getObject());
        }
    }

    get VERTEX_OFFSET() {
        return this.runtimeOffsetData.start.boneOffset * 2;
    }

    get animationWorldOffset() {
        return this.animationBufferOffset * Armature.VERTEX_LEVEL;
    }

    get verticesNum() {
        return this.allVertices.length / 2;
    }
    get boneNum() {
        return this.allBone.length / 6;
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
        const loopChildren = (children, parent, parentHead = null, parentTail = null, parentIndex = -1) => {
            for (const childData of children) {
                const myIndex = this.boneNum;
                const bone = {index: myIndex, parentIndex: parentIndex, children: []};
                parent.push(bone);

                this.allVertices.push(...childData.baseHead.co);
                this.allVertices.push(...childData.baseTail.co);
                this.allColors.push(...childData.color);
                const physicsData = childData.attachments.list[0];
                this.allPhysics.push(physicsData.x, physicsData.y, physicsData.rotate, physicsData.scaleX, physicsData.shearX, physicsData.inertia, physicsData.strength, physicsData.damping, physicsData.mass, physicsData.wind, physicsData.gravity, physicsData.mix, physicsData.limit, 0, 1, 0,
                    0, 0,
                    0, 0,
                    0, 0,
                    0, 0,
                    0, 0,
                    0,
                    0,
                    0,
                    0,
                );
                this.allAnimations.push(0,0,0,0,0,0); // x y sx sy r l
                for (let i = 0; i < 6; i ++) {
                    this.keyframeBlockManager.appendParameter(i + this.allAnimations.length - 6);
                }
                const boneData = Armature.getLocalBoneDataByVertices(childData.baseHead.co, childData.baseTail.co, parentHead, parentTail);
                this.allBone.push(...boneData.bone);
                this.allBoneWorldMatrix.push(...boneData.worldMatrix.flat());
                loopChildren(childData.childrenBone, bone.children, childData.baseHead.co, childData.baseTail.co, myIndex);
            }
        }
        loopChildren(data.bones, this.root);
        console.log(this)

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