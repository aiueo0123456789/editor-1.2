import { Attachments } from "./attachments/attachments.js"
import { GPU } from "../../utils/webGPU.js";
import { ObjectBase, sharedDestroy, UnfixedReference } from "../../utils/objects/util.js";
import { indexOfSplice } from "../../utils/utility.js";
import { KeyframeBlockManager } from "./keyframeBlockManager.js";
import { app } from "../../../main.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { mathMat3x3 } from "../../utils/mathMat.js";

export class Armature extends ObjectBase {
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

    static createTransformMatrix(scale, angle, translation) {
        let rx = angle;
        let ry = angle + 1.5708;
        // スケールと回転を組み合わせた行列
        var matrix = mathMat3x3.createMatrix();
        matrix[0] = vec3<f32>(scale.x * cos(rx), scale.x * sin(rx), 0.0);
        matrix[1] = vec3<f32>(scale.y * cos(ry), scale.y * sin(ry), 0.0);
        matrix[2] = vec3<f32>(translation.x, translation.y, 1.0);
    
        return matrix;
    }

    static getBoneData(head, tail, parentHead, parentTail) {
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
                const boneData = Armature.getBoneData(childData.baseHead.co, childData.baseTail.co, parentHead, parentTail);
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