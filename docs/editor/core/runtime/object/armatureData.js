import { Application } from "../../../app/app.js";
import { mathMat3x3 } from "../../../utils/mathMat.js";
import { managerForDOMs } from "../../../utils/ui/util.js";
import { arrayToSet, createArrayN, loadFile } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { Armature } from "../../objects/armature.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

export class ArmatureData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "boneNum": "boneOffset"});

        // 頂点で表示したとき
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32","f32","f32"], "boneNum");
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32","f32","f32"], "boneNum");

        // ボーンのデータ
        this.baseBone = new BufferManager(this, "baseBone", ["f32","f32","f32","f32","f32","f32"], "boneNum");

        // ボーンの行列データ
        this.renderingBoneMatrix = new BufferManager(this, "renderingBoneMatrix", ["f32","f32","f32","f32","f32","f32","f32","f32","f32"], "boneNum");
        this.baseBoneMatrix = new BufferManager(this, "baseBoneMatrix", ["f32","f32","f32","f32","f32","f32","f32","f32","f32"], "boneNum");

        this.runtimeAnimationData = new BufferManager(this, "runtimeAnimationData", ["f32","f32","f32","f32","f32","f32"], "boneNum");

        this.colors = new BufferManager(this, "colors", ["f32","f32","f32","f32"], "boneNum");
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");
        this.physicsData = new BufferManager(this, "physicsData", [
            "f32", "f32", // x, y
            "f32", // rotate
            "f32", // scaleX
            "f32", // shearX

            "f32", // 慣性
            "f32", // 復元率
            "f32", // 減衰率
            "f32", // 質量の逆数
            "f32", // 風
            "f32", // 重力
            "f32", // どれだけ適応するか
            "f32", // 最大速度

            "u32", // リセット済みか
            "u32", // 更新
            "u32", // 停止

            "f32", "f32",
            "f32", "f32",
            "f32", "f32",
            "f32", "f32",
            "f32", "f32",
            "f32",
            "f32",
            "f32",
            "f32",
        ], "boneNum");

        this.boneHierarchy = [];
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;
        this.calculateVerticesPositionGroup = null;
        this.renderingGizumoGroup = null;

        this.boneBlockByteLength = 6 * 4; // データ一塊のバイト数: f32 * 6
        this.vertexBlockByteLength = 2 * 2 * 4; // 頂点データ一塊のバイト数: f32x2 * 2

        this.colorBlockByteLength = 4 * 4;

        this.propagate = [];
        this.order = [];

        this.offsetCreate();
    }

    async getAnimationData(/** @type {Armature} */ armature, indexs) {
        return ;
    }

    getObjectDataForGPU(/** @type {Armature} */armature) {
        const map = new Map();
        // 行列の更新
        map.set(this.baseBoneMatrix, armature.allBoneWorldMatrix);
        map.set(this.renderingBoneMatrix, null);
        // 頂点の更新
        map.set(this.baseVertices, armature.allVertices);
        map.set(this.renderingVertices, null);
        // その他
        map.set(this.baseBone, armature.allBone);
        map.set(this.physicsData, armature.allPhysics);
        map.set(this.colors, armature.allColors);
        map.set(this.runtimeAnimationData, null);
        this.updatePropagateData();
        return map;
    }

    updatePropagateData() {
        const boneIndexsMap = [];
        const propagateMap = [];
        for (const /** @type {Armature} */armature of this.order) {
            const roop = (bones, depth = 0) => {
                for (const bone of bones) {
                    if (boneIndexsMap.length <= depth) {
                        boneIndexsMap.push([]);
                    }
                    if (propagateMap.length <= depth) {
                        propagateMap.push([]);
                    }
                    boneIndexsMap[depth].push(bone.index + armature.runtimeOffsetData.start.boneOffset);
                    const parent = bone.parentIndex;
                    if (parent != -1) { // 親がいる場合
                        propagateMap[depth].push(bone.index + armature.runtimeOffsetData.start.boneOffset, parent + armature.runtimeOffsetData.start.boneOffset);
                    } else { // ルートボーンの場合
                    }
                    roop(bone.children, depth + 1);
                }
            }
            roop(armature.root);
            console.log(armature);
        }
        this.propagate.length = 0;
        boneIndexsMap.forEach((boneIndexsData, index) => {
            const data = {
                boneNum: boneIndexsData.length,
            };
            const propagateData = propagateMap[index];
            if (propagateData.length) {
                console.log(propagateData);
                const propagateBuffer = GPU.createStorageBuffer(propagateData.length * 4, propagateData, ["u32","u32"]);
                data.propagateBuffer = propagateBuffer;
                data.propagateData = propagateData;
                data.propagateGroup = GPU.createGroup(GPU.getGroupLayout("Csr"), [propagateBuffer]);
            }
            const boneIndexsBuffer = GPU.createStorageBuffer(boneIndexsData.length * 4, boneIndexsData, ["u32"]);
            data.boneIndexsBuffer = boneIndexsBuffer;
            data.boneIndexsData = boneIndexsData;
            data.boneIndexsGroup = GPU.createGroup(GPU.getGroupLayout("Csr"), [boneIndexsBuffer]);
            this.propagate.push(data);
        });
        // console.log(this.propagate);
    }

    // ベースデータの更新
    updateBaseData(/** @type {Armature} */armature) {
        this.update(armature);
    }

    updateAllocationData(/** @type {Armature} */armature) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(armature);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (armature.runtimeOffsetData.start.allocationOffset * 8) * 4);
        GPU.writeBuffer(armature.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {Armature} */armature) {
        return new Uint32Array([armature.runtimeOffsetData.start.boneOffset, 0, 0, armature.boneNum, 0, 0, 0, GPU.padding]);
    }

    updateAllocation(deleteObjects) {
        // const deleteIndexs = [];
        // for (const /** @type {Armature} */ deleteObject of deleteObjects) {
        //     deleteIndexs.push(...range(deleteObject.runtimeOffsetData.start.boneOffset, deleteObject.boneNum));
        // }
        // GPU.deleteIndexsToBuffer(this.baseBone, deleteIndexs, this.boneBlockByteLength);
        let verticesOffset = 0;
        let aniamtionsOffset = 0;
        let animationWeightOffset = 0;
    }

    setGroup() {
        this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingBoneMatrix.buffer, this.baseBone.buffer, this.runtimeAnimationData.buffer, this.allocations.buffer]); // アニメーション用
        this.propagateGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw_Csrw"), [this.renderingBoneMatrix.buffer, this.baseBone.buffer, this.physicsData.buffer]); // 伝播用
        this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingBoneMatrix.buffer, this.baseBoneMatrix.buffer, this.allocations.buffer]); // 子の変形用データ
        this.calculateVerticesPositionGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.renderingBoneMatrix.buffer, this.baseBone.buffer, this.allocations.buffer]);
        this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_VFsr"), [this.renderingVertices.buffer, this.colors.buffer]); // 表示用
        // this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_VFsr"), [this.baseVertices.buffer, this.colors.buffer]); // 表示用
    }
}