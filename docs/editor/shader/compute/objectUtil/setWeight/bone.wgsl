struct Allocation {
    vertexBufferOffset: u32,
    animationBufferOffset: u32,
    weightBufferOffset: u32,
    MAX_VERTICES: u32,
    MAX_ANIMATIONS: u32,
    parentType: u32, // 親がなければ0
    parentIndex: u32, // 親がなければ0
    myType: u32,
}

struct BoneAllocation {
    boneOffset: u32,
    animationBufferOffset: u32,
    weightBufferOffset: u32,
    MAX_BONES: u32,
    MAX_ANIMATIONS: u32,
    parentType: u32, // 親がなければ0
    parentIndex: u32, // 親がなければ0
    myType: u32,
}

struct WeightBlock {
    indexs: vec4<u32>,
    weights: vec4<f32>,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> weightBlocks: array<WeightBlock>; // indexと重みのデータ
@group(0) @binding(1) var<storage, read> baseVertices: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> allocation: Allocation; // 配分
@group(0) @binding(3) var<storage, read> boneVertices: array<BoneVertices>;
@group(0) @binding(4) var<uniform> allocationBone: BoneAllocation; // 配分

fn pointToLineDistance(point: vec2<f32>, lineStart: vec2<f32>, lineEnd: vec2<f32>) -> f32 {
    // 線分が点の場合
    if (all(lineStart == lineEnd)) {
        return distance(point, lineStart);
    }

    let lineDir = lineEnd - lineStart;
    let pointDir = point - lineStart;
    let t = dot(pointDir, lineDir) / dot(lineDir, lineDir);

    // 点が線分の外側にある場合
    if (t < 0.0) {
        return distance(point, lineStart);
    } else if (t > 1.0) {
        return distance(point, lineEnd);
    }

    // 点が線分の内側にある場合
    let projection = lineStart + t * lineDir;
    return distance(point, projection);
}

fn mathWeight(dist: f32) -> f32 {
    return pow((dist - 40.0) / 1000.0, 10.0);
}

fn calculateWeight(position: vec2<f32>) -> WeightBlock {
    var output: WeightBlock;
    let inf = 999999999u;
    output.indexs = vec4<u32>(inf);
    output.weights = vec4<f32>(99999999999.0);
    for (var boneIndex = allocationBone.boneOffset; boneIndex < allocationBone.boneOffset + allocationBone.MAX_BONES; boneIndex ++) {
        let bone = boneVertices[boneIndex];
        let lineStart = bone.h;
        let lineEnd = bone.t;
        let dist = pointToLineDistance(position, lineStart, lineEnd);

        let weight = mathWeight(dist);

        var maxIndex = 0u;
        var maxValue = 0.0;
        for (var i = 0u; i < 4u; i ++) {
            if (output.weights[i] >= maxValue) {
                maxIndex = i;
                maxValue = output.weights[i];
            }
        }
        if (weight < maxValue) {
            output.indexs[maxIndex] = boneIndex - allocationBone.boneOffset;
            output.weights[maxIndex] = weight;
        }
    }
    // 見つからなかったものは無効にする
    var sumWeight = 0.0;
    for (var i = 0u; i < 4u; i ++) {
        if (inf != output.indexs[i]) {
            sumWeight += output.weights[i];
        }
    }
    for (var i = 0u; i < 4u; i ++) {
        if (inf == output.indexs[i]) {
            output.indexs[i] = 0u;
            output.weights[i] = 0.0;
        } else {
            output.weights[i] = sumWeight - output.weights[i]; // 正規化
        }
    }
    sumWeight = 0.0;
    for (var i = 0u; i < 4u; i ++) {
        sumWeight += output.weights[i];
    }
    for (var i = 0u; i < 4u; i ++) {
        output.weights[i] /= sumWeight;
    }
    return output;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (allocation.MAX_VERTICES <= global_id.x) {
        return;
    }
    let verticesIndex = global_id.x + allocation.vertexBufferOffset;

    weightBlocks[verticesIndex] = calculateWeight(baseVertices[verticesIndex]);
}