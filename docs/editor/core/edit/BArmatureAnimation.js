import { app } from "../../../main.js";
import { mathMat3x3 } from "../../utils/mathMat.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { range, roundUp } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";
import { Armature } from "../objects/armature.js";
import { BKeyframeBlockManager } from "./BKeyframeBlockManager.js";

class Bone {
    constructor(data) {
        this.name = data.name;
        /** @type {Bone} */
        this.parent = data.parent;

        this.selected = false;
        this.physics = data.physics;

        this.color = data.color;

        this.baseWorldBoneData = {x: data.base[0], y: data.base[1], sx: data.base[2], sy: data.base[3], r: data.base[4], l: data.base[5]};
        this.baseWorldMatrix = Armature.getWorldMatrixByBoneData(this.baseWorldBoneData);
        if (this.parent) {
            this.baseLocalMatrix = Armature.getLocalMatrixByWorldMatrix(this.baseWorldMatrix, this.parent.baseWorldMatrix);
        } else {
            this.baseLocalMatrix = Armature.getLocalMatrixByWorldMatrix(this.baseWorldMatrix, mathMat3x3.createMatrix());
        }
        const baseLocalArray = Armature.getBoneDataByMatrix(this.baseLocalMatrix, this.baseWorldBoneData.l);
        this.baseLocalBoneData = {x: baseLocalArray[0], y: baseLocalArray[1], sx: baseLocalArray[2], sy: baseLocalArray[3], r: baseLocalArray[4], l: baseLocalArray[5]};
        this.animationLocalBoneData = {x: 0, y: 0, sx: 0, sy: 0, r: 0, l: 0};
        this.keyframeBlockManager = new BKeyframeBlockManager({object: this.animationLocalBoneData, parameters: ["x", "y", "sx", "sy", "r", "l"], blocks: data.animation.blocks});
    }

    get polygon() {
        const size = 0.04;
        const ratio = 0.1;

        let position1 = this.headVertex;
        let position2 = this.tailVertex;
        let sub = mathVec2.subR(position2, position1);
        let normal = mathVec2.normalizeR([-sub[0], sub[1]]); // 仮の法線
        let sectionPosition = mathVec2.mixR(position1, position2, ratio);

        let k = mathVec2.scaleR(normal, size * mathVec2.lengthR(sub));
        const result = [];
        result.push(position1);
        result.push(mathVec2.subR(sectionPosition, k));
        result.push(mathVec2.addR(sectionPosition, k));
        result.push(position2);
        return result;
    }

    get poseWorldBoneData() {
        return Armature.getBoneDataByMatrix(this.poseWorldMatrix, this.baseLocalBoneData.l);
    }

    get poseLocalBoneData() {
        return Armature.addBoneDataR(this.baseLocalBoneData, this.animationLocalBoneData);
    }

    get headVertex() {
        return this.poseWorldMatrix[2].slice(0,2);
    }
    get tailVertex() {
        return mathVec2.addR(this.poseWorldMatrix[2].slice(0,2), mathVec2.scaleR(this.poseWorldMatrix[0].slice(0,2), this.baseWorldBoneData.l));
    }

    get poseLocalMatrix() {
        return Armature.getWorldMatrixByBoneData(this.poseLocalBoneData);
    }
    get poseWorldMatrix() {
        if (this.parent) {
            return mathMat3x3.multiplyMat3x3(this.poseLocalMatrix, this.parent.poseWorldMatrix);
        } else { // 親がない場合
            return mathMat3x3.multiplyMat3x3(this.poseLocalMatrix, mathMat3x3.createMatrix());
        }
    }
}

export class BArmatureAnimation {
    constructor() {
        /** @type {Armature} */
        this.object = null;
        /** @type {Bone[]} */
        this.bones = [];
        this.meshRenderingGroup = null;
    }

    get id() {
        return this.object.id;
    }

    get selectedBones() {
        return this.bones.filter(bone => bone.selected);
    }

    get verticesSelectData() {
        return this.vertices.map(vertex => vertex.selected);
    }

    get vertices() {
        return this.bones.map(bone => [bone.headVertex, bone.tailVertex]).flat();
    }

