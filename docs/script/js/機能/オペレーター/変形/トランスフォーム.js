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
    constructor(target) {
        this.target = target;
    }
}

export class VerticesTransformCommand extends TransformCommand {
    constructor(target, selectIndexs) {
        this.target
    }
}

export class BoneAnimationTransformCommand extends TransformCommand {
    constructor(target, selectIndexs) {
        this.target
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