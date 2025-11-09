struct Allocation {
    pointsOffset: u32,
    shapesOffset: u32,
    shapeKeyWeightsOffset: u32,
    pointsNum: u32,
    shapeKeysNum: u32,
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
    let falloff = 1.5; // 数字を大きくすると近距離重視になる
    // 一番近いボーン二つを見つける
    var output: WeightBlock;
    var fIndex = 0u;
    var fWeight = 0.0;
    var tIndex = 0u;
    var tWeight = 0.0;
    for (var boneIndex = allocationBone.boneOffset; boneIndex < allocationBone.boneOffset + allocationBone.MAX_BONES; boneIndex ++) {
        let bone = boneVertices[boneIndex];
        let dist = pointToLineDistance(position, bone.h, bone.t);
        let weight = exp(-falloff * dist);

        if (fWeight <= weight) {
            // 1位を2位に降格
            tIndex = fIndex;
            tWeight = fWeight;
            // 1位に自分を代入
            fIndex = boneIndex - allocationBone.boneOffset;
            fWeight = weight;
        } else if (tWeight <= weight) {
            // 2位に自分を代入
            tIndex = boneIndex - allocationBone.boneOffset;
            tWeight = weight;
        }
    }
    let sumWeight = fWeight + tWeight;
    output.indexs = vec4<u32>(fIndex, tIndex, 0u, 0u);
    output.weights = vec4<f32>(fWeight / sumWeight, tWeight / sumWeight, 0.0, 0.0);
    return output;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let verticesNum = allocation.pointsNum * 3u;
    if (verticesNum <= global_id.x) {
        return;
    }
    let verticesOffset = allocation.pointsOffset * 3u;
    let verticesIndex = global_id.x + verticesOffset;

    weightBlocks[verticesIndex] = calculateWeight(baseVertices[verticesIndex]);
}