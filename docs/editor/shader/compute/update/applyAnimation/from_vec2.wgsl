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

@group(0) @binding(0) var<storage, read_write> rendering: array<vec2<f32>>; // 出力
@group(0) @binding(1) var<storage, read> base: array<vec2<f32>>; // 元
@group(0) @binding(2) var<storage, read> animations: array<vec2<f32>>; // アニメーション
@group(0) @binding(3) var<storage, read> weights: array<f32>; // 重み
@group(0) @binding(4) var<storage, read> allocationArray: array<Allocation>; // 配分

fn isNaN(x: f32) -> bool {
    return x != x;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let objectIndex = global_id.x;
    let vertexIndex = global_id.y;
    if (arrayLength(&allocationArray) <= objectIndex) { // オブジェクト数を超えているか
        return ;
    }
    if (allocationArray[objectIndex].MAX_VERTICES <= vertexIndex) { // 頂点数を超えているか
        return ;
    }

    var add = vec2<f32>(0.0,0.0);
    let animationBufferStartIndex = allocationArray[objectIndex].animationBufferOffset + vertexIndex;
    for (var animationIndex = 0u; animationIndex < allocationArray[objectIndex].MAX_ANIMATIONS; animationIndex ++) {
        if (!isNaN(animations[animationBufferStartIndex + animationIndex * allocationArray[objectIndex].MAX_VERTICES].x) && !isNaN(animations[animationBufferStartIndex + animationIndex * allocationArray[objectIndex].MAX_VERTICES].y)) {
            add += animations[animationBufferStartIndex + animationIndex * allocationArray[objectIndex].MAX_VERTICES] * weights[allocationArray[objectIndex].weightBufferOffset + animationIndex];
        }
    }
    let fixVertexIndex = allocationArray[objectIndex].vertexBufferOffset + vertexIndex;
    rendering[fixVertexIndex] = base[fixVertexIndex] + add;
}