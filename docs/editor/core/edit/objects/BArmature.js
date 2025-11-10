import { app } from "../../../../main.js";
import { createArrayNAndFill, roundUp } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { Armature } from "../../objects/armature.js";

class Vert {
    constructor(data) {
        this.co = [...data.co];
        this.typeIndex = data.typeIndex;
        this.selected = false;
    }
}

class Bone {
    constructor(data) {
        this.name = data.name;
        /** @type {Bone} */
        this.parent = data.parent;
        this.headVertex = new Vert(data.headVertex);
        this.tailVertex = new Vert(data.tailVertex);

        this.selected = false;

        this.physics = data.physics;

        this.color = data.color;
    }

    get depth() {
        if (this.parent) return this.parent.depth + 1;
        else return 0;
    }
}

export class BArmature {
    static createBone(head, tail, parent = null) {
        return new Bone({name: "名称未設定", parent: parent, headVertex: {co: head}, tailVertex: {co: tail}, color: [0,0,0,1], physics: createArrayNAndFill(13, 0)});
    }

    constructor() {
        /** @type {Armature} */
        this.object = null;
        /** @type {Bone[]} */
        this.bones = [];
    }

    get id() {
        return this.object.id;
    }

    // 頂点の参照からボーンを見つける
    getBoneByVertex(vertex) {
        return this.bones.filter(bone => bone.headVertex === vertex || bone.tailVertex === vertex)[0];
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

    getVertexIndexByVertex(vertex) {
        return this.vertices.indexOf(vertex);
    }

    selectedClear() {
        this.vertices.forEach(vertex => {
            vertex.selected = false
            GPU.writeBuffer(this.vertexSelectedBuffer, GPU.createBitData([0], ["u32"]), this.getVertexIndexByVertex(vertex) * 4);
        });
        // this.updateGPUData();
    }

    select(/** @type {Array} */ indexs) {
        indexs.forEach(index => {
            this.vertices[index].selected = true;
            GPU.writeBuffer(this.vertexSelectedBuffer, GPU.createBitData([1], ["u32"]), index * 4);
        });
        // this.updateGPUData();
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

    updateGPUData() {
        this.verticesBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.vertices.map(vertex => vertex.co).flat(), ["f32", "f32"]);
        // this.relatedBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.vertices.map(vertex => vertex.co).flat(), ["f32", "f32"]);
        this.vertexSelectedBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 4, 4), this.vertices.map(vertex => vertex.selected ? 1 : 0), ["u32"]);
        this.bonesSelectedBuffer = GPU.createStorageBuffer(roundUp(this.bones.length * 4, 4), this.bones.map(bone => bone.selected ? 1 : 0), ["u32"]);
        this.boneColorsBuffer = GPU.createStorageBuffer(roundUp(this.bones.length * 4 * 4, 4 * 4), this.bones.map(bone => bone.color).flat(), ["f32", "f32", "f32", "f32"]);
        this.r = GPU.createStorageBuffer(roundUp(this.bones.length * 4, 4), this.bones.map(bone => 1), ["u32"]);
        this.renderingGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr"), [this.verticesBuffer, this.boneColorsBuffer, this.vertexSelectedBuffer, this.bonesSelectedBuffer, this.r]);
    }

    get root() {
        return this.bones.filter(bone => bone.parent == null);
    }

    async fromArmature(/** @type {Armature} */object) {
        console.log(object)
        const armatureData = app.scene.runtimeData.armatureData;
        this.object = object;
        const [coordinates, colors, physics] = await Promise.all([
            armatureData.baseVertices.getObjectData(object),
            armatureData.colors.getObjectData(object),
            armatureData.physicsData.getObjectData(object),
        ]);
        const createBones = (children, parent) => {
            for (const childData of children) {
                const boneIndex = childData.index;
                const bone = new Bone({name: object.boneMetaDatas[boneIndex].name, parent: parent, headVertex: {co: coordinates[boneIndex].slice(0,2)}, tailVertex: {co: coordinates[boneIndex].slice(2,4)}, color: colors[boneIndex], physics: physics[boneIndex].slice(0, 13)});
                this.bones[boneIndex] = bone;
                createBones(object.getBoneChildren(childData), bone);
            }
        }
        createBones(object.root, null);
        this.updateGPUData();
    }

    toRutime() {
        this.object.boneMetaDatas.length = 0;
        this.object.allVertices.length = 0;
        this.object.allPhysics.length = 0;
        this.object.allBone.length = 0;
        this.object.allBoneWorldMatrix.length = 0;
        this.object.allColors.length = 0;
        this.object.root.length = 0;
        this.object.allAnimations.length = 0;
        for (const bone of this.bones) {
            const parent = bone.parent;
            this.object.boneMetaDatas.push(Armature.createBoneMetaData(bone.name, this.getBoneIndex(bone), this.getBoneIndex(parent), bone.depth, false));
            const boneData = Armature.getLocalBoneDataByVertices(bone.headVertex.co, bone.tailVertex.co, parent?.headVertex?.co, parent?.tailVertex?.co);
            this.object.allVertices.push(...bone.headVertex.co);
            this.object.allVertices.push(...bone.tailVertex.co);
            this.object.allPhysics.push(...bone.physics,
                0, 1, 0,

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
            this.object.allBone.push(...boneData.bone);
            this.object.allBoneWorldMatrix.push(...boneData.worldMatrix.flat());
            this.object.allColors.push(...bone.color);
            this.object.allAnimations.push(0,0,0,0,0,0); // x y sx sy r l

            this.object.keyframeBlockManager.appendParameter(this.object.allAnimations.length - 5);
            this.object.keyframeBlockManager.appendParameter(this.object.allAnimations.length - 4);
            this.object.keyframeBlockManager.appendParameter(this.object.allAnimations.length - 3);
            this.object.keyframeBlockManager.appendParameter(this.object.allAnimations.length - 2);
            this.object.keyframeBlockManager.appendParameter(this.object.allAnimations.length - 1);
            this.object.keyframeBlockManager.appendParameter(this.object.allAnimations.length);
        }
        const armatureData = app.scene.runtimeData.armatureData;
        armatureData.update(this.object);
    }
}