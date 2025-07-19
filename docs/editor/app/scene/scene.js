import { device, GPU } from '../../utils/webGPU.js';
import { createID, managerForDOMs } from '../../utils/ui/util.js';
import { GraphicMesh } from '../../core/objects/graphicMesh.js';
import { BezierModifier } from '../../core/objects/bezierModifier.js';
import { Bone, Armature } from '../../core/objects/armature.js';
import { AnimationCollector } from '../../core/objects/animationCollector.js';
import { arrayToSet, changeParameter, createArrayN, indexOfSplice, isNumber, loadFile, objectInit, pushArray, range } from '../../utils/utility.js';
import { app, Application } from '../app.js';
import { vec2 } from '../../utils/mathVec.js';
import { mathMat3x3 } from '../../utils/mathMat.js';

const parallelAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/propagation/from_graphicMesh.wgsl"));
const treeAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Cu"), GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/propagation/from_bezierModifier.wgsl"));
const animationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/applyAnimation/from_vec2.wgsl"));
const bezierAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/applyAnimation/from_vec2x3.wgsl"));
const boneAnimationApplyPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/update/applyAnimation/from_bone.wgsl"));
const calculateBoneBaseDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csr_Csr_Cu")], await loadFile("./editor/shader/compute/object/bone/calculateBase.wgsl"));
const propagateBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"),GPU.getGroupLayout("Csr")], await loadFile("./editor/shader/compute/object/bone/propagation.wgsl"));
const calculateBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr")], await loadFile("./editor/shader/compute/object/bone/calculateVertices.wgsl"));

const selectOnlyVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw")], await loadFile("./editor/shader/compute/select/vertex/selectOnlyVertices.wgsl"));
const circleSelectBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/vertex/selectVertices.wgsl"));

const selectBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/armature/selectBone.wgsl"));

const boneHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/armature/hitTest.wgsl"));

const verticesSelectionToBonesSelectionPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu")], await loadFile("./editor/shader/compute/select/armature/verticesSelectionToBonesSelection.wgsl"));

const bezierModifierHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/bezierModifier/hitTest.wgsl"));

const boxSelectVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/boxSelectVertices.wgsl"));

const polygonsHitTestPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu")], await loadFile("./editor/shader/compute/select/graphicMesh/hitTest.wgsl"));

const calculateLimitBoneBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Csr_Csr")], await loadFile("./editor/shader/compute/utils/boundingBox/from_bone.wgsl"));
const calculateLimitVerticesBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Csr_Csr")], await loadFile("./editor/shader/compute/utils/boundingBox/from_vertex.wgsl"));
const BBoxResultBuffer = GPU.createStorageBuffer(2 * 4 * 2, undefined, ["f32"]);
const BBoxCalculateBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["i32"]);
const BBoxGroup0 = GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw"), [BBoxResultBuffer,BBoxCalculateBuffer]);

const objectToNumber = {
    "グラフィックメッシュ": 1,
    "ベジェモディファイア": 2,
    "アーマチュア": 3,
};

function packBuffer(buffer, updateRangeStart, updateRangeNum, packRangeStart) {
    const newBuffer = this.createStorageBuffer(updateRangeNum * 4, undefined, ["f32"]);
    // コピーコマンドを発行
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(buffer, updateRangeStart * 4, newBuffer, 0, updateRangeNum * 4);
    commandEncoder.copyBufferToBuffer(newBuffer, 0, buffer, packRangeStart * 4);
    const commandBuffer = commandEncoder.finish();
    device.queue.submit([commandBuffer]);
}

class BufferManager {
    constructor(runtimeData, bufferName, struct, calculateFormula) {
        this.runtimeData = runtimeData;
        this.bufferName = bufferName;
        // this.buffer = GPU.createBuffer(0, ["s"]);
        this.buffer = GPU.createBuffer(0, ["v","s"]);
        this.struct = struct;
        this.structByteSize = struct.length * 4;
        this.formula = calculateFormula;
        this.formulaParts = calculateFormula.split(" ");
        this.formulaParts = this.formulaParts.map(value => isNumber(value) ? Number(value) : value);
        this.sourceOffsetType = "";
    }

    async getObjectData(object) {
        const offset = object.runtimeOffsetData[this.sourceOffsetType];
        const readNum = this.getObjectUseSize(object);
        return await GPU.getStructDataFromGPUBuffer(this.buffer, this.struct, offset, readNum);
    }

    getObjectUseSize(object) {
        let ans = 0;
        let operator = "+";
        for (const part of this.formulaParts) {
            if ("*/+-".includes(part)) {
                operator = part;
            } else {
                let value = 0;
                if (isNumber(part)) {
                    value = part;
                } else {
                    value = object[part];
                }
                if (operator == "+") {
                    ans += value;
                } else if (operator == "-") {
                    ans -= value;
                } else if (operator == "*") {
                    ans *= value;
                } else if (operator == "/") {
                    ans /= value;
                }
            }
        }
        return Math.ceil(ans);
    }

    get influenceValues() {
        const influenceValues = [];
        for (const part of this.formulaParts) {
            if ("*/+-".includes(part)) {
            } else if (isNumber(part)) {
            } else {
                influenceValues.push(part);
            }
        }
        return influenceValues;
    }

    remove(object) {
    }

    delete(object) {
        const offset = object.runtimeOffsetData[this.sourceOffsetType];
        const readNum = this.getObjectUseSize(object);
        console.log(this)
        this.buffer = GPU.deleteStructDataFromGPUBuffer(this.buffer, offset, readNum, this.struct);
    }

    append(object) {
        const byte = this.getObjectUseSize(object) * this.structByteSize;
        this.buffer = GPU.appendEmptyToBuffer(this.buffer, byte);
    }
}

// そのうち動的ストレージバッファ（dynamic storage buffer）を使うかも
class RuntimeDataBase {
    constructor(/** @type {Application} */ app, offsetNameConverter) {
        this.app = app;
        this.order = [];
        this.offsetAndFormulas = {};
        this.offsetNameConverter = offsetNameConverter;
    }

    append(object) {
        if (this.order.includes(object)) return ;
        this.order.push(object);
        const buffers = [];
        for (const key in this) {
            if (this[key] instanceof BufferManager) {
                buffers.push(this[key]);
            }
        }
        for (const buffer of buffers) {
            buffer.append(object);
        }
        this.setGroup();
        this.setOffset(object);
        console.log(this.order)
    }

