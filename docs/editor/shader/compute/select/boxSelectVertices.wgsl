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

struct Option {
    add: u32,
}

struct Box {
    min: vec2<f32>,
    max: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> selected: array<u32>; // u32のそれぞれのビットに選択情報を詰め込む
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>; // 頂点座標
@group(0) @binding(2) var<uniform> allocation: Allocation; // メモリ配分
@group(0) @binding(3) var<uniform> optionData: Option; // オプション
@group(0) @binding(4) var<uniform> box: Box; // 判定を行う対象

// 指定ビットを 1 にする
fn setBit(arrayIndex: u32, bitIndex: u32) {
    selected[arrayIndex] = selected[arrayIndex] | (1u << bitIndex);
}

// 指定ビットを 0 にする
fn clearBit(arrayIndex: u32, bitIndex: u32) {
    selected[arrayIndex] = selected[arrayIndex] & ~(1u << bitIndex);
}

fn distanceSquared2D(a: vec2<f32>, b: vec2<f32>) -> f32 {
    let diff = a - b;
    return dot(diff, diff);
}

fn ceilU32(a: u32, b: u32) -> u32 {
    return (a + b - 1u) / b;
}

fn isSelected(vertex: vec2<f32>) -> bool {
    return vertex.x > box.min.x &&
           vertex.y > box.min.y &&
           vertex.x < box.max.x &&
           vertex.y < box.max.y;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (ceilU32(allocation.MAX_VERTICES, 32u) <= global_id.x) {
        return ;
    }
    let arrayStartIndex = allocation.vertexBufferOffset / 32u; // 書き込み対象の先頭index
    let vertexIndexStart = arrayStartIndex * 32u;

    let arrayIndex: u32 = arrayStartIndex + global_id.x; // selectedのarrayIndex
    var vertexIndex = vertexIndexStart + global_id.x * 32;
    for (var bitIndex = 0u; bitIndex < 32u; bitIndex ++) { // selectedのbitIndex
        if (allocation.vertexBufferOffset <= vertexIndex && vertexIndex < allocation.vertexBufferOffset + allocation.MAX_VERTICES) { // チェック対象かの確認
            if (isSelected(vertices[vertexIndex])) {
                setBit(arrayIndex, bitIndex);
            } else if (optionData.add == 0) { // 追加がoffなら
                clearBit(arrayIndex, bitIndex);
            }
        }
        vertexIndex ++;
    }
}