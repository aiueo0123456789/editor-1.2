struct Allocation {
    vertexBufferOffset: u32,
    animationBufferOffset: u32,
    weightBufferOffset: u32,
    MAX_NUM: u32,
    MAX_ANIMATIONS: u32,
    parentType: u32, // 親がなければ0
    parentIndex: u32, // 親がなければ0
    myType: u32,
}

struct VertexLevel {
    a: array<vec2<f32>,3>
}

@group(0) @binding(0) var<storage, read_write> rendering: array<VertexLevel>; // 出力
@group(0) @binding(1) var<storage, read> base: array<VertexLevel>; // 元
@group(0) @binding(2) var<storage, read> animations: array<VertexLevel>; // アニメーション
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
    if (allocationArray[objectIndex].MAX_NUM <= vertexIndex) { // 頂点数を超えているか
        return ;
    }

    let animationBufferStartIndex = allocationArray[objectIndex].animationBufferOffset + vertexIndex;
    for (var c = 0u; c < 3u; c ++) {
        var add = vec2<f32>(0.0);
        for (var animationIndex = 0u; animationIndex < allocationArray[objectIndex].MAX_ANIMATIONS; animationIndex ++) {
            let animationData = animations[animationBufferStartIndex + animationIndex * allocationArray[objectIndex].MAX_NUM];
            add += animationData.a[c] * weights[allocationArray[objectIndex].weightBufferOffset + animationIndex];
        }
        let fixVertexIndex = allocationArray[objectIndex].vertexBufferOffset + vertexIndex;
        rendering[fixVertexIndex].a[c] = base[fixVertexIndex].a[c] + add;
    }
}