    getBoneIndex(bone) {
        return this.bones.indexOf(bone);
    }

    getBoneChildren(parent) {
        return this.bones.filter(bone => bone.parent == parent);
    }

    selectedClear() {
        this.bones.forEach(bone => {
            bone.selected = false;
            GPU.writeBuffer(this.boneSelectedBuffer, GPU.createBitData([0], ["u32"]), this.getBoneIndex(bone) * 4);
        });
        managerForDOMs.update({o: "ボーン選択"});
        // this.updateGPUData();
    }

    select(/** @type {Array} */ indexs) {
        indexs.forEach(index => {
            this.bones[index].selected = true;
            GPU.writeBuffer(this.boneSelectedBuffer, GPU.createBitData([1], ["u32"]), index * 4);
        });
        managerForDOMs.update({o: "ボーン選択"});
        // this.updateGPUData();
    }

    get bonesPolygons() {
        return this.bones.map(bone => bone.polygon);
    }

    get selectedVertices() {
        return this.vertices.filter(vert => vert.selected);
    }

    get verticesNum() {
        return this.vertices.length;
    }

    get bonesNum() {
        return this.bones.length;
    }

    get verticesCoordinates() {
        return this.vertices.map(vertex => vertex);
    }
    get selectedVerticesCoordinates() {
        return this.selectedVertices.map(vertex => vertex.co);
    }

    updateGPUData() {
        this.verticesBuffer = GPU.createStorageBuffer(roundUp(this.verticesCoordinates.length * 2 * 4, 2 * 4), this.verticesCoordinates.map(vertex => vertex).flat(), ["f32", "f32"]);
        this.boneColorsBuffer = GPU.createStorageBuffer(roundUp(this.bones.length * 4 * 4, 4 * 4), this.bones.map(bone => bone.color).flat(), ["f32", "f32", "f32", "f32"]);
        this.boneSelectedBuffer = GPU.createStorageBuffer(roundUp(this.bones.length * 4 * 4, 4 * 4), this.bones.map(bone => bone.selected ? 1 : 0).flat(), ["u32"]);
        this.renderingGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_VFsr_Vsr"), [this.verticesBuffer, this.boneColorsBuffer, this.boneSelectedBuffer]);
    }

    get root() {
        return this.bones.filter(bone => bone.parent == null);
    }

    async fromArmature(/** @type {Armature} */ object) {
        const armatureData = app.scene.runtimeData.armatureData;
        this.object = object;
        const [coordinate, colors, physics] = await Promise.all([
            armatureData.baseVertices.getObjectData(object),
            armatureData.colors.getObjectData(object),
            armatureData.physicsData.getObjectData(object),
        ]);
        const createBones = (children, parent) => {
            for (const childData of children) {
                const boneIndex = childData.index;
                const bone = new Bone({
                    name: "a" + boneIndex,
                    parent: parent,
                    base: Armature.getWorldBoneDataByVertices(coordinate[boneIndex].slice(0,2), coordinate[boneIndex].slice(2,4)),
                    color: colors[boneIndex],
                    physics: physics[boneIndex].slice(0, 13),
                    animation: {
                        blocks: object.keyframeBlockManager.blocks.slice(boneIndex * 6, boneIndex * 6 + 6)
                    }
                });
                this.bones[boneIndex] = bone;
                createBones(childData.children, bone);
            }
        }
        createBones(object.root, null);
        console.log(this)
        this.updateGPUData();
        console.log(await armatureData.baseBone.getObjectData(object));
        console.log(await armatureData.baseBoneMatrix.getObjectData(object));
        console.log(await armatureData.renderingBoneMatrix.getObjectData(object));
    }

    toRutime() {
        const keyframeBlocks = [];
        for (const bone of this.bones) {
            keyframeBlocks.push(...bone.keyframeBlockManager.blocks); // x y sx sy r l
        }
        this.object.keyframeBlockManager.setKeyframeBlocks(range(0, keyframeBlocks.length), keyframeBlocks);
        const armatureData = app.scene.runtimeData.armatureData;
        armatureData.update(this.object);
    }
}