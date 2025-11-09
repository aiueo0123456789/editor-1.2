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

@group(0) @binding(0) var<storage, read_write> rendering: array<vec2<f32>>; // 出力
@group(0) @binding(1) var<storage, read> base: array<vec2<f32>>; // 元
@group(0) @binding(2) var<storage, read> shapes: array<vec2<f32>>; // アニメーション
@group(0) @binding(3) var<storage, read> weights: array<f32>; // 重み
@group(0) @binding(4) var<storage, read> allocationArray: array<Allocation>; // 配分

// ベジェのポイントに対しての頂点の数
const VERTEXLEVEL = 3u;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let objectIndex = global_id.x;
    let vertexIndex = global_id.y;
    if (arrayLength(&allocationArray) <= objectIndex) { // オブジェクト数を超えているか
        return ;
    }
    if (allocationArray[objectIndex].pointsNum * VERTEXLEVEL <= vertexIndex) { // 頂点数を超えているか
        return ;
    }

    let shapesBufferStartIndex = allocationArray[objectIndex].shapesOffset * VERTEXLEVEL + vertexIndex;
    var diff = vec2<f32>(0.0);
    for (var shapeKeyIndex = 0u; shapeKeyIndex < allocationArray[objectIndex].shapeKeysNum; shapeKeyIndex ++) {
        let shapeIndex = shapesBufferStartIndex + shapeKeyIndex * allocationArray[objectIndex].pointsNum * VERTEXLEVEL;
        let weightIndex = allocationArray[objectIndex].shapeKeyWeightsOffset + shapeKeyIndex;
        diff += shapes[shapeIndex] * weights[weightIndex];
    }
    let fixVertexIndex = allocationArray[objectIndex].pointsOffset * VERTEXLEVEL + vertexIndex;
    rendering[fixVertexIndex] = base[fixVertexIndex] + diff;
}