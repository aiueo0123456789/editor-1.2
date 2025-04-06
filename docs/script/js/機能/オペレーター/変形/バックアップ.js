import { loadFile } from "../../../utility.js";
import { GPU } from "../../../webGPU.js";
import { setBaseBBox, setParentModifierWeight } from "../../../オブジェクト/オブジェクトで共通の処理.js";

// const pipelines = {
//     graphicMesh: {rotate: },
// };

const updateUV = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu")], `
struct BBox {
    min: vec2<f32>,
    max: vec2<f32>,
};
@group(0) @binding(0) var<storage, read_write> uv: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> imageBBox: BBox;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&uv) <= index) {
        return;
    }
    let a = (vertices[index] - imageBBox.min) / (imageBBox.max - imageBBox.min);
    uv[index] = vec2<f32>(a.x, 1.0 - a.y);
}
`);

const verticesTranslatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/vertices/translate.wgsl"));

const verticesResizePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/vertices/resize.wgsl"));

const verticesRotatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/vertices/rotate.wgsl"));

const boneAnimationTranslatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/boneAnimation/translate.wgsl"));

const boneAnimationRotatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/boneAnimation/rotate.wgsl"));

const boneAnimationResizePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/boneAnimation/resize.wgsl"));

const createInitDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr"), GPU.getGroupLayout("Cu_Cu_Cu")], `
@group(0) @binding(0) var<storage, read_write> weight: array<f32>;
@group(0) @binding(1) var<storage, read> verticesIndexs: array<u32>;
@group(0) @binding(2) var<storage, read> vertices: array<vec2<f32>>;
@group(1) @binding(0) var<uniform> proportionalEditType: u32;
@group(1) @binding(1) var<uniform> proportionalSize: f32;
@group(1) @binding(2) var<uniform> pointOfEffort: vec2<f32>;

