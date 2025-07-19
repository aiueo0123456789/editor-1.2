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

@group(0) @binding(0) var<storage, read_write> selectedBone: array<u32>; // u32のそれぞれのビットに選択情報を詰め込む
@group(0) @binding(1) var<storage, read> selectedVertices: array<u32>; // u32のそれぞれのビットに選択情報を詰め込む
@group(0) @binding(2) var<uniform> allocation: Allocation; // 配分情報

// 指定ビットを 1 にする
fn setBit(arrayIndex: u32, bitIndex: u32) {
    selectedBone[arrayIndex] = selectedBone[arrayIndex] | (1u << bitIndex);
}

// 指定ビットを 0 にする
fn clearBit(arrayIndex: u32, bitIndex: u32) {
    selectedBone[arrayIndex] = selectedBone[arrayIndex] & ~(1u << bitIndex);
}

fn ceilU32(a: u32, b: u32) -> u32 {
    return (a + b - 1u) / b;
}

fn isNaN(x: f32) -> bool {
    return x != x;
}

fn getBoolFromBit(index: u32) -> bool {
    return ((selectedVertices[index / 32u] >> (index % 32u)) & 1u) == 1u;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let groupNum = 1u;
    let fixOffset = allocation.vertexBufferOffset * groupNum;
    let fixMax = allocation.MAX_NUM * groupNum;
    let arrayStartIndex = (fixOffset) / 32u; // 書き込み対象の先頭index
    let arrayEndIndex = (fixOffset + fixMax) / 32u;
    if (arrayEndIndex - arrayStartIndex < global_id.x) {
        return ;
    }
    let vertexIndexStart = arrayStartIndex * 32u;
    let arrayIndex: u32 = arrayStartIndex + global_id.x; // selectedのarrayIndex
    var vertexIndex = vertexIndexStart + global_id.x * 32u;
    for (var bitIndex = 0u; bitIndex < 32u; bitIndex ++) { // selectedのbitIndex
        if (fixOffset <= vertexIndex && vertexIndex < fixOffset + fixMax) { // チェック対象かの確認
            if (getBoolFromBit(vertexIndex * 2u) && getBoolFromBit(vertexIndex * 2u + 1)) {
                setBit(arrayIndex, bitIndex);
            } else { // 追加がoffなら
                clearBit(arrayIndex, bitIndex);
            }
        }
        vertexIndex ++;
    }
}