    delete(object) {
        if (!this.order.includes(object)) return ;
        this.order.splice(this.order.indexOf(object), 1);
        const buffers = [];
        for (const key in this) {
            if (this[key] instanceof BufferManager) {
                buffers.push(this[key]);
            }
        }
        for (const buffer of buffers) {
            buffer.delete(object);
        }
        this.setGroup();
        this.setOffset(object);
        console.log(this.order)
    }

    offsetCreate() {
        const alreadyDetected = [];
        const alreadyFoundID = {};
        objectInit(this.offsetAndFormulas);
        for (const key in this) {
            const p = this[key];
            if (p instanceof BufferManager) {
                let result = p.influenceValues;
                let hash;
                const ids = [];
                for (const value of result) {
                    if (!alreadyDetected.includes(value)) {
                        alreadyDetected.push(value);
                    }
                    ids.push(alreadyDetected.indexOf(value));
                }
                hash = ids.sort((a,b) => a > b).join("*");
                if (!alreadyFoundID[hash]) {
                    this.offsetAndFormulas[result.join("*")] = result;
                    alreadyFoundID[hash] = true;
                }
                p.sourceOffsetType = this.offsetNameConverter[result.join("*")];
            }
        }
    }

    setOffset(object) {
        if (!this.order.includes(object)) return ;
        // const offsets = new Array(this.offsetAndFormulas.length).fill(0);
        const offsets = {};
        for (const key in this.offsetAndFormulas) {
            offsets[key] = 0;
        }
        for (const nowObject of this.order) {
            if (nowObject == object) {
                // nowObject.runtimeOffsetData = offsets;
                objectInit(nowObject.runtimeOffsetData);
                for (const key in offsets) {
                    nowObject.runtimeOffsetData[this.offsetNameConverter[key]] = offsets[key];
                }
                console.log(nowObject)
                this.updateAllocationData(object);
                return ;
            }
            for (const key in this.offsetAndFormulas) {
                let value = 1;
                for (const parameter of this.offsetAndFormulas[key]) {
                    value *= nowObject[parameter];
                }
                offsets[key] += value;
            }
        }
    }

