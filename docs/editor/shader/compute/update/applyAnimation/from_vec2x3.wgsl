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

struct Bezier {
    p: vec2<f32>,
    c1: vec2<f32>,
    c2: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> rendering: array<Bezier>; // 出力
@group(0) @binding(1) var<storage, read> base: array<Bezier>; // 元
@group(0) @binding(2) var<storage, read> animations: array<Bezier>; // アニメーション
@group(0) @binding(3) var<storage, read> allocationArray: array<Allocation>; // 配分

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

    let fixVertexIndex = allocationArray[objectIndex].vertexBufferOffset + vertexIndex;
    rendering[fixVertexIndex].p = base[fixVertexIndex].p + animations[fixVertexIndex].p;
    rendering[fixVertexIndex].c1 = base[fixVertexIndex].c1 + animations[fixVertexIndex].c1;
    rendering[fixVertexIndex].c2 = base[fixVertexIndex].c2 + animations[fixVertexIndex].c2;
}