import { GPU } from "../../../webGPU.js";
import { GraphicMesh } from "../../../オブジェクト/グラフィックメッシュ.js";
import { setBaseBBox, setParentModifierWeight } from "../../../オブジェクト/オブジェクトで共通の処理.js";
import { vec2 } from "../../../ベクトル計算.js";
import { Armature } from "../../../オブジェクト/アーマチュア.js";

export class MeshManager {
    constructor(target) {
        this.target = target;
    }
}

export class BoneAppendCommand {
    constructor(/** @type {BoneManager} */ manager, /** @type {Armature} */ target, parentIndex, head, tail) {
        this.manager = manager;
        this.target = target;
        this.parentIndex = parentIndex;
        this.head = head;
        this.tail = tail;
        this.index = -1;
    }

    execute() {
        this.index = this.manager.append(this.target, this.parentIndex, this.head, this.tail);
    }

    undo() {
        this.manager.delete(this.target, [this.index]);
    }
}

export class BoneDeleteCommand {
    constructor(/** @type {BoneManager} */ manager, /** @type {Armature} */ target, index) {
        this.manager = manager;
        this.target = target;
        this.index = index;
    }

    execute() {
        this.index = this.manager.append(this.target, this.parentIndex, this.head, this.tail);
    }

    undo() {
        this.manager.delete(this.target, [this.index]);
    }
}

export class BoneJoinCommand {
    constructor(/** @type {BoneManager} */ manager, /** @type {Armature} */ target, parentIndex, index) {
        this.manager = manager;
        this.target = target;
        this.parentIndex = parentIndex;
        this.index = index;
        this.beforParentIndex = target.editor.getBoneParentIndex(index);
    }

    execute() {
        this.manager.join(this.target, this.parentIndex, this.index);
    }

    undo() {
        this.manager.join(this.target, this.beforParentIndex, this.index);
    }
}

export class BoneManager {
    constructor() {
    }

    append(/** @type {Armature} */ target, parentIndex, head, tail) {
        // 親ボーンのindex
        if (parentIndex == "last") {
            parentIndex = target.boneNum - 1;
        }
        // ベース頂点データを更新
        target.s_baseVerticesPositionBuffer = GPU.appendDataToStorageBuffer(target.s_baseVerticesPositionBuffer, new Float32Array(head.concat(tail)));
        // アニメーションデータを更新
        for (const anmaiton of target.animationBlock.animationBlock) {
            anmaiton.s_verticesAnimationBuffer = GPU.appendDataToStorageBuffer(anmaiton.s_verticesAnimationBuffer, new Float32Array([0,0,0,0,0,0]));
            anmaiton.adaptAnimationGroup2 = GPU.createGroup(GPU.getGroupLayout("Csr_Cu"), [anmaiton.s_verticesAnimationBuffer, anmaiton.u_animationWeightBuffer]);
        }
        target.boneNum ++;
        target.verticesNum = target.boneNum * 2;

        target.RVrt_coBuffer = GPU.createStorageBuffer(target.verticesNum * (2) * 4, undefined, ["f32","f32","f32","f32"]);

        target.baseBoneBuffer = GPU.createStorageBuffer(target.boneNum * (6) * 4, undefined, ["f32","f32"]);
        target.boneBuffer = GPU.createStorageBuffer(target.boneNum * (6) * 4, undefined, ["f32","f32"]);
        target.baseBoneMatrixBuffer = GPU.createStorageBuffer(target.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]);
        target.boneMatrixBuffer = GPU.createStorageBuffer(target.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]);

        // 親子データを更新
        target.editor.appendBone(target.editor.getBoneFromIndex(parentIndex));
        target.editor.updatePropagateData();

        target.calculateBaseBoneData();
        target.setGroup();
        setBaseBBox(target)
        target.children?.weightReset();
        target.isChange = true;
        setParentModifierWeight(target);

        return target.boneNum - 1;
    }

    delete(/** @type {Armature} */ target, deleteIndexs) {
        const indexs = deleteIndexs;
        // for (let index of deleteIndexs) {
        //     index = Math.floor(index / 2);
        //     if (!indexs.includes(index)) {
        //         indexs.push(index);
        //     }
        // }
        // ベース頂点データを更新
        target.s_baseVerticesPositionBuffer = GPU.deleteIndexsToBuffer(target.s_baseVerticesPositionBuffer, indexs, 4 * 2 * 2);
        // アニメーションデータを更新
        for (const anmaiton of target.animationBlock.animationBlock) {
            anmaiton.s_verticesAnimationBuffer = GPU.deleteIndexsToBuffer(anmaiton.s_verticesAnimationBuffer, indexs, 24);
            anmaiton.adaptAnimationGroup2 = GPU.createGroup(GPU.getGroupLayout("Csr_Cu"), [{item: anmaiton.s_verticesAnimationBuffer, type: 'b'}, {item: anmaiton.u_animationWeightBuffer, type: 'b'}]);
        }
        target.boneNum -= deleteIndexs.length;
        target.verticesNum = target.boneNum * 2;

        target.RVrt_coBuffer = GPU.createStorageBuffer(target.verticesNum * (2) * 4, undefined, ["f32","f32","f32","f32"]);

        target.baseBoneBuffer = GPU.createStorageBuffer(target.boneNum * (6) * 4, undefined, ["f32","f32"]);
        target.boneBuffer = GPU.createStorageBuffer(target.boneNum * (6) * 4, undefined, ["f32","f32"]);
        target.baseBoneMatrixBuffer = GPU.createStorageBuffer(target.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]);
        target.boneMatrixBuffer = GPU.createStorageBuffer(target.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]);

        // 親子データを更新
        for (const index of indexs.sort((a,b) => (b - a))) {
            target.editor.deleteBoneFormIndex(index);
        }
        target.editor.updatePropagateData();

        target.calculateBaseBoneData();
        target.setGroup();
        setBaseBBox(target)
        target.children?.weightReset();
        target.isChange = true;
        setParentModifierWeight(target);
    }

    join(/** @type {Armature} */ target, parentIndex, index) {
        // index = Math.floor(index / 2);
        // parentIndex = Math.floor(parentIndex / 2);
        // 親子データを更新
        target.editor.changeBoneParent(target.editor.getBoneFromIndex(parentIndex), target.editor.getBoneFromIndex(index));
        target.editor.updatePropagateData();
        target.calculateBaseBoneData();
    }
}