    setAllOffset() {
        const offsets = {};
        for (const key in this.offsetAndFormulas) {
            offsets[key] = 0;
        }
        for (const object of this.order) {
            objectInit(object.runtimeOffsetData);
            for (const key in offsets) {
                object.runtimeOffsetData[this.offsetNameConverter[key]] = offsets[key];
            }
            this.updateAllocationData(object);
            for (const key in this.offsetAndFormulas) {
                let value = 1;
                for (const parameter of this.offsetAndFormulas[key]) {
                    value *= object[parameter];
                }
                offsets[key] += value;
            }
        }
    }
}
class GraphicMeshData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "MAX_ANIMATIONS": "animationWeightOffset", "MAX_ANIMATIONS*MAX_VERTICES": "animationOffset", "MAX_MESHES": "meshOffset", "MAX_VERTICES": "vertexOffset"});
        // this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32"], "MAX_VERTICES");
        // this.baseVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32"], "MAX_VERTICES");
        // this.meshes = GPU.createBuffer(0, ["v","s"]);
        this.meshes = new BufferManager(this, "meshes", ["u32","u32","u32"], "MAX_MESHES");
        // this.meshes = GPU.createBuffer(0, ["v","s"]);
        this.edges = new BufferManager(this, "edges", ["u32","u32"], "MAX_MESHES * 3");
        // this.uv = GPU.createBuffer(0, ["s"]);
        this.uv = new BufferManager(this, "uv", ["f32","f32"], "MAX_VERTICES");
        // this.animations = GPU.createBuffer(0, ["s"]);
        this.animations = new BufferManager(this, "animations", ["f32","f32"], "MAX_ANIMATIONS * MAX_VERTICES");
        // this.animationWights = GPU.createBuffer(0, ["s"]);
        this.animationWights = new BufferManager(this, "animationWights", ["f32"], "MAX_ANIMATIONS");
        // this.weightBlocks = GPU.createBuffer(0, ["s"]);
        this.weightBlocks = new BufferManager(this, "weightBlocks", ["u32","u32","u32","u32","f32","f32","f32","f32"], "MAX_VERTICES");
        // this.allocation = GPU.createBuffer(0, ["s"]);
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");
        // this.selectedVertices = GPU.createBuffer(0, ["s"]);
        this.selectedVertices = new BufferManager(this, "selectedVertices", ["bit"], "MAX_VERTICES");
        // this.selectedMesh = GPU.createBuffer(0, ["s"]);
        this.selectedMesh = new BufferManager(this, "selectedMesh", ["bit"], "MAX_MESHES");
        this.renderGroup = null;
        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;

        this.blockByteLength = 2 * 4; // データ一塊のバイト数: vec2<f32>
        this.meshBlockByteLength = 3 * 4; // uint32x3
        this.animationBlockByteLength = 3 * 4; // uint32x3

        this.weightBlockByteLength = (4 + 4) * 4;

        this.write = false;

        this.offsetCreate();
    }

    async getBaseVerticesFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.baseVertices, {start: graphicMesh.runtimeOffsetData.vertexOffset, end: graphicMesh.runtimeOffsetData.vertexOffset + graphicMesh.verticesNum}, ["f32", "f32"]);
    }

    async getVerticesUVFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.uv, {start: graphicMesh.runtimeOffsetData.vertexOffset, end: graphicMesh.runtimeOffsetData.vertexOffset + graphicMesh.verticesNum}, ["u32", "u32", "u32"]);
    }

    async getMeshFromObject(/** @type {GraphicMesh} */graphicMesh) {
        return await GPU.getBufferDataFromIndexs(this.meshes, {start: graphicMesh.runtimeOffsetData.vertexOffset, end: graphicMesh.runtimeOffsetData.vertexOffset + graphicMesh.verticesNum}, ["f32", "f32"]);
    }

    updateBaseData(/** @type {GraphicMesh} */graphicMesh) {
        graphicMesh.verticesNum = graphicMesh.allVertices.length;
        graphicMesh.meshesNum = graphicMesh.allMeshes.length;
        const verticesBases = [];
        const verticesUV = [];
        const verticesParentWeight = [];
        for (const vertex of graphicMesh.allVertices) {
            verticesBases.push(...vertex.base);
            verticesUV.push(...vertex.uv);
            verticesParentWeight.push(...vertex.parentWeight.indexs.concat(vertex.parentWeight.weights));
        }
        GPU.writeBuffer(this.baseVertices.buffer, new Float32Array(verticesBases), graphicMesh.runtimeOffsetData.vertexOffset * this.blockByteLength);
        GPU.writeBuffer(this.uv.buffer, new Float32Array(verticesUV), graphicMesh.runtimeOffsetData.vertexOffset * this.blockByteLength);
        GPU.writeBuffer(this.weightBlocks.buffer, GPU.createBitData(verticesParentWeight, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), graphicMesh.runtimeOffsetData.vertexOffset * this.weightBlockByteLength);
        const meshesIndexs = [];
        for (const mesh of graphicMesh.allMeshes) {
            meshesIndexs.push(...mesh.indexs);
        }
        GPU.writeBuffer(this.meshes.buffer, new Uint32Array(meshesIndexs), graphicMesh.runtimeOffsetData.meshOffset * this.meshBlockByteLength);
        this.updateAllocationData(graphicMesh);
    }

    async updateCPUDataFromGPUBuffer(/** @type {GraphicMesh} */graphicMesh, updateContent = {vertex: {base: true, uv: true, weight: true}, mesh: true}) {
        this.write = true;
        const baseArray = updateContent.vertex.base ? await this.baseVertices.getObjectData(graphicMesh) : [];
        const uvArray = updateContent.vertex.uv ? await this.uv.getObjectData(graphicMesh) : [];
        const weightBlockArray = updateContent.vertex.weight ? await this.weightBlocks.getObjectData(graphicMesh) : [];
        for (const vertex of graphicMesh.allVertices) {
            if (vertex.base != baseArray[vertex.index] || vertex.uv == uvArray[vertex.index]) {
                vertex.updated = true;
            } else {
                vertex.updated = false;
            }
            if (updateContent.vertex.base) {
                vertex.base = baseArray[vertex.index];
            }
            if (updateContent.vertex.uv) {
                vertex.uv = uvArray[vertex.index];
            }
            if (updateContent.vertex.weight) {
                vertex.parentWeight.indexs = weightBlockArray[vertex.index].slice(0,4);
                vertex.parentWeight.weights = weightBlockArray[vertex.index].slice(4,8);
            }
        }
        this.write = false;
    }

    // 選択
    async selectedForVertices(/** @type {GraphicMesh} */ graphicMesh, object, option) {
        const optionBuffer = GPU.createUniformBuffer((2) * 4, [option.add,1], ["u32"]);
        // console.log("最大頂点数", graphicMesh.MAX_VERTICES, "起動されるグループ数", Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, graphicMesh.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((graphicMesh.MAX_VERTICES * 3) / 32) / 64));
        } else if (option.circle) {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, graphicMesh.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const atomicBuffer = GPU.createStorageBuffer((1 + 1) * 4);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu_Csrw"), [this.selectedVertices.buffer, this.renderingVertices.buffer, graphicMesh.objectDataBuffer, optionBuffer, circleBuffer, atomicBuffer]);
            GPU.runComputeShader(selectOnlyVerticesPipeline, [group], Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        }
        const resultBone = await GPU.getSelectedFromBufferBit(this.selectedVertices.buffer, graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.vertexOffset + graphicMesh.verticesNum);
        for (const vertex of graphicMesh.allVertices) {
            vertex.selected = resultBone[vertex.index];
        }
        // GPU.consoleBufferData(this.selectedVertices, ["u32"], "当たり判定", {start: Math.ceil(armature.runtimeOffsetData.vertexOffset * 2 / 32), num: Math.ceil((armature.MAX_BONES) * 2 / 32)});
        // GPU.consoleBufferData(this.selectedVertices, ["bit"], "当たり判定bool", {start: Math.ceil(armature.runtimeOffsetData.vertexOffset * 2 / 32), num: Math.ceil((armature.MAX_BONES) * 2 / 32)});
    }

    setAnimationData(/** @type {GraphicMesh} */graphicMesh, animationData, animtaionIndex) {
        GPU.writeBuffer(this.animations, new Float32Array(animationData), (graphicMesh.runtimeOffsetData.animationOffset + animtaionIndex) * this.blockByteLength);
    }

    deleteAnimationData(/** @type {GraphicMesh} */graphicMesh, animtaionIndex) {
        packBuffer(this.animations, (graphicMesh.runtimeOffsetData.animationOffset + animtaionIndex) * this.blockByteLength + graphicMesh.MAX_VERTICES * animtaionIndex, graphicMesh.MAX_VERTICES * (graphicMesh.MAX_ANIMATIONS - animtaionIndex), (graphicMesh.runtimeOffsetData.animationOffset + animtaionIndex) * this.blockByteLength);
        graphicMesh.animationBlock.updateAnimationsIndex();
    }

    getAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        if (graphicMesh.parent) {
            return new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.animationOffset, graphicMesh.runtimeOffsetData.animationWeightOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.runtimeOffsetData.allocationOffset, GPU.padding]);
        } else {
            return new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.animationOffset, graphicMesh.runtimeOffsetData.animationWeightOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, 0, 0, GPU.padding]);
        }
    }

    updateAllocationData(/** @type {GraphicMesh} */graphicMesh) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        const allocationData = this.getAllocationData(graphicMesh);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (graphicMesh.runtimeOffsetData.allocationOffset * 8) * 4);
        GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
        const meshAllocationData = new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.meshOffset, graphicMesh.MAX_MESHES, 0]);
        GPU.writeBuffer(graphicMesh.objectMeshData, meshAllocationData);
    }

    setAllocation(/** @type {GraphicMesh} */graphicMesh) {
        for (const object of this.order) {
        }
        let allocationData;
        if (graphicMesh.parent) {
            allocationData = new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.animationOffset, graphicMesh.runtimeOffsetData.animationWeightOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, objectToNumber[graphicMesh.parent.type], graphicMesh.parent.runtimeOffsetData.allocationOffset, GPU.padding]);
        } else {
            allocationData = new Uint32Array([graphicMesh.runtimeOffsetData.vertexOffset, graphicMesh.runtimeOffsetData.animationOffset, graphicMesh.runtimeOffsetData.animationWeightOffset, graphicMesh.MAX_VERTICES, graphicMesh.MAX_ANIMATIONS, 0, 0, GPU.padding]);
        }
        GPU.writeBuffer(graphicMesh.objectDataBuffer, allocationData);
    }

    setGroup() {
        this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.renderingVertices.buffer, this.uv.buffer]); // 表示用
        this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr"), [this.renderingVertices.buffer, this.meshes.buffer, this.selectedVertices.buffer, this.weightBlocks.buffer]); // 表示用
        this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.animations.buffer, this.animationWights.buffer, this.allocations.buffer]); // アニメーション用
        this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.renderingVertices.buffer, this.weightBlocks.buffer, this.allocations.buffer]); // 親の変形を適応するた
    }
}
class BezierModifierData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "MAX_ANIMATIONS": "animationWeightOffset", "MAX_ANIMATIONS*MAX_POINTS": "animationOffset", "MAX_POINTS": "pointOffset"});
        // this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.renderingVertices = new BufferManager(this, "renderingVertices", ["f32","f32","f32","f32","f32","f32"], "MAX_POINTS");
        // this.baseVertices = GPU.createBuffer(0, ["s"]);
        this.baseVertices = new BufferManager(this, "baseVertices", ["f32","f32","f32","f32","f32","f32"], "MAX_POINTS");
        // this.animations = GPU.createBuffer(0, ["s"]);
        this.animations = new BufferManager(this, "animations", ["f32","f32","f32","f32","f32","f32"], "MAX_ANIMATIONS * MAX_POINTS");
        // this.animationWights = GPU.createBuffer(0, ["s"]);
        this.animationWights = new BufferManager(this, "animationWights", ["f32"], "MAX_ANIMATIONS");
        // this.weightBlocks = GPU.createBuffer(0, ["s"]);
        this.weightBlocks = new BufferManager(this, "weightBlocks", ["u32","u32","u32","u32","f32","f32","f32","f32", "u32","u32","u32","u32","f32","f32","f32","f32", "u32","u32","u32","u32","f32","f32","f32","f32"], "MAX_POINTS");
        // this.allocation = GPU.createBuffer(0, ["s"]);
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");
        // this.selectedVertices = GPU.createBuffer(0, ["s"]);
        this.selectedVertices = new BufferManager(this, "selectedVertices", ["bit"], "MAX_POINTS * 3");

        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;

        this.myType = 2;

        this.blockByteLength = 2 * 4 * 3; // データ一塊のバイト数: vec2<f32> * 3
        this.weightBlockByteLength = (4 + 4) * 4 * 3;

        this.offsetCreate();
    }

    // 選択
    async selectedForVertices(/** @type {BezierModifier} */ bezierModifier, object, option) {
        const optionBuffer = GPU.createUniformBuffer((2) * 4, [option.add,3], ["u32"]);
        // console.log("最大頂点数", graphicMesh.MAX_VERTICES, "起動されるグループ数", Math.ceil(Math.ceil(graphicMesh.MAX_VERTICES / 32) / 64));
        if (object.box) { // ボックス選択
            const boxBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.box.min, ...object.box.max], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, bezierModifier.objectDataBuffer, optionBuffer, boxBuffer]);
            GPU.runComputeShader(boxSelectVerticesPipeline, [group], Math.ceil(Math.ceil((bezierModifier.MAX_POINTS * 3) / 32) / 64));
        } else {
            const circleBuffer = GPU.createUniformBuffer((2 + 2) * 4, [...object.circle, 0], ["f32","f32","f32","f32"]);
            const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"), [this.selectedVertices.buffer, this.renderingVertices.buffer, bezierModifier.objectDataBuffer, optionBuffer, circleBuffer]);
            GPU.runComputeShader(circleSelectBoneVerticesPipeline, [group], Math.ceil(Math.ceil((bezierModifier.MAX_POINTS * 3) / 32) / 64));
        }
        const resultBone = await GPU.getSelectedFromBufferBit(this.selectedVertices.buffer, bezierModifier.runtimeOffsetData.pointOffset * 3, (bezierModifier.runtimeOffsetData.pointOffset + bezierModifier.pointNum) * 3);
        for (const point of bezierModifier.allPoint) {
            point.basePoint.selected = resultBone[point.basePoint.localIndex];
            point.baseLeftControlPoint.selected = resultBone[point.baseLeftControlPoint.localIndex];
            point.baseRightControlPoint.selected = resultBone[point.baseRightControlPoint.localIndex];
        }
    }

    async getBaseVerticesFromObject(/** @type {BezierModifier} */bezierModifier) {
        return await GPU.getBufferDataFromIndexs(this.baseVertices.buffer, {start: bezierModifier.runtimeOffsetData.pointOffset, end: bezierModifier.runtimeOffsetData.pointOffset + bezierModifier.verticesNum}, ["f32", "f32"]);
    }

    async updateCPUDataFromGPUBuffer(/** @type {BezierModifier} */bezierModifier, updateContent = {vertex: {weight: true, base: true}}) {
        this.write = true;
        const baseArray = updateContent.vertex.base ? await GPU.getVerticesDataFromGPUBuffer(this.baseVertices.buffer, bezierModifier.runtimeOffsetData.pointOffset * 3, bezierModifier.verticesNum) : [];
        const weightBlockArray = updateContent.vertex.weight ? await GPU.getStructDataFromGPUBuffer(this.weightBlocks.buffer, ["u32","u32","u32","u32","f32","f32","f32","f32"], bezierModifier.runtimeOffsetData.pointOffset * 3, bezierModifier.verticesNum) : [];
        for (const point of bezierModifier.allPoint) {
            for (let i = 0; i < 3; i ++) {
                let vertex;
                if (i == 0) {
                    vertex = point.basePoint;
                } else if (i == 1) {
                    vertex = point.baseLeftControlPoint;
                } else {
                    vertex = point.baseRightControlPoint;
                }
                if (updateContent.vertex.base) {
                    vertex.co = baseArray[point.index * 3 + i];
                }
                if (updateContent.vertex.weight) {
                    vertex.parentWeight.indexs = weightBlockArray[point.index * 3 + i].slice(0,4);
                    vertex.parentWeight.weights = weightBlockArray[point.index * 3 + i].slice(4,8);
                }
            }
        }
        this.write = false;
    }

    updateBaseData(/** @type {BezierModifier} */bezierModifier) {
        bezierModifier.pointNum = bezierModifier.allPoint.length;
        const verticesBases = [];
        const verticesParentWeight = [];
        for (const point of bezierModifier.allPoint) {
            verticesBases.push(...point.basePoint.co);
            verticesBases.push(...point.baseLeftControlPoint.co);
            verticesBases.push(...point.baseRightControlPoint.co);
            verticesParentWeight.push(...point.basePoint.parentWeight.indexs.concat(point.basePoint.parentWeight.weights));
            verticesParentWeight.push(...point.baseLeftControlPoint.parentWeight.indexs.concat(point.baseLeftControlPoint.parentWeight.weights));
            verticesParentWeight.push(...point.baseRightControlPoint.parentWeight.indexs.concat(point.baseRightControlPoint.parentWeight.weights));
        }
        console.log(bezierModifier)
        GPU.writeBuffer(this.baseVertices.buffer, new Float32Array(verticesBases), bezierModifier.runtimeOffsetData.pointOffset * this.blockByteLength);
        GPU.writeBuffer(this.weightBlocks.buffer, GPU.createBitData(verticesParentWeight, ["u32", "u32", "u32", "u32", "f32", "f32", "f32", "f32"]), bezierModifier.runtimeOffsetData.pointOffset * this.weightBlockByteLength);
        this.updateAllocationData(bezierModifier);
    }

    updateAllocationData(/** @type {BezierModifier} */bezierModifier) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(bezierModifier);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (bezierModifier.runtimeOffsetData.allocationOffset * 8) * 4);
        GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {BezierModifier} */bezierModifier) {
        if (bezierModifier.parent) {
            return new Uint32Array([bezierModifier.runtimeOffsetData.pointOffset, bezierModifier.runtimeOffsetData.animationOffset, bezierModifier.runtimeOffsetData.animationWeightOffset, bezierModifier.MAX_POINTS, bezierModifier.MAX_ANIMATIONS, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.runtimeOffsetData.allocationOffset, this.myType]);
        } else {
            return new Uint32Array([bezierModifier.runtimeOffsetData.pointOffset, bezierModifier.runtimeOffsetData.animationOffset, bezierModifier.runtimeOffsetData.animationWeightOffset, bezierModifier.MAX_POINTS, bezierModifier.MAX_ANIMATIONS, 0, 0, this.myType]);
        }
    }

    setAnimationData(/** @type {BezierModifier} */bezierModifier, animationData, animtaionIndex) {
        GPU.writeBuffer(this.animations.buffer, new Float32Array(animationData), (bezierModifier.runtimeOffsetData.animationOffset + animtaionIndex) * this.blockByteLength);
    }

    updateParent(/** @type {BezierModifier} */bezierModifier) {
        let allocationData;
        if (bezierModifier.parent) {
            allocationData = new Uint32Array([bezierModifier.runtimeOffsetData.pointOffset, bezierModifier.runtimeOffsetData.animationOffset, bezierModifier.runtimeOffsetData.animationWeightOffset, bezierModifier.MAX_POINTS, bezierModifier.MAX_ANIMATIONS, objectToNumber[bezierModifier.parent.type], bezierModifier.parent.runtimeOffsetData.allocationOffset, this.myType]);
        } else {
            allocationData = new Uint32Array([bezierModifier.runtimeOffsetData.pointOffset, bezierModifier.runtimeOffsetData.animationOffset, bezierModifier.runtimeOffsetData.animationWeightOffset, bezierModifier.MAX_POINTS, bezierModifier.MAX_ANIMATIONS, 0, 0, this.myType]);
        }
        console.log(allocationData)
        GPU.writeBuffer(this.allocations.buffer, allocationData, (bezierModifier.runtimeOffsetData.allocationOffset * 8) * 4);
        GPU.writeBuffer(bezierModifier.objectDataBuffer, allocationData);
    }

    setGroup() {
        this.renderingGizumoGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr_Vsr"), [this.renderingVertices.buffer, this.selectedVertices.buffer, this.weightBlocks.buffer]); // 表示用
        this.animationApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.animations.buffer, this.animationWights.buffer, this.allocations.buffer]); // アニメーション用
        this.applyParentGroup = GPU.createGroup(GPU.getGroupLayout("Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.allocations.buffer]); // 子の変形用データ
        this.parentApplyGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), [this.renderingVertices.buffer, this.baseVertices.buffer, this.allocations.buffer, this.weightBlocks.buffer]); // 親の変形を適応するた
    }
}
class ArmatureData extends RuntimeDataBase {
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

class RuntimeData {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.graphicMeshData = new GraphicMeshData(app);
        this.armatureData = new ArmatureData(app);
        this.bezierModifierData = new BezierModifierData(app);
    }

