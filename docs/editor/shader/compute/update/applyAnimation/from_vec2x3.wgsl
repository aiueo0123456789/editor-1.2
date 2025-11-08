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

struct Bezier {
    p: vec2<f32>,
    c1: vec2<f32>,
    c2: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> rendering: array<Bezier>; // 出力
@group(0) @binding(1) var<storage, read> base: array<Bezier>; // 元
@group(0) @binding(2) var<storage, read> shapes: array<Bezier>; // アニメーション
@group(0) @binding(3) var<storage, read> weights: array<f32>; // 重み
@group(0) @binding(4) var<storage, read> allocationArray: array<Allocation>; // 配分

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let objectIndex = global_id.x;
    let vertexIndex = global_id.y;
    if (arrayLength(&allocationArray) <= objectIndex) { // オブジェクト数を超えているか
        return ;
    }
    if (allocationArray[objectIndex].pointsNum <= vertexIndex) { // 頂点数を超えているか
        return ;
    }

    let shapesBufferStartIndex = allocationArray[objectIndex].shapesOffset + vertexIndex;
    var diff = Bezier(vec2<f32>(0.0,0.0),vec2<f32>(0.0,0.0),vec2<f32>(0.0,0.0));
    for (var shapeKeyIndex = 0u; shapeKeyIndex < allocationArray[objectIndex].shapeKeysNum; shapeKeyIndex ++) {
        let shapeIndex = shapesBufferStartIndex + shapeKeyIndex * allocationArray[objectIndex].pointsNum;
        let weightIndex = allocationArray[objectIndex].shapeKeyWeightsOffset + shapeKeyIndex;
        diff.p += shapes[shapeIndex].p * weights[weightIndex];
        diff.c1 += shapes[shapeIndex].c1 * weights[weightIndex];
        diff.c2 += shapes[shapeIndex].c2 * weights[weightIndex];
    }
    let fixVertexIndex = allocationArray[objectIndex].pointsOffset + vertexIndex;
    rendering[fixVertexIndex].p = base[fixVertexIndex].p + diff.p;
    rendering[fixVertexIndex].c1 = base[fixVertexIndex].c1 + diff.c1;
    rendering[fixVertexIndex].c2 = base[fixVertexIndex].c2 + diff.c2;
}