fn arrayIncludes(value: u32) -> bool {
    for (var i = 0u; i < arrayLength(&verticesIndexs); i = i + 1u) {
        if (verticesIndexs[i] == value) {
            return true;
        }
    }
    return false;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&vertices) <= index) {
        return;
    }
    if (proportionalEditType == 0u) { // 通常
        if (arrayIncludes(index)) {
            weight[index] = 1.0;
        } else {
            weight[index] = 0.0;
        }
    } else if (proportionalEditType == 1u) { // 1次関数
        if (arrayIncludes(index)) {
            weight[index] = 1.0;
        } else {
            let dist = distance(vertices[index], pointOfEffort);
            if (dist < proportionalSize) {
                weight[index] = 1.0 - dist / proportionalSize;
            } else {
                weight[index] = 0.0;
            }
        }
    } else if (proportionalEditType == 2u) { // 2次関数
        if (arrayIncludes(index)) {
            weight[index] = 1.0;
        } else {
            let dist = distance(vertices[index], pointOfEffort);
            if (dist < proportionalSize) {
                weight[index] = pow((1.0 - dist / proportionalSize), 2.0);
            } else {
                weight[index] = 0.0;
            }
        }
    }
}
`);

export class TransformCommand {
    constructor() {
        this.target = null;
        this.worldOriginalBuffer = null;
        this.valueBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32"]);
        this.pointOfEffortBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32","f32"]);
        this.proportionalEditTypeBuffer = GPU.createUniformBuffer(4, undefined, ["u32"]);
        this.proportionalSizeBuffer = GPU.createUniformBuffer(4, undefined, ["f32"]);
        this.configGroup = GPU.createGroup(GPU.getGroupLayout("Cu_Cu_Cu"), [{item: this.proportionalEditTypeBuffer, type: "b"}, {item: this.proportionalSizeBuffer, type: "b"}, {item: this.pointOfEffortBuffer, type: "b"}]);
    }

    // 基準となるデータを作る
    init(target, selectIndexs) {
        this.target = target;
        if (target.type == "ボーンアニメーション") {
            let minDepthIndex = [];
            let minDepth = Infinity;
            for (let index of selectIndexs) {
                const depth = target.belongObject.editor.getBoneDepthFromIndex(index);
                console.log(depth)
                if (depth < minDepth) {
                    minDepth = depth;
                    minDepthIndex = [index];
                } else if (depth == minDepth) {
                    minDepthIndex.push(index);
                }
            }
            if (minDepthIndex.length) {
                const selectIndexBuffer = GPU.createStorageBuffer(minDepthIndex.length * 4, minDepthIndex, ["u32"]);
                this.selectIndexs = minDepthIndex;
                this.targetBuffer = target.s_verticesAnimationBuffer;
                this.worldOriginalBuffer = GPU.copyBufferToNewBuffer(target.s_verticesAnimationBuffer); // ターゲットの頂点のワールド座標を取得
                this.transformGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu"),  [{item: this.targetBuffer, type: "b"}, {item: this.worldOriginalBuffer, type: "b"}, {item: target.getWorldVerticesMatrixBuffer(), type: "b"}, {item: target.belongObject.parentsBuffer, type: "b"}, {item: selectIndexBuffer, type: "b"}, {item: this.valueBuffer, type: "b"}]);
                this.workNumX = Math.ceil(this.target.belongObject.boneNum / 64);
                this.originalBuffer = GPU.copyBufferToNewBuffer(this.targetBuffer); // ターゲットのオリジナル状態を保持
            } else {
                this.workNumX = 0;
            }
        } else {
            const selectIndexBuffer = GPU.createStorageBuffer(selectIndexs.length * 4, selectIndexs, ["u32"]);
            if (target.type == "頂点アニメーション") {
                this.worldOriginalBuffer = target.getWorldVerticesPositionBuffer(); // ターゲットの頂点のワールド座標を取得
                this.targetBuffer = target.s_verticesAnimationBuffer;
                this.baseBuffer = target.belongObject.s_baseVerticesPositionBuffer; // 頂点の基準
                this.workNumX = Math.ceil(this.target.belongObject.verticesNum / 64);
                this.weightBuffer = GPU.createStorageBuffer(this.target.belongObject.verticesNum * 4, undefined, ["f32"]);
            } else {
                this.worldOriginalBuffer = GPU.copyBufferToNewBuffer(target.s_baseVerticesPositionBuffer); // ターゲットの頂点のワールド座標を取得
                this.targetBuffer = target.s_baseVerticesPositionBuffer;
                this.baseBuffer = GPU.createStorageBuffer(target.verticesNum * 2 * 4, undefined, ["f32"]); // 頂点の基準
                this.workNumX = Math.ceil(this.target.verticesNum / 64);
                this.weightBuffer = GPU.createStorageBuffer(target.verticesNum * 4, undefined, ["f32"]);
            }
            this.weightAndIndexsGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"),  [{item: this.weightBuffer, type: "b"}, {item: selectIndexBuffer, type: "b"}, {item: this.worldOriginalBuffer, type: "b"}]);
            this.transformGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu"),  [{item: this.targetBuffer, type: "b"}, {item: this.worldOriginalBuffer, type: "b"}, {item: this.baseBuffer, type: "b"}, {item: this.weightBuffer, type: "b"}, {item: this.pointOfEffortBuffer, type: "b"}, {item: this.valueBuffer, type: "b"}]);
            this.originalBuffer = GPU.copyBufferToNewBuffer(this.targetBuffer); // ターゲットのオリジナル状態を保持
        }
    }

    setPointOfEffort(pointOfEffort) {
        GPU.writeBuffer(this.pointOfEffortBuffer, new Float32Array(pointOfEffort));
    }

    transform(pipeline, value, proportionalEditType, proportionalSize) {
        GPU.writeBuffer(this.valueBuffer, new Float32Array(value));
        if (!this.workNumX) {
            return ;
        }
        if (this.target.type == "ボーンアニメーション") {
            GPU.runComputeShader(pipeline, [this.transformGroup], this.workNumX);
            this.target.belongObject.isChange = true;
        } else {
            GPU.writeBuffer(this.proportionalEditTypeBuffer, new Uint32Array([proportionalEditType]));
            GPU.writeBuffer(this.proportionalSizeBuffer, new Float32Array([proportionalSize]));
            GPU.runComputeShader(createInitDataPipeline,[this.weightAndIndexsGroup, this.configGroup], this.workNumX);

            GPU.runComputeShader(pipeline, [this.transformGroup], this.workNumX);
            if (this.target.type == "ボーンモディファイア") {
                this.target.calculateBaseBoneData();
            } else if (this.target.type == "グラフィックメッシュ") {
                GPU.runComputeShader(updateUV,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu"), [this.target.s_baseVerticesUVBuffer,this.target.s_baseVerticesPositionBuffer,this.target.editor.imageBBoxBuffer])],this.workNumX);
                this.target.editor.createMesh();
            }
            if (this.target.type == "頂点アニメーション") {
                this.target.belongObject.isChange = true;
            } else {
                this.target.children?.weightReset();
                setBaseBBox(this.target);
                setParentModifierWeight(this.target);
                this.target.isChange = true;
            }
        }
    }

    // 並行移動
    translate(value, orientType, proportionalEditType, proportionalSize) {
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        if (this.target.type == "ボーンアニメーション") {
            this.transform(boneAnimationTranslatePipeline, value, proportionalEditType, proportionalSize);
        } else {
            this.transform(verticesTranslatePipeline, value, proportionalEditType, proportionalSize);
        }
    }

    // 拡大縮小
    resize(value, orientType, proportionalEditType, proportionalSize) {
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        if (this.target.type == "ボーンアニメーション") {
            this.transform(boneAnimationResizePipeline, value, proportionalEditType, proportionalSize);
        } else {
            this.transform(verticesResizePipeline, value, proportionalEditType, proportionalSize);
        }
    }

    // 回転
    rotate(value, orientType, proportionalEditType, proportionalSize) {
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        if (this.target.type == "ボーンアニメーション") {
            this.transform(boneAnimationRotatePipeline, [value], proportionalEditType, proportionalSize);
        } else {
            this.transform(verticesRotatePipeline, [value], proportionalEditType, proportionalSize);
        }
    }

    // 変形を取り消し
    cancel() {
        this.target.isChange = true;
        GPU.copyBuffer(this.originalBuffer, this.targetBuffer);
    }

    createUndoData() {
        return {undoData: {action: "変形", data: {object: this.target, target: this.targetBuffer, undo: this.originalBuffer, redo: GPU.copyBufferToNewBuffer(this.targetBuffer)}}};
    }

    do(data) {
        const object = data.object;
        GPU.copyBuffer(data.undo, data.target);
        object.isChange = true;
        if (object.type == "ボーンモディファイア") {
            object.calculateBaseBoneData();
        } else if (object.type == "グラフィックメッシュ") {
            GPU.runComputeShader(updateUV,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu"), [object.s_baseVerticesUVBuffer,object.s_baseVerticesPositionBuffer,object.editor.imageBBoxBuffer])],this.workNumX);
            object.editor.createMesh();
        }
    }
}

export const transform = new TransformCommand();
transform.translate.argumentArray = [
    {name: "変化量", type: {type: "入力", inputType: "ベクトル", option: {initValue: [0,0], axis: ["x","y"]}}},
    {name: "座標系", type: {type: "選択", choices: ["ローカル", "ワールド"]}},
    {name: "スムーズ種類", type: {type: "選択", choices: [{text: "通常", value: 0}, {text: "線形", value: 1}, , {text: "逆2乗", value: 2}]}},
    {name: "スムーズ範囲", type: {type: "入力", inputType: "数字", option: {initValue: 100}}},
];
transform.resize.argumentArray = [
    {name: "変化量", type: {type: "入力", inputType: "ベクトル", option: {initValue: [0,0], axis: ["x","y"]}}},
    {name: "座標系", type: {type: "選択", choices: ["ローカル", "ワールド"]}},
    {name: "スムーズ種類", type: {type: "選択", choices: [{text: "通常", value: 0}, {text: "線形", value: 1}, , {text: "逆2乗", value: 2}]}},
    {name: "スムーズ範囲", type: {type: "入力", inputType: "数字", option: {initValue: 100}}},
];
transform.rotate.argumentArray = [
    {name: "変化量", type: {type: "入力", inputType: "数字", option: {initValue: 0}}},
    {name: "座標系", type: {type: "選択", choices: ["ローカル", "ワールド"]}},
    {name: "スムーズ種類", type: {type: "選択", choices: [{text: "通常", value: 0}, {text: "線形", value: 1}, , {text: "逆2乗", value: 2}]}},
    {name: "スムーズ範囲", type: {type: "入力", inputType: "数字", option: {initValue: 100}}},
];