    getID(object) {
        console.log("呼び出された")
        let index = 0;
        if (object.type == "ベジェモディファイア") {
            index = this.bezierModifierData.order.indexOf(object);
        }
        return index;
    }

    append(runtimeData, object) {
        runtimeData.append(object);
        runtimeData.setOffset(object);
    }

    delete(runtimeData, object) {
        runtimeData.delete(object);
        runtimeData.setAllOffset();
    }
}

class Objects {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.animationCollectors = [];
        this.bezierModifiers = [];
        this.graphicMeshs = [];
        this.armatures = [];
        this.keyframeBlocks = [];

        this.allObject = [];
    }

    destroy() {
        this.allObject.length = 0;
        this.animationCollectors.length = 0;
        this.bezierModifiers.length = 0;
        this.graphicMeshs.length = 0;
        this.armatures.length = 0;
        this.keyframeBlocks.length = 0;
    }

    createObject(data) {
        let objectType = data.objectType;
        let dataType = data.dataType
        if (objectType == "アニメーションコレクター") {
            return new AnimationCollector("名称未設定");
        }else if (objectType == "グラフィックメッシュ") {
            return new GraphicMesh("名称未設定", undefined, this.app.options.getPrimitiveData("graphicMesh", dataType));
        } else if (objectType == "ベジェモディファイア") {
            return new BezierModifier("名称未設定", undefined, this.app.options.getPrimitiveData("bezierModifier", dataType));
        } else if (objectType == "アーマチュア") {
            return new Armature("名称未設定", undefined, this.app.options.getPrimitiveData("boneModifer", dataType));
        }
    }

    createObjectAndSetUp(data) {
        let object;
        if (data.saveData) { // セーブデータからオブジェクトを作る
            data = data.saveData;
            if (!data.type || data.type == "グラフィックメッシュ") {
                object = new GraphicMesh(data.name,data.id, data);
                this.graphicMeshs.push(object);
                this.isChangeObjectsZindex = true;
            } else if (data.type == "ベジェモディファイア") {
                object = new BezierModifier(data.name,data.id, data);
                this.bezierModifiers.push(object);
            } else if (data.type == "アーマチュア") {
                console.log(data)
                object = new Armature(data.name,data.id,data);
                // object.init(data);
                this.armatures.push(object);
            } else if (data.type == "アニメーションコレクター" || data.type == "am") {
                object = new AnimationCollector(data.name,data.id);
                object.init(data);
                this.animationCollectors.push(object);
                managerForDOMs.update(this.animationCollectors);
            }
        } else { // 空のオブジェクトを作る
            let objectType = data.objectType;
            let dataType = data.dataType
            if (objectType == "アニメーションコレクター") {
                object = new AnimationCollector("名称未設定");
                this.animationCollectors.push(object);
                managerForDOMs.update(this.animationCollectors);
            } else {
                if (objectType == "グラフィックメッシュ") {
                    object = new GraphicMesh("名称未設定", undefined, this.app.options.getPrimitiveData("graphicMesh", dataType));
                    this.graphicMeshs.push(object);
                    this.isChangeObjectsZindex = true;
                } else if (objectType == "ベジェモディファイア") {
                    object = new BezierModifier("名称未設定", undefined, this.app.options.getPrimitiveData("bezierModifier", dataType));
                    this.bezierModifiers.push(object);
                } else if (objectType == "アーマチュア") {
                    object = new Armature("名称未設定", undefined, this.app.options.getPrimitiveData("boneModifer", dataType));
                    this.armatures.push(object);
                }
            }
        }
        pushArray(this.allObject,object);
        return object;
    }

    // オブジェクトの所属する配列を返す
    searchArrayFromObject(object) {
        if (object.type == "グラフィックメッシュ") {
            return this.graphicMeshs;
        } else if (object.type == "ベジェモディファイア") {
            return this.bezierModifiers;
        } else if (object.type == "アーマチュア") {
            return this.armatures;
        } else if (object.type == "アニメーションコレクター") {
            return this.animationCollectors;
        } else if (object.type == "キーフレームブロック") {
            return this.keyframeBlocks;
        }
    }

    // 属性から所属する配列を返す
    searchArrayFromType(type) {
        if (type == "グラフィックメッシュ") {
            return this.graphicMeshs;
        } else if (type == "ベジェモディファイア") {
            return this.bezierModifiers;
        } else if (type == "アーマチュア") {
            return this.armatures;
        } else if (type == "アニメーションコレクター") {
            return this.animationCollectors;
        } else if (type == "キーフレームブロック") {
            return this.keyframeBlocks;
        }
    }

    // オブジェクトの削除
    deleteObject(object) {
        indexOfSplice(this.searchArrayFromObject(object), object);
        indexOfSplice(this.allObject, object);
        this.app.scene.runtimeData.delete(object.runtimeData, object);
    }

    appendObject(object) {
        this.app.hierarchy.addHierarchy("",object); // ヒエラルキーから削除
        this.searchArrayFromType(object.type).push(object);
        this.allObject.push(object);
    }
}

