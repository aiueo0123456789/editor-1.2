import { Application } from "../../../app/app.js";
import { GPU } from "../../../utils/webGPU.js";
import { Armature } from "../../objects/armature.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

export class ArmatureData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "bonesNum": "boneOffset"});

        // 頂点で表示したとき
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32","f32","f32"], "bonesNum");
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32","f32","f32"], "bonesNum");

        // ボーンのデータ
        this.baseBone = new BufferManager(this, "baseBone", ["f32","f32","f32","f32","f32","f32"], "bonesNum");

        // ボーンの行列データ
        this.renderingBoneMatrix = new BufferManager(this, "renderingBoneMatrix", ["f32","f32","f32","f32","f32","f32","f32","f32","f32"], "bonesNum");
        this.baseBoneMatrix = new BufferManager(this, "baseBoneMatrix", ["f32","f32","f32","f32","f32","f32","f32","f32","f32"], "bonesNum");

        this.runtimeAnimationData = new BufferManager(this, "runtimeAnimationData", ["f32","f32","f32","f32","f32","f32"], "bonesNum");

        this.colors = new BufferManager(this, "colors", ["f32","f32","f32","f32"], "bonesNum");
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
        ], "bonesNum");

        this.boneHierarchy = [];
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;
        this.calculateVerticesPositionGroup = null;
        this.renderingGizumoGroup = null;

        this.boneBlockByteLength = 6 * 4; // データ一塊のバイト数: f32 * 6

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
            for (const bone of armature.boneMetaDatas) {
                if (boneIndexsMap.length <= bone.depth) {
                    boneIndexsMap.push([]);
                }
                if (propagateMap.length <= bone.depth) {
                    propagateMap.push([]);
                }
                const fixBoneIndex = bone.index + armature.runtimeOffsetData.start.boneOffset;
                boneIndexsMap[bone.depth].push(fixBoneIndex);
                if (bone.parentIndex != -1) { // 親がいる場合
                    propagateMap[bone.depth].push(fixBoneIndex, bone.parentIndex + armature.runtimeOffsetData.start.boneOffset);
                } else { // ルートボーンの場合
                    propagateMap[bone.depth].push(fixBoneIndex, fixBoneIndex);
                }
            }
        }

        this.propagate.length = 0;
        boneIndexsMap.forEach((boneIndexsData, index) => {
            const data = {
                bonesNum: boneIndexsData.length,
            };
            const propagateData = propagateMap[index];
            const propagateBuffer = GPU.createStorageBuffer(propagateData.length * 4, propagateData, ["u32","u32"]);
            data.propagateBuffer = propagateBuffer;
            data.propagateData = propagateData;
            data.propagateGroup = GPU.createGroup(GPU.getGroupLayout("Csr"), [propagateBuffer]);
            this.propagate.push(data);
        });
        // console.log(this.propagate);
    }

    updateAllocationData(/** @type {Armature} */armature) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(armature);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (armature.runtimeOffsetData.start.allocationOffset * 8) * 4);
        GPU.writeBuffer(armature.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {Armature} */armature) {
        return new Uint32Array([armature.runtimeOffsetData.start.boneOffset, 0, 0, armature.bonesNum, 0, 0, 0, GPU.padding]);
    }

    setGroup() {
        this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingBoneMatrix.buffer, this.baseBone.buffer, this.runtimeAnimationData.buffer, this.allocations.buffer]); // アニメーション用
        this.propagateGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw_Csrw"), [this.renderingBoneMatrix.buffer, this.baseBone.buffer, this.physicsData.buffer]); // 伝播用
        this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingBoneMatrix.buffer, this.baseBoneMatrix.buffer, this.allocations.buffer]); // 子の変形用データ
        this.calculateVerticesPositionGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.renderingBoneMatrix.buffer, this.baseBone.buffer, this.allocations.buffer]);
        this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_VFsr"), [this.renderingVertices.buffer, this.colors.buffer]); // 表示用
    }
}