export class Mesh {
    constructor() {
    }

    appendBaseEdges(/** @type {GraphicMesh} */ object, edges) {
        if (object.type == "グラフィックメッシュ") {
            if (edges.length >= 2) {
                for (let i = 1; i < edges.length; i ++) {
                    object.editor.appendBaseEdge([edges[i - 1],edges[i]]);
                }
                object.editor.createMesh();
            }
        }
    }

    deleteBaseEdges(/** @type {GraphicMesh} */ object, edges) {
        if (object.type == "グラフィックメッシュ") {
            if (edges.length >= 2) {
                for (let i = 1; i < edges.length; i ++) {
                    object.editor.deleteBaseEdge([edges[i - 1],edges[i]]);
                }
                object.editor.createMesh();
            }
        }
    }

    appendBaseVertices(/** @type {GraphicMesh} */ object, addPosition) {
        if (object.type == "グラフィックメッシュ") {
            object.verticesNum ++;
            object.s_baseVerticesPositionBuffer = GPU.appendDataToStorageBuffer(object.s_baseVerticesPositionBuffer, new Float32Array(addPosition));
            object.s_baseVerticesUVBuffer = GPU.appendDataToStorageBuffer(object.s_baseVerticesUVBuffer, new Float32Array(object.editor.calculatWorldPositionToUV(addPosition)));
            object.RVrt_coBuffer = GPU.appendDataToStorageBuffer(object.RVrt_coBuffer, new Float32Array([0,0]));

            object.isChange = true;
            object.setGroup();

            object.editor.createMesh();

            setParentModifierWeight(object);
            return [object.verticesNum - 1];
        }
    }

    deleteBaseVertices(/** @type {GraphicMesh} */ object, deleteIndexs) {
        if (object.type == "グラフィックメッシュ") {
            object.editor.deleteBaseVertices(deleteIndexs);
            object.verticesNum -= deleteIndexs.length;
            object.s_baseVerticesPositionBuffer = GPU.deleteIndexsToBuffer(object.s_baseVerticesPositionBuffer, deleteIndexs, 8);
            object.s_baseVerticesUVBuffer = GPU.deleteIndexsToBuffer(object.s_baseVerticesUVBuffer, deleteIndexs, 8);
            object.RVrt_coBuffer = GPU.deleteIndexsToBuffer(object.RVrt_coBuffer, deleteIndexs, 8);

            object.isChange = true;
            object.setGroup();

            object.editor.createMesh();

            setParentModifierWeight(object);
        }
    }

    appendBone(/** @type {Armature} */ target, parentIndex, head, tail, coordinate) {
        if (coordinate) {
            // console.log(await GPU.getF32BufferPartsData(target.s_baseVerticesPositionBuffer,parentIndex,2))
            // vec2.add(head, await GPU.getF32BufferPartsData(target.s_baseVerticesPositionBuffer,parentIndex,2), head);
            vec2.add(head, coordinate, head);
            console.log(coordinate)
        }
        console.log(target, parentIndex, head, tail)
        // 親ボーンのindex
        if (parentIndex == "last") {
            parentIndex = target.boneNum - 1;
        }
        // ベース頂点データを更新
        target.s_baseVerticesPositionBuffer = GPU.appendDataToStorageBuffer(target.s_baseVerticesPositionBuffer, new Float32Array(head.concat(tail)));
        // アニメーションデータを更新
        for (const anmaiton of target.animationBlock.animationBlock) {
            anmaiton.s_verticesAnimationBuffer = GPU.appendDataToStorageBuffer(anmaiton.s_verticesAnimationBuffer, new Float32Array([0,0,0,0,0,0]));
            anmaiton.adaptAnimationGroup2 = GPU.createGroup(GPU.getGroupLayout("Csr_Cu"), [anmaiton.s_verticesAnimationBuffer, anmaiton.u_animationWeightBuffer]);
        }
        target.boneNum ++;
        target.verticesNum = target.boneNum * 2;

        target.RVrt_coBuffer = GPU.createStorageBuffer(target.verticesNum * (2) * 4, undefined, ["f32","f32","f32","f32"]);

        target.baseBoneBuffer = GPU.createStorageBuffer(target.boneNum * (6) * 4, undefined, ["f32","f32"]);
        target.boneBuffer = GPU.createStorageBuffer(target.boneNum * (6) * 4, undefined, ["f32","f32"]);
        target.baseBoneMatrixBuffer = GPU.createStorageBuffer(target.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]);
        target.boneMatrixBuffer = GPU.createStorageBuffer(target.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]);

        // 親子データを更新
        target.editor.appendBone(target.editor.getBoneFromIndex(parentIndex));
        target.editor.updatePropagateData();

        target.calculateBaseBoneData();
        target.setGroup();
        setBaseBBox(target)
        target.children?.weightReset();
        target.isChange = true;
        setParentModifierWeight(target);

        return [target.verticesNum - 1];
    }

    deleteBone(/** @type {Armature} */ target, deleteIndexs) {
        console.log("yobidasi ", deleteIndexs)
        const indexs = [];
        for (let index of deleteIndexs) {
            index = Math.floor(index / 2);
            if (!indexs.includes(index)) {
                indexs.push(index);
            }
        }
        // ベース頂点データを更新
        target.s_baseVerticesPositionBuffer = GPU.deleteIndexsToBuffer(target.s_baseVerticesPositionBuffer, indexs, 4 * 2 * 2);
        // アニメーションデータを更新
        for (const anmaiton of target.animationBlock.animationBlock) {
            anmaiton.s_verticesAnimationBuffer = GPU.deleteIndexsToBuffer(anmaiton.s_verticesAnimationBuffer, indexs, 24);
            anmaiton.adaptAnimationGroup2 = GPU.createGroup(GPU.getGroupLayout("Csr_Cu"), [{item: anmaiton.s_verticesAnimationBuffer, type: 'b'}, {item: anmaiton.u_animationWeightBuffer, type: 'b'}]);
        }
        target.boneNum -= deleteIndexs.length;
        target.verticesNum = target.boneNum * 2;

        target.RVrt_coBuffer = GPU.createStorageBuffer(target.verticesNum * (2) * 4, undefined, ["f32","f32","f32","f32"]);

        target.baseBoneBuffer = GPU.createStorageBuffer(target.boneNum * (6) * 4, undefined, ["f32","f32"]);
        target.boneBuffer = GPU.createStorageBuffer(target.boneNum * (6) * 4, undefined, ["f32","f32"]);
        target.baseBoneMatrixBuffer = GPU.createStorageBuffer(target.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]);
        target.boneMatrixBuffer = GPU.createStorageBuffer(target.boneNum * (4 * 3) * 4, undefined, ["f32","f32","f32"]);

        // 親子データを更新
        for (const index of indexs.sort((a,b) => (b - a))) {
            target.editor.deleteBoneFormIndex(index);
        }
        target.editor.updatePropagateData();

        target.calculateBaseBoneData();
        target.setGroup();
        setBaseBBox(target)
        target.children?.weightReset();
        target.isChange = true;
        setParentModifierWeight(target);
    }

    joinBone(/** @type {Armature} */ target, index, parentIndex) {
        index = Math.floor(index / 2);
        parentIndex = Math.floor(parentIndex / 2);
        // 親子データを更新
        target.editor.changeBoneParent(target.editor.getBoneFromIndex(parentIndex), target.editor.getBoneFromIndex(index));
        target.editor.updatePropagateData();
        target.calculateBaseBoneData();
    }
}

const weightPaintPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csrw_Csr"),GPU.getGroupLayout("Cu_Cu")],`
struct Output {
    indexs: vec4<u32>,
    weights: vec4<f32>,
}

struct Config {
    decayType: u32,
    decaySize: f32,
    index: u32,
    weight: f32,
}

@group(0) @binding(0) var<storage, read_write> indexAndWeight: array<Output>;
@group(0) @binding(1) var<storage, read> originalIndexAndWeight: array<Output>;
@group(0) @binding(2) var<storage, read_write> maxWeights: array<f32>;
@group(0) @binding(3) var<storage, read> vertices: array<vec2<f32>>;
@group(1) @binding(0) var<uniform> config: Config;
@group(1) @binding(1) var<uniform> centerPoint: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&vertices) <= index) {
        return;
    }
    let dist = distance(centerPoint, vertices[index]);
    let decay = (config.decaySize - dist) / config.decaySize;
    if (dist < config.decaySize) {
        let weight = config.weight * decay;
        maxWeights[index] = max(maxWeights[index],weight);
    }
    var minIndex = 0u;
    var minWeight = 1.1;
    let data = originalIndexAndWeight[index];
    for (var i = 0u; i < 4u; i ++) {
        if (config.index == data.indexs[i]) {
            minIndex = i;
            minWeight = data.weights[i];
            break ;
        } else if (data.weights[i] < minWeight) {
            minIndex = i;
            minWeight = data.weights[i];
        }
    }
    if (minWeight < maxWeights[index]) {
        indexAndWeight[index].indexs[minIndex] = config.index;
        indexAndWeight[index].weights[minIndex] = maxWeights[index];
        var sumWeight = 0.0;
        for (var i = 0u; i < 4u; i ++) {
            sumWeight += indexAndWeight[index].weights[i];
        }
        indexAndWeight[index].weights /= sumWeight; // 正規化
    }
}
`);

export class WeightPaint {
    constructor() {
        this.configBuffer = GPU.createUniformBuffer(32, undefined, ["u32","f32","u32","f32"]);
        this.pointBuffer = GPU.createUniformBuffer(8, undefined, ["f32","f32"]);
        this.configGroup = GPU.createGroup(GPU.getGroupLayout("Cu_Cu"), [{item: this.configBuffer, type: "b"}, {item: this.pointBuffer, type: "b"}]);
    }

    init(target, paintTargetIndex, weight, decayType, radius) {
        GPU.writeBuffer(this.configBuffer, GPU.createBitData([decayType,radius,paintTargetIndex,weight],["u32","f32","u32","f32"]))
        this.target = target;
        this.targetBuffer = target.parentWeightBuffer;
        this.originalBuffer = GPU.copyBufferToNewBuffer(target.parentWeightBuffer);
        this.maxWeightBuffer = GPU.createStorageBuffer(target.verticesNum * 4, undefined, ["f32"]);
        this.originalVerticesBuffer = GPU.copyBufferToNewBuffer(target.RVrt_coBuffer);
        this.workNum = Math.ceil(target.verticesNum / 64);
        this.group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csrw_Csr"), [{item: this.targetBuffer, type: "b"}, {item: this.originalBuffer, type: "b"}, {item: this.maxWeightBuffer, type: "b"}, {item: this.originalVerticesBuffer, type: "b"}]);
    }

    paint(point) {
        console.log("ペイント")
        GPU.writeBuffer(this.pointBuffer, new Float32Array(point));
        GPU.runComputeShader(weightPaintPipeline, [this.group, this.configGroup], this.workNum);
        this.target.isChange = true;
    }

    createUndoData() {
        return {action: "ウェイトペイント", data: {object: this.target, target: this.targetBuffer, undo: this.originalBuffer, redo: GPU.copyBufferToNewBuffer(this.targetBuffer)}};
    }

    do(data) {
        data.object.isChange = true;
        GPU.copyBuffer(data.undo, data.target);
    }
}

export const mesh = new Mesh();
export const weightPaint = new WeightPaint();