// オブジェクトの保持・設定
export class Scene {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.objects = new Objects(app);

        this.renderingOrder = [];

        this.text = [];

        // フレーム範囲
        this.frame_start = 0;
        this.frame_end = 30;

        // 現在のフレーム
        this.frame_current = 0;

        // 背景
        this.world = new World(app);

        this.runtimeData = new RuntimeData(app);

        this.state = new State(app);

        this.maskTextures = [
            new MaskTexture("base", [1,1]),
            new MaskTexture("test1", [1024,1024]),
        ];

        if (true) { // 白のマスクテクスチャ
            const commandEncoder = device.createCommandEncoder();
            const value = this.maskTextures[0];
            const maskRenderPass = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: value.textureView,
                        clearValue: { r: 1, g: 0, b: 0, a: 0 },
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
            });
            // 処理の終了と送信
            maskRenderPass.end();
            device.queue.submit([commandEncoder.finish()]);
        }

        const updateKeyframe = () => {
            this.updateAnimation(this.frame_current);
        }

        managerForDOMs.set({o: this, g: "_", i: "frame_current"}, null, updateKeyframe);
    }

    init() {
    }

    // 選択している頂点のBBoxを取得
    async getSelectVerticesBBox(verticesBuffer, selectBuffer) {
        GPU.runComputeShader(calculateLimitVerticesBBoxPipeline, [BBoxGroup0, GPU.createGroup(GPU.getGroupLayout("Csr_Csr"), [verticesBuffer, selectBuffer])], Math.ceil(verticesBuffer.size / 4 / 2 / 64));
        return await GPU.getBBoxBuffer(BBoxResultBuffer);
    }

    // 選択しているボーンのBBoxを取得
    async getSelectBonesBBox(bonesBuffer, selectBuffer) {
        GPU.runComputeShader(calculateLimitBoneBBoxPipeline, [BBoxGroup0, GPU.createGroup(GPU.getGroupLayout("Csr_Csr"), [bonesBuffer, selectBuffer])], Math.ceil(bonesBuffer.size / 4 / 2 / 64));
        return await GPU.getBBoxBuffer(BBoxResultBuffer);
    }

    // 選択している頂点の中央点を取得
    async getSelectVerticesCenter(verticesBuffer, selectBuffer) {
        const BBox = await this.getSelectVerticesBBox(verticesBuffer, selectBuffer);
        return vec2.averageR(BBox);
    }

    // 選択している頂点の中央点を取得
    async getSelectBonesCenter(bonesBuffer, selectBuffer) {
        const BBox = await this.getSelectBonesBBox(bonesBuffer, selectBuffer);
        return vec2.averageR(BBox);
    }

    // オブジェクトとの当たり判定
    async selectedForObject(point, option = {types: ["グラフィックメッシュ", "アーマチュア", "ベジェモディファイア"], depth: true}) {
        const optionBuffer = GPU.createUniformBuffer(4, [0], ["u32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, [...point], ["f32"]);
        const result = [];
        const promises = this.objects.allObject
            .filter(object => option.types.includes(object.type) && !("visible" in object && !object.visible))
            .map(async (object) => {
                const resultBuffer = GPU.createStorageBuffer(4, [0], ["u32"]);
                let hitTestGroup;
                if (object.type === "グラフィックメッシュ") {
                    // GPU.consoleBufferData(this.runtimeData.graphicMeshData.renderingVertices.buffer, ["f32","f32"]);
                    // GPU.consoleBufferData(this.runtimeData.graphicMeshData.meshes.buffer, ["u32","u32","u32"]);
                    // GPU.consoleBufferData(object.objectMeshData, ["u32"]);
                    hitTestGroup = GPU.createGroup(
                        GPU.getGroupLayout("Csrw_Csr_Csr_Cu_Cu_Cu"),
                        [
                            resultBuffer,
                            this.runtimeData.graphicMeshData.renderingVertices.buffer,
                            this.runtimeData.graphicMeshData.meshes.buffer,
                            object.objectMeshData,
                            optionBuffer,
                            pointBuffer
                        ]
                    );
                    GPU.runComputeShader(polygonsHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_MESHES / 64));
                } else if (object.type === "アーマチュア") {
                    hitTestGroup = GPU.createGroup(
                        GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"),
                        [
                            resultBuffer,
                            this.runtimeData.armatureData.renderingVertices.buffer,
                            object.objectDataBuffer,
                            optionBuffer,
                            pointBuffer
                        ]
                    );
                    GPU.runComputeShader(boneHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_BONES / 64));
                } else if (object.type === "ベジェモディファイア") {
                    hitTestGroup = GPU.createGroup(
                        GPU.getGroupLayout("Csrw_Csr_Cu_Cu_Cu"),
                        [
                            resultBuffer,
                            this.runtimeData.bezierModifierData.renderingVertices.buffer,
                            object.objectDataBuffer,
                            optionBuffer,
                            pointBuffer
                        ]
                    );
                    GPU.runComputeShader(bezierModifierHitTestPipeline, [hitTestGroup], Math.ceil(object.MAX_VERTICES / 64));
                }
                const resultBufferData = await GPU.getU32BufferData(resultBuffer, 4);
                if (resultBufferData[0] === 1) {
                    return object;
                } else {
                    return null;
                }
            });
        const allResults = await Promise.all(promises);
        for (const obj of allResults) {
            if (obj) result.push(obj);
        }
        if (option.depth) {
            result.sort((a, b) => b.zIndex - a.zIndex);
        }
        return result;
    }

    update() {
        if (!(this.objects.armatures.length || this.objects.graphicMeshs.length || this.objects.bezierModifiers.length)) return ;
        // バグ(アニメーションindexを考慮してないのでアニメーションが2個以上あると書き込まれるweightがかぶる)
        for (const graphicMesh of this.objects.graphicMeshs) {
            graphicMesh.animationBlock.list.forEach(animation => {
                GPU.writeBuffer(this.runtimeData.graphicMeshData.animationWights.buffer, new Float32Array([animation.weight]), animation.worldWeightIndex * 4);
            });
        }
        for (const bezierModifier of this.objects.bezierModifiers) {
            bezierModifier.animationBlock.list.forEach(animation => {
                GPU.writeBuffer(this.runtimeData.bezierModifierData.animationWights.buffer, new Float32Array([animation.weight]), animation.worldWeightIndex * 4);
            });
        }
        for (const armature of this.objects.armatures) {
            armature.allBone.forEach(bone => {
                if (bone) {
                    GPU.writeBuffer(this.runtimeData.armatureData.runtimeAnimationData.buffer, new Float32Array([bone.x, bone.y, bone.sx, bone.sy, bone.r]), (armature.runtimeOffsetData.boneOffset + bone.index) * this.runtimeData.armatureData.boneBlockByteLength);
                }
            });
        }
        const computeCommandEncoder = device.createCommandEncoder();
        const computePassEncoder = computeCommandEncoder.beginComputePass();
        if (this.objects.graphicMeshs.length) {
            computePassEncoder.setPipeline(animationApplyPipeline);
            computePassEncoder.setBindGroup(0, this.runtimeData.graphicMeshData.animationApplyGroup); // 全てのグラフィックスメッシュのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }
        if (this.objects.bezierModifiers.length) {
            computePassEncoder.setPipeline(bezierAnimationApplyPipeline);
            computePassEncoder.setBindGroup(0, this.runtimeData.bezierModifierData.animationApplyGroup); // 全てのベジェモディファイアのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.bezierModifiers.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }
        if (this.objects.armatures.length) {
            computePassEncoder.setPipeline(boneAnimationApplyPipeline);
            computePassEncoder.setBindGroup(0, this.runtimeData.armatureData.animationApplyGroup); // 全てのアーマチュアのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.armatures.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }

        // ボーンを伝播
        computePassEncoder.setPipeline(propagateBonePipeline);
        computePassEncoder.setBindGroup(0, this.runtimeData.armatureData.propagateGroup); // 全てのアーマチュアのデータをバインド
        for (const nowDepthData of this.runtimeData.armatureData.propagate) {
            computePassEncoder.setBindGroup(1, nowDepthData.group); // 全てのアーマチュアのデータをバインド
            computePassEncoder.dispatchWorkgroups(Math.ceil(nowDepthData.boneNum / 64), 1, 1); // ワークグループ数をディスパッチ
        }

        const childrenRoop = (children) => {
            for (const child of children) {
                if (child.parent) {
                    if (child.type == "ベジェモディファイア") {
                        // ベジェモディファイア親の変形を適応
                        computePassEncoder.setBindGroup(0, child.individualGroup);
                        computePassEncoder.dispatchWorkgroups(Math.ceil(child.verticesNum / 64), 1, 1); // ワークグループ数をディスパッチ
                    }
                }
                if (child.children) { // 子要素がある場合ループする
                    childrenRoop(child.children.objects);
                }
            }
        }
        computePassEncoder.setBindGroup(1, this.runtimeData.bezierModifierData.parentApplyGroup);
        computePassEncoder.setBindGroup(2, this.runtimeData.armatureData.applyParentGroup);
        computePassEncoder.setPipeline(treeAnimationApplyPipeline);
        childrenRoop(this.app.hierarchy.root);

        // グラフィックメッシュ親の変形を適応
        if (this.objects.graphicMeshs.length) {
            computePassEncoder.setBindGroup(1, this.runtimeData.bezierModifierData.applyParentGroup);
            computePassEncoder.setBindGroup(0, this.runtimeData.graphicMeshData.parentApplyGroup);
            computePassEncoder.setPipeline(parallelAnimationApplyPipeline);
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.graphicMeshs.length / 8), Math.ceil(this.app.appConfig.MAX_VERTICES_PER_GRAPHICMESH / 8), 1); // ワークグループ数をディスパッチ
        }

        if (this.objects.armatures.length) {
            computePassEncoder.setBindGroup(0, this.runtimeData.armatureData.calculateVerticesPositionGroup);
            computePassEncoder.setPipeline(calculateBoneVerticesPipeline);
            computePassEncoder.dispatchWorkgroups(Math.ceil(this.objects.armatures.length / 8), Math.ceil(this.app.appConfig.MAX_BONES_PER_ARMATURE / 8), 1); // ワークグループ数をディスパッチ
        }

        computePassEncoder.end();

        device.queue.submit([computeCommandEncoder.finish()]);
    }

    getAllObjectFromType(types) {
        return this.objects.allObject.filter(object => types.includes(object.type));
    }

    async getSaveData() {
        const conversion = {"グラフィックメッシュ": "graphicMeshs", "ベジェモディファイア": "bezierModifiers", "アーマチュア": "armatures", "アニメーションコレクター": "animationCollectors", "キーフレームブロック": "keyframeBlocks"};
        const result = {graphicMeshs: [], bezierModifiers: [], armatures: [], rotateMOdifiers: [], animationCollectors: [], keyframeBlocks: []};
        // 各オブジェクトの保存処理を並列化
        const promises = this.objects.allObject.map(async (object) => {
            return { type: object.type, data: await object.getSaveData() };
        });
        const resolved = await Promise.all(promises);
        // 結果を type ごとにまとめる
        for (const { type, data } of resolved) {
            result[conversion[type]].push(data);
        }
        return result;
    }

    // フレームを適応
    updateAnimation(frame) {
        for (const keyframeBlock of this.objects.keyframeBlocks) {
            keyframeBlock.update(frame);
        }
    }

    // アニメーションコレクターの適応
    updateAnimationCollectors() {
        for (const animtionManager of this.objects.animationCollectors) {
            animtionManager.update();
        }
    }

    destroy() {
        this.maskTextures.length = 0;
        this.app.hierarchy.destroy();
        this.objects.destroy();
    }

    appendMaskTexture(name) {
        pushArray(this.maskTextures, new MaskTexture(name, this.app.appConfig.MASKTEXTURESIZE));
    }

    deleteMaskTexture(maskTexture) {
        if (maskTexture.renderingObjects.length || maskTexture.useObjects.length) {
            console.warn("削除しようとしたマスクは参照されているため削除できません");
        } else {
            managerForDOMs.deleteObject(maskTexture);
            this.maskTextures.splice(this.maskTextures.indexOf(maskTexture), 1);
        }
    }

    searchMaskTextureFromName(name) {
        for (const texture of this.maskTextures) {
            if (texture.name == name) return texture;
        }
        console.warn("マスクテクスチャが見つかりませんでした");
        return null;
    }

    searchObjectFromID(id) {
        for (const object of this.objects.allObject) {
            if (object.id == id) {
                return object;
            }
        }
        return null;
    }

    // 表示順番の再計算
    updateRenderingOrder() {
        this.renderingOrder = [...this.objects.graphicMeshs].sort((a, b) => a.zIndex - b.zIndex);
        managerForDOMs.update("表示順番");
    }
}

