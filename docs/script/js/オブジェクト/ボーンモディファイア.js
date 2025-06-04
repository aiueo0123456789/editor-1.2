import { device,GPU } from "../webGPU.js";
import { Children } from "../子要素.js";
import { AnimationBlock, BoneAnimation, VerticesAnimation } from "../アニメーション.js";
import { calculateBaseBoneDataPipeline } from "../GPUObject.js";
import { createID } from "../UI/制御.js";
import { ObjectBase, ObjectEditorBase, setBaseBBox, sharedDestroy } from "./オブジェクトで共通の処理.js";
import { Color } from "../エディタ設定.js";
import { createArrayN, createStructArrayN, indexOfSplice } from "../utility.js";
import { Attachments } from "./アタッチメント/attachments.js";
import { app } from "../app.js";

class Bone {
    constructor(armature,index) {
        this.id = createID();
        this.parent = null;
        this.index = index;
        this.children = [];
        this.armature = armature;
        this.color = [0,0,0,1];
    }
}

class Colors {
    constructor(armature) {
        this.armature = armature;
        this.buffer = null;
        this.group = null;
    }

    setColor() {
        this.buffer = GPU.createStorageBuffer(4 * this.armature.boneModifier.boneNum * 4, createArrayN(4 * this.armature.boneModifier.boneNum, [1,0,0,1, 0,1,0,1, 0,0,1,1]), ["f32", "f32", "f32", "f32"]);
        this.group = GPU.createGroup(GPU.getGroupLayout("Vsr"), [this.buffer]);
    }

    changeColor(index, color) {

    }
}

class Group {
    constructor() {
        this.indexs = [];
    }
}

class Editor extends ObjectEditorBase {
    constructor(boneModifier) {
        super();
        this.boneModifier = boneModifier;

        this.boneColor = new Color([Math.random(),Math.random(),Math.random(),1]);
        this.bonesColor = new Colors(this); // ボーンの色

        // this.boneForCPU = new BoneBlock();
        this.allBones = [];
        this.struct = [];
    }

    getPropagateData() {
        const tmpData = [];
        const roop = (children, parent = null, depth = 0) => {
            if (parent) {
                for (const child of children) {
                    if (tmpData.length <= depth) {
                        tmpData.push([child.index, parent.index]);
                    } else {
                        tmpData[depth].push(child.index, parent.index);
                    }
                    roop(child.children, child, depth + 1);
                }
            } else {
                for (const child of children) {
                    roop(child.children, child, 0);
                }
            }
        }
        roop(this.struct);
        return tmpData;
    }

    updatePropagateData() {
        this.boneModifier.propagateBuffers.length = 0;
        const parentsData = Array.from({ length: this.boneModifier.boneNum }, (_, i) => i);
        const tmpData = [];
        const roop = (children, parent = null, depth = 0) => {
            if (parent) {
                for (const child of children) {
                    if (tmpData.length <= depth) {
                        tmpData.push([child.index, parent.index]);
                    } else {
                        tmpData[depth].push(child.index, parent.index);
                    }
                    roop(child.children, child, depth + 1);
                }
            } else {
                for (const child of children) {
                    roop(child.children, child, 0);
                }
            }
        }
        roop(this.struct);
        for (const data of tmpData) {
            const buffer = GPU.createStorageBuffer(data.length * 4, data, ["u32","u32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csr"), [buffer]);
            this.boneModifier.propagateBuffers.push({boneNum: data.length / 2, buffer: buffer, group: group});
            for (let i = 0; i < data.length; i += 2) {
                parentsData[data[i]] = data[i + 1];
            }
        }
        this.boneModifier.parentsBuffer = GPU.createStorageBuffer(parentsData.length * 4, parentsData, ["u32"]);
        this.boneModifier.relationshipRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.boneModifier.RVrt_coBuffer, this.boneModifier.parentsBuffer]);
    }

    destroy() {
        this.boneModifier = null;
    }

    getSaveData() {
        console.log("だおjうぃd")
        return {
            boneColor: this.boneColor.color
        }
    }

    setSaveData(data) {
        this.boneColor.setColor(...data.boneColor);
    }

    // ボーンの親ボーンを探す
    getBoneParentIndex(boneIndex) {
        for (const bone of this.allBones) {
            if (bone.index == boneIndex) {
                if (bone.parent) {
                    return bone.parent.index;
                } else {
                    return -1;
                }
            }
        }
        return null;
    }

    changeBoneParent(parent, bone) {
        if (bone.parent) {
            indexOfSplice(bone.parent.children, bone); // 親要素から削除
        } else {
            indexOfSplice(this.struct, bone); // 親要素から削除
        }
        bone.parent = parent; // 親要素の参照を切り替える
        if (parent) {
            parent.children.push(bone); // 親要素に自分を子要素として追加
        } else {
            this.struct.push(bone); // 親要素に自分を子要素として追加
        }
    }

    setBoneParent(parent, bone) {
        bone.parent = parent; // 親要素の参照を切り替える
        if (parent) {
            parent.children.push(bone); // 親要素に自分を子要素として追加
        } else {
            this.struct.push(bone); // 親要素に自分を子要素として追加
        }
    }

    calculateDepth(bone) {
        // for () {

        // }
    }

    deleteBone(bone) {
        if (bone.parent) {
            indexOfSplice(bone.parent.children, bone); // 親要素から削除
        } else {
            indexOfSplice(this.struct, bone); // 親要素から削除
        }
        for (const child of bone.children) {
            this.setBoneParent(bone.parent, child);
        }
        indexOfSplice(this.allBones, bone);
        // 削除でずれたindexを調整
        for (const bone_ of this.allBones) {
            if (bone.index < bone_.index) {
                bone_.index --;
            }
        }
    }

    getBoneFromIndex(index) {
        for (const bone of this.allBones) {
            if (bone.index == index) return bone;
        }
        return null;
    }

    deleteBoneFormIndex(index) {
        this.deleteBone(this.getBoneFromIndex(index));
    }

    appendBone(parent) {
        const bone = new Bone(this.boneModifier,this.allBones.length);
        this.allBones.push(bone);
        this.setBoneParent(parent, bone);
        return bone;
    }

    getBoneDepthFromIndex(index) {
        let bone = this.getBoneFromIndex(index);
        let depth = 0;
        while (bone.parent) {
            bone = bone.parent;
            depth ++;
        }

        return depth;
    }

    setBoneData(boneData) {
        this.allBones.length = 0;
        this.struct.length = 0;
        const roopChildren = (children, parent = null, depth = 0) => {
            for (const child of children) {
                const childBone = new Bone(this.boneModifier, child.index);
                this.allBones.push(childBone);
                this.setBoneParent(parent,childBone);
                roopChildren(child.children, childBone, depth + 1);
            }
        }
        roopChildren(boneData);
        this.bonesColor.setColor();
    }
}

