import { Application } from "../../../app/app.js";
import { mathMat3x3 } from "../../../utils/mathMat.js";
import { managerForDOMs } from "../../../utils/ui/util.js";
import { arrayToSet, createArrayN, loadFile } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { Armature, Bone } from "../../objects/armature.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

const selectOnlyVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw")], await loadFile("./editor/shader/compute/select/vertex/selectOnlyVertices.wgsl"));
const circleSelectBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/vertex/selectVertices.wgsl"));
const selectBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/armature/selectBone.wgsl"));
const verticesSelectionToBonesSelectionPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu")], await loadFile("./editor/shader/compute/select/armature/verticesSelectionToBonesSelection.wgsl"));
const boxSelectVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/boxSelectVertices.wgsl"));
const calculateBoneBaseDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu")], await loadFile("./editor/shader/compute/object/bone/calculateBase.wgsl"));

export class ArmatureData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "MAX_BONES": "boneOffset"});

        // 頂点で表示したとき
        // this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32","f32","f32"], "MAX_BONES");
        // this.baseVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32","f32","f32"], "MAX_BONES");

        // ボーンのデータ
        // this.renderingBone = GPU.createBuffer(0, ["s"]); // アニメーション時の親とのローカルデータ
        this.renderingBone = new BufferManager(this, "renderingBone", ["f32","f32","f32","f32","f32","f32"], "MAX_BONES");
        // this.baseBone = GPU.createBuffer(0, ["s"]); // ベース時の親とのローカルデータ
        this.baseBone = new BufferManager(this, "baseBone", ["f32","f32","f32","f32","f32","f32"], "MAX_BONES");

        // this.selectedVertices = GPU.createBuffer(0, ["s"]);
        this.selectedVertices = new BufferManager(this, "selectedVertices", ["bit"], "MAX_BONES * 2");
        // this.selectedBones = GPU.createBuffer(0, ["s"]);
        this.selectedBones = new BufferManager(this, "selectedBones", ["bit"], "MAX_BONES");

        // ボーンの行列データ
        // this.renderingBoneMatrix = GPU.createBuffer(0, ["s"]);
        this.renderingBoneMatrix = new BufferManager(this, "renderingBoneMatrix", ["f32","f32","f32","f32","f32","f32","f32","f32","f32","f32","f32","f32"], "MAX_BONES");
        // this.baseBoneMatrix = GPU.createBuffer(0, ["s"]);
        this.baseBoneMatrix = new BufferManager(this, "baseBoneMatrix", ["f32","f32","f32","f32","f32","f32","f32","f32","f32","f32","f32","f32"], "MAX_BONES");

        // this.runtimeAnimationData = GPU.createBuffer(0, ["s"]);
        this.runtimeAnimationData = new BufferManager(this, "runtimeAnimationData", ["f32","f32","f32","f32","f32","f32"], "MAX_BONES");

        // ボーンの色
        // this.relationships = GPU.createBuffer(0, ["s"]); // 親のindex
        this.relationships = new BufferManager(this, "relationships", ["u32"], "MAX_BONES");
        // this.colors = GPU.createBuffer(0, ["s"]);
        this.colors = new BufferManager(this, "colors", ["f32","f32","f32","f32"], "MAX_BONES");
        // this.allocation = GPU.createBuffer(0, ["s"]);
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;
        this.calculateVerticesPositionGroup = null;
        this.renderingGizumoGroup = null;

        this.boneBlockByteLength = 6 * 4; // データ一塊のバイト数: f32 * 6
        this.matrixBlockByteLength = 4 * 3 * 4; // データ一塊のバイト数: mat3x3<f32> (paddingでmat4x3<f32>になる)
        this.vertexBlockByteLength = 2 * 2 * 4; // 頂点データ一塊のバイト数: vec2<f32> * 2

        this.colorBlockByteLength = 4 * 4;

        this.allBoneNum = 0;

        this.allBone = [];

        this.propagate = [];
        this.order = [];

        this.offsetCreate();
    }

    async getBoneWorldMatrix(/** @type {Bone} */bone) {
        bone.matrix = mathMat3x3.mat4x3ValuesToMat3x3(await GPU.getF32BufferPartsData(this.renderingBoneMatrix.buffer, bone.armature.runtimeOffsetData.boneOffset + bone.index, this.matrixBlockByteLength / 4));
        // bone.matrix = mathMat3x3.mat4x3ValuesToMat3x3(await this.renderingBoneMatrix.getObjectData(bone));
    }

    getSelectBone() {
        return this.allBone.filter(bone => bone && bone.selectedBone);
    }

    async getAnimationData(/** @type {Armature} */ armature, indexs) {
        return ;
    }

    // 選択
    async selectedForVertices(/** @type {Armature} */ armature, object, option) {
        const optionBuffer = GPU.createUniformBuffer((2) * 4, [option.add,2], ["u32"]);
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, armature.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((armature.MAX_BONES * 2) / 32) / 64));
        } else if (option.circle) {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, armature.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil((armature.MAX_BONES * 2) / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const atomicBuffer = GPU.createStorageBuffer((1 + 1) * 4);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw"), [this.selectedVertices.buffer, this.renderingVertices.buffer, armature.objectDataBuffer, optionBuffer, circleBuffer, atomicBuffer]);
            GPU.runComputeShader(selectOnlyVerticesPipeline, [group], Math.ceil(Math.ceil(armature.MAX_BONES * 2 / 32) / 64));
        }
        GPU.runComputeShader(verticesSelectionToBonesSelectionPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu"), [this.selectedBones.buffer,this.selectedVertices.buffer,armature.objectDataBuffer])], Math.ceil(Math.ceil(armature.MAX_BONES / 32) / 64));
        const resultVertices = await GPU.getSelectedFromBufferBit(this.selectedVertices.buffer,armature.runtimeOffsetData.boneOffset * 2,(armature.runtimeOffsetData.boneOffset + armature.boneNum) * 2);
        for (const bone of armature.allBone) {
            bone.baseHead.selected = resultVertices[bone.index * 2];
            bone.baseTail.selected = resultVertices[bone.index * 2 + 1];
        }
        const resultBone = await GPU.getSelectedFromBufferBit(this.selectedBones.buffer,armature.runtimeOffsetData.boneOffset,armature.runtimeOffsetData.boneOffset + armature.boneNum);
        for (const bone of armature.allBone) {
            bone.selectedBone = resultBone[bone.index];
        }
    }

    getSelectVerticesInBone() {
        const result = [];
        for (const bone of this.allBone) {
            if (bone) {
                if (bone.baseHead.selected || bone.baseTail.selected) {
                    result.push(bone);
                }
            }
        }
        return result;
    }

    getSelectVerticesIndex() {
        const result = [];
        for (const bone of this.allBone) {
            if (bone) {
                if (bone.baseHead.selected) {
                    result.push((bone.index + bone.armature.runtimeOffsetData.boneOffset) * 2);
                }
                if (bone.baseTail.selected) {
                    result.push((bone.index + bone.armature.runtimeOffsetData.boneOffset) * 2 + 1);
                }
            }
        }
        return result;
    }

    async selectedForBone(/** @type {Armature} */ armature, object, option) {
        const optionBuffer = GPU.createUniformBuffer(4, [option.add], ["u32"]);
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, armature.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil(armature.MAX_BONES / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedBones.buffer, this.renderingVertices.buffer, armature.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(selectBonePipeline, [group], Math.ceil(Math.ceil(armature.MAX_BONES / 32) / 64));
        }
        const result = await GPU.getSelectedFromBufferBit(this.selectedBones.buffer,armature.runtimeOffsetData.boneOffset,armature.runtimeOffsetData.boneOffset + armature.boneNum);
        for (const bone of armature.allBone) {
            bone.selectedBone = result[bone.index];
        }
        managerForDOMs.update("ボーン選択");
    }

    updatePropagateData() {
        const propagateCPU = [];
        const relationshipsKeep = createArrayN(this.allBoneNum);
        for (const /** @type {Armature} */armature of this.order) {
            const roop = (bones, depth = 0) => {
                for (const /** @type {Bone} */ bone of bones) {
                    const parent = bone.parent;
                    if (parent) { // 親がいる場合
                        if (propagateCPU.length <= depth) {
                            propagateCPU.push([]);
                        }
                        propagateCPU[depth].push(bone.index + armature.runtimeOffsetData.boneOffset, parent.index + armature.runtimeOffsetData.boneOffset);
                        relationshipsKeep[bone.index + armature.runtimeOffsetData.boneOffset] = parent.index + armature.runtimeOffsetData.boneOffset;
                        roop(bone.childrenBone, depth + 1);
                    } else { // ルートボーンの場合
                        relationshipsKeep[bone.index + armature.runtimeOffsetData.boneOffset] = bone.index + armature.runtimeOffsetData.boneOffset;
                        roop(bone.childrenBone, 0);
                    }
                }
            }
            roop(armature.root);
        }
        this.propagate.length = 0;
        for (const data of propagateCPU) {
            const buffer = GPU.createStorageBuffer(data.length * 4, data, ["u32","u32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csr"), [buffer]);
            this.propagate.push({boneNum: data.length / 2, buffer: buffer, group: group, array: data});
        }
        GPU.writeBuffer(this.relationships.buffer, new Uint32Array(relationshipsKeep));
    }

    async updateCPUDataFromGPUBuffer(/** @type {Armature} */armature) {
        const verticesArray = await this.baseVertices.getObjectData(armature);
        for (const bone of armature.allBone) {
            bone.baseHead.setCoordinate(verticesArray[bone.index].slice(0,2));
            bone.baseTail.setCoordinate(verticesArray[bone.index].slice(2,4));
        }
    }

    // ベースデータの更新
    updateBaseData(/** @type {Armature} */armature) {
        console.log("|---ボーンベース---|", armature)
        armature.boneNum = armature.allBone.length;
        armature.verticesNum = armature.boneNum * 2;
        const boneVerticesData = Array(armature.boneNum * this.vertexBlockByteLength / 4).fill(0);
        const colorsData = Array(armature.boneNum * this.colorBlockByteLength / 4).fill(0);

        const parentsData = Array(armature.boneNum).fill(0);
        for (const bone of armature.allBone) {
            if (bone.parent) {
                parentsData[bone.index] = bone.parent.index;
            } else {
                parentsData[bone.index] = bone.index;
            }
            arrayToSet(boneVerticesData, bone.baseHead.co.concat(bone.baseTail.co), bone.index, 4);
            arrayToSet(colorsData, bone.color, bone.index, 4);
        }
        armature.parentsBuffer = GPU.createStorageBuffer(parentsData.length * 4, parentsData, ["u32"]);

        GPU.writeBuffer(this.baseVertices.buffer, new Float32Array(boneVerticesData), armature.runtimeOffsetData.boneOffset * this.vertexBlockByteLength);
        GPU.writeBuffer(this.colors.buffer, new Float32Array(colorsData), armature.runtimeOffsetData.boneOffset * this.colorBlockByteLength);

        for (let i = armature.runtimeOffsetData.boneOffset; i < armature.runtimeOffsetData.boneOffset + armature.MAX_BONES; i ++) {
            this.allBone[i] = null;
        }
        for (const bone of armature.allBone) {
            this.allBone[armature.runtimeOffsetData.boneOffset + bone.index] = bone;
        }

        this.updateAllocationData(armature);
        this.calculateBaseBoneData(armature);
        this.updatePropagateData();
    }

    calculateBaseBoneData(armature) {
        GPU.runComputeShader(calculateBoneBaseDataPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu"), [this.baseBone.buffer, this.baseBoneMatrix.buffer, this.baseVertices.buffer, armature.parentsBuffer, armature.objectDataBuffer])], Math.ceil(armature.boneNum / 64));
    }

    updateAllocationData(/** @type {Armature} */armature) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(armature);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (armature.runtimeOffsetData.allocationOffset * 8) * 4);
        GPU.writeBuffer(armature.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {Armature} */armature) {
        return new Uint32Array([armature.runtimeOffsetData.boneOffset, 0, 0, armature.MAX_BONES, 0, 0, 0, GPU.padding]);
    }

    updateAllocation(deleteObjects) {
        // const deleteIndexs = [];
        // for (const /** @type {Armature} */ deleteObject of deleteObjects) {
        //     deleteIndexs.push(...range(deleteObject.runtimeOffsetData.boneOffset, deleteObject.boneNum));
        // }
        // GPU.deleteIndexsToBuffer(this.baseBone, deleteIndexs, this.boneBlockByteLength);
        let verticesOffset = 0;
        let aniamtionsOffset = 0;
        let animationWeightOffset = 0;
    }

    setGroup() {
        this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingBoneMatrix.buffer, this.baseBone.buffer, this.runtimeAnimationData.buffer, this.allocations.buffer]); // アニメーション用
        this.propagateGroup = GPU.createGroup(GPU.getGroupLayout("Csrw"), [this.renderingBoneMatrix.buffer]); // 伝播用
        this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingBoneMatrix.buffer, this.baseBoneMatrix.buffer, this.allocations.buffer]); // 子の変形用データ
        this.calculateVerticesPositionGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.renderingBoneMatrix.buffer, this.baseBone.buffer, this.allocations.buffer]);
        this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr"), [this.renderingVertices.buffer, this.colors.buffer, this.relationships.buffer, this.selectedVertices.buffer, this.selectedBones.buffer]); // 表示用
    }
}