class State {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.currentMode = "オブジェクト";
        this.activeObject = null; // 注目されているオブジェクト
        this.selectedObject = []; // 選択されているオブジェクト
    }

    selectAll() {
        this.app.scene.objects.allObject
    }

    setSelectedObject(object, append = false) {
        if (!append) {
            this.selectedObject.forEach((object) => {
                object.selected = false;
            })
            this.selectedObject.length = 0;
        }
        if (!object) return ;
        if (!this.isSelect(object)) { // 選択されていない
            this.selectedObject.push(object);
        }
        console.log(object)
        object.selected = true;
    }

    setActiveObject(object) {
        changeParameter(this, "activeObject", object);
        managerForDOMs.update("アクティブオブジェクト");
    }

    setModeForSelected(mode) {
        console.log("モードの切り替え",mode)
        if (this.selectedObject.length == 0) return ;
        changeParameter(this, "currentMode", mode);
        this.currentMode = mode;
        for (const object of this.selectedObject) {
            object.mode = mode;
        }
        managerForDOMs.update(this.selectedObject);
    }

    isSelect(object) {
        return this.selectedObject.includes(object);
    }

    getSelectBone() {
        const result = [];
        for (const /** @type {Armature} */ armature of this.selectedObject.filter(object => object.type == "アーマチュア")) {
            result.push(...armature.allBone.filter(bone => bone && bone.selectedBone));
        }
        return result;
    }

    getSelectVertices() {
        const result = [];
        for (const object of this.selectedObject) {
            if (object.type == "アーマチュア") {
                for (const bone of object.allBone) {
                    if (bone.baseHead.selected) {
                        result.push(bone.baseHead);
                    }
                    if (bone.baseTail.selected) {
                        result.push(bone.baseTail);
                    }
                }
            } else if (object.type == "グラフィックメッシュ") {
                result.push(...object.allVertices.filter(vertex => vertex && vertex.selected));
            } else if (object.type == "ベジェモディファイア") {
                for (const point of object.allPoint) {
                    if (point.basePoint.selected) {
                        result.push(point.basePoint);
                    }
                    if (point.baseLeftControlPoint.selected) {
                        result.push(point.baseLeftControlPoint);
                    }
                    if (point.baseRightControlPoint.selected) {
                        result.push(point.baseRightControlPoint);
                    }
                }
            }
        }
        return result;
    }
}

class World {
    constructor() {
        this.color = [0,0,0,1];
    }
}

class MaskTexture {
    constructor(name, size = [1024,1024]) {
        this.id = createID();
        this.type = "マスク";
        this.name = name;
        this.textureSize = [...size];
        this.texture= GPU.createTexture2D(this.textureSize,"r8unorm");
        this.textureView = this.texture.createView();
        this.renderingObjects = [];
        this.useObjects = [];
    }
}