export class BoneModifier extends ObjectBase {
    constructor(name, id, data) {
        super(name, "ボーンモディファイア", id);

        this.MAX_BONES = app.appConfig.MAX_VERTICES_PER_BONEMODIFIER;
        this.MAX_ANIMATIONS = app.appConfig.MAX_ANIMATIONS_PER_BONEMODIFIER;
        this.vertexBufferOffset = 0;
        this.animationBufferOffset = 0;
        this.weightBufferOffset = 0;
        this.allocationIndex = 0;

        this.baseBoneBuffer = null;
        this.baseBoneMatrixBuffer = null;
        this.boneMatrixBuffer = null;
        this.boneBuffer = null;
        this.animationBlock = new AnimationBlock(this, BoneAnimation);
        this.modifierDataGroup = null;
        this.modifierTransformDataGroup = null;
        this.adaptAnimationGroup1 = null;
        this.parentWeightBuffer = null;

        this.flatRelationshipBuffer = null;

        this.calculateAllBBoxGroup = null;
        this.GUIrenderGroup = null;

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
        this.editor = new Editor(this);
        this.parent = "";

        this.mode = "オブジェクト";

        this.attachments = new Attachments(this);
        this.relationship = null;

        this.init(data);
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
    }

    init(data) {
        this.verticesNum = data.baseVertices.length / 2;
        this.boneNum = this.verticesNum / 2;
        this.propagateBuffers = [];

        this.animationBlock.setSaveData(data.animationKeyDatas);

        this.parentWeightBuffer = GPU.createStorageBuffer(4, undefined, ['f32']);

        this.s_baseVerticesPositionBuffer = GPU.createStorageBuffer(this.verticesNum * (2) * 4, data.baseVertices, ["f32","f32","f32","f32"]);
        this.RVrt_coBuffer = GPU.createStorageBuffer(this.verticesNum * (2) * 4, undefined, ["f32","f32","f32","f32"]);

        this.baseBoneBuffer = GPU.createStorageBuffer(this.boneNum * (6) * 4, undefined, ["f32","f32"]);
        this.boneBuffer = GPU.createStorageBuffer(this.boneNum * (6) * 4, undefined, ["f32","f32"]);
        this.baseBoneMatrixBuffer = GPU.createStorageBuffer(this.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]); // ベース行列
        this.boneMatrixBuffer = GPU.createStorageBuffer(this.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]); // ポーズ行列

        this.editor.setSaveData(data.editor);
        this.editor.setBoneData(data.relationship);
        this.editor.updatePropagateData();

        this.relationship = data.relationship;

        app.scene.gpuData.boneModifierData.prepare(this);
        app.scene.gpuData.boneModifierData.setBase(this, data.baseVertices, data.relationship, createStructArrayN(this.boneNum, [1,1,0,1]));
        data.animationKeyDatas.forEach((keyData,index) => {
            const animationData = keyData.transformData.transformData;
            app.scene.gpuData.boneModifierData.setAnimationData(this, animationData, index);
        })
        // this.updatePropagateDataForGPU();

        this.isInit = true;
        this.isChange = true;

        this.calculateBaseBoneData();
        this.setGroup();
        setBaseBBox(this);
    }

    // ボーンのindexからボーンの行列
    async getBoneMatrixFromIndex(index) {
        return await GPU.getF32BufferPartsData(this.boneMatrixBuffer, index, 4 * 3);
    }
    // indexを指定して行列を書き込み
    setBoneMatrixFromIndex(index,matrix) {
        GPU.writeBuffer(this.boneMatrixBuffer, matrix, (index + 4 * 3) * 4);
    }

    calculateBaseBoneData() {
        GPU.runComputeShader(calculateBaseBoneDataPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw_Csr_Csr"), [this.baseBoneBuffer, this.baseBoneMatrixBuffer, this.s_baseVerticesPositionBuffer, this.parentsBuffer])], Math.ceil(this.boneNum / 64));
    }

    // updatePropagateDataForGPU() {
    //     this.propagateBuffers.length = 0;
    //     const parentsData = Array.from({ length: this.boneNum }, (_, i) => i);
    //     for (const data of this.propagateDatas) {
    //         const buffer = GPU.createStorageBuffer(data.length * 4, data, ["u32","u32"]);
    //         const group = GPU.createGroup(GPU.getGroupLayout("Csr"), [buffer]);
    //         this.propagateBuffers.push({boneNum: data.length / 2, buffer: buffer, group: group});
    //         for (let i = 0; i < data.length; i += 2) {
    //             parentsData[data[i]] = data[i + 1];
    //         }
    //     }
    //     console.log(parentsData)
    //     this.parentsBuffer = GPU.createStorageBuffer(parentsData.length * 4, parentsData, ["u32"]);
    //     this.relationshipRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.RVrt_coBuffer, this.parentsBuffer]);
    // }

    setGroup() {
        this.calculateBoneVerticesGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.RVrt_coBuffer, this.boneMatrixBuffer, this.boneBuffer]);
        this.calculateLocalMatrixGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [this.boneMatrixBuffer, this.boneBuffer]);
        this.boneMatrixBufferGroup = GPU.createGroup(GPU.getGroupLayout("Csrw"), [this.boneMatrixBuffer]);
        this.modifierDataGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Cu"), [this.s_baseVerticesPositionBuffer, GPU.createUniformBuffer(4, [20], ["f32"])]);
        this.modifierTransformDataGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr"), [this.baseBoneMatrixBuffer, this.boneMatrixBuffer]);
        this.adaptAnimationGroup1 = GPU.createGroup(GPU.getGroupLayout("Csrw"), [this.boneBuffer]);
        this.collisionVerticesGroup = GPU.createGroup(GPU.getGroupLayout("Csr"), [this.RVrt_coBuffer]);
        this.collisionBoneGroup = GPU.createGroup(GPU.getGroupLayout("Csr"), [this.RVrt_coBuffer]);

        this.modifierTransformGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [this.boneBuffer, this.parentWeightBuffer]);

        this.calculateAllBBoxGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [this.BBoxBuffer, this.RVrt_coBuffer]);
        this.calculateAllBaseBBoxGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [this.baseBBoxBuffer, this.s_baseVerticesPositionBuffer]);
        this.GUIrenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [this.RVrt_coBuffer]);
    }

    async getSaveData() {
        const animationKeyDatas = await this.animationBlock.getSaveData()

        const relationship = [{
            parent: 0,
            children: [],
        }];
        const propagateDatas = this.editor.getPropagateData();
        let parentsOfDepthNow = new Map();
        parentsOfDepthNow.set(0, relationship[0].children)
        for (let depth = 0; depth < propagateDatas.length; depth ++) {
            const nowDepthData = propagateDatas[depth];
            for (let i = 0; i < nowDepthData.length; i += 2) {
                const myBoneIndex = nowDepthData[i];
                const parentBoneIndex = nowDepthData[i + 1];
                const myData = {
                    parent: myBoneIndex,
                    children: [],
                };
                parentsOfDepthNow.set(myBoneIndex, myData.children);
                parentsOfDepthNow.get(parentBoneIndex).push(myData);
            }
        }
        console.log(relationship);
        return {
            name: this.name,
            id: this.id,
            type: this.type,
            baseVertices: [...await GPU.getF32BufferData(this.s_baseVerticesPositionBuffer)],
            relationship: relationship,
            animationKeyDatas: animationKeyDatas,
            editor: this.editor.getSaveData(),
        };
    }
}