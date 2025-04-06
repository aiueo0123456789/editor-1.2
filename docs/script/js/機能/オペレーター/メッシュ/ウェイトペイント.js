import { GPU } from "../../../webGPU.js";

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
}`);

export class WeightPaintCommand {
    constructor(target, paintTargetIndex, weight, decayType, radius) {
        this.configBuffer = GPU.createUniformBuffer(32, undefined, ["u32","f32","u32","f32"]);
        this.pointBuffer = GPU.createUniformBuffer(8, undefined, ["f32","f32"]);
        this.configGroup = GPU.createGroup(GPU.getGroupLayout("Cu_Cu"), [{item: this.configBuffer, type: "b"}, {item: this.pointBuffer, type: "b"}]);
        GPU.writeBuffer(this.configBuffer, GPU.createBitData([decayType,radius,paintTargetIndex,weight],["u32","f32","u32","f32"]))
        this.target = target;
        this.paintBuffer = GPU.copyBufferToNewBuffer(target.parentWeightBuffer);
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
        GPU.copyBuffer(this.targetBuffer, this.paintBuffer);
        this.target.isChange = true;
    }

    execute() {
        GPU.copyBuffer(this.paintBuffer, this.targetBuffer);
    }

    undo() {
        this.target.isChange = true;
        GPU.copyBuffer(this.originalBuffer, this.targetBuffer);
    }
}