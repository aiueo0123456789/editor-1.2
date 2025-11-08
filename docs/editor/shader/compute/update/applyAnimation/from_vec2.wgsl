struct Allocation {
    vertexBufferOffset: u32,
    shapesOffset: u32,
    shapeKeyWeightsOffset: u32,
    verticesNum: u32,
    shapeKeysNum: u32,
    parentType: u32, // 親がなければ0
    parentIndex: u32, // 親がなければ0
    myType: u32,
}

@group(0) @binding(0) var<storage, read_write> rendering: array<vec2<f32>>; // 出力
@group(0) @binding(1) var<storage, read> base: array<vec2<f32>>; // 元
@group(0) @binding(2) var<storage, read> shapes: array<vec2<f32>>; // アニメーション
@group(0) @binding(3) var<storage, read> weights: array<f32>; // 重み
@group(0) @binding(4) var<storage, read> allocationArray: array<Allocation>; // 配分

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let objectIndex = global_id.x;
    let vertexIndex = global_id.y;
    if (arrayLength(&allocationArray) <= objectIndex) { // オブジェクト数を超えているか
        return ;
    }
    if (allocationArray[objectIndex].verticesNum <= vertexIndex) { // 頂点数を超えているか
        return ;
    }

    var diff = vec2<f32>(0.0,0.0);
    let animationBufferStartIndex = allocationArray[objectIndex].shapesOffset + vertexIndex;
    for (var animationIndex = 0u; animationIndex < allocationArray[objectIndex].shapeKeysNum; animationIndex ++) {
        diff += shapes[animationBufferStartIndex + animationIndex * allocationArray[objectIndex].verticesNum] * weights[allocationArray[objectIndex].shapeKeyWeightsOffset + animationIndex];
    }
    let fixVertexIndex = allocationArray[objectIndex].vertexBufferOffset + vertexIndex;
    rendering[fixVertexIndex] = base[fixVertexIndex] + diff;
}