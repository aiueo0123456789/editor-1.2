struct Allocation {
    vertexBufferOffset: u32,
    animationBufferOffset: u32,
    weightBufferOffset: u32,
    MAX_BONE: u32,
    MAX_ANIMATIONS: u32,
    parentType: u32, // 親がなければ0
    parentIndex: u32, // 親がなければ0
    myType: u32,
}

struct Option {
    add: u32,
}

struct Point {
    position: vec2<f32>,
    raidus: f32,
    padding: f32,
}

@group(0) @binding(0) var<storage, read_write> selected: array<u32>; // u32のそれぞれのビットに選択情報を詰め込む
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> allocation: Allocation; // 配分情報
@group(0) @binding(3) var<uniform> optionData: Option; // オプション
@group(0) @binding(4) var<uniform> point: Point; // 距離を計算する座標

const size = 0.04;
const ratio = 0.1;

fn cross2D(a: vec2<f32>, b: vec2<f32>) -> f32 {
    return a.x * b.y - a.y * b.x;
}

fn hitTestPointTriangle(a: vec2<f32>, b: vec2<f32>, c: vec2<f32>, p: vec2<f32>) -> bool {
    let ab = b - a;
    let bp = p - b;

    let bc = c - b;
    let cp = p - c;

    let ca = a - c;
    let ap = p - a;

    let c1 = cross2D(ab, bp);
    let c2 = cross2D(bc, cp);
    let c3 = cross2D(ca, ap);
    return (c1 > 0.0 && c2 > 0.0 && c3 > 0.0) || (c1 < 0.0 && c2 < 0.0 && c3 < 0.0);
}

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
    return distanceSquared2D(point.position, vertex) < point.raidus * point.raidus;
}

fn isNaN(x: f32) -> bool {
    return x != x;
}

const groupNum = 2u;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (ceilU32(allocation.MAX_BONE * groupNum, 32u) <= global_id.x) {
        return ;
    }
    let arrayStartIndex = (allocation.vertexBufferOffset * groupNum) / 32u; // 書き込み対象の先頭index
    let vertexIndexStart = arrayStartIndex * 32u / groupNum;

    let arrayIndex: u32 = arrayStartIndex + global_id.x; // selectedのarrayIndex
    var vertexIndex = vertexIndexStart + global_id.x * 32;
    for (var bitIndex = 0u; bitIndex < 32u; bitIndex ++) { // selectedのbitIndex
        if (allocation.vertexBufferOffset * groupNum <= vertexIndex && vertexIndex < (allocation.vertexBufferOffset + allocation.MAX_BONE) * groupNum) { // チェック対象かの確認
            if (isNaN(vertices[vertexIndex].x) || isNaN(vertices[vertexIndex].y)) {
                clearBit(arrayIndex, bitIndex);
            } else {
                if (isSelected(vertices[vertexIndex])) {
                    setBit(arrayIndex, bitIndex);
                } else if (optionData.add == 0) { // 追加がoffなら
                    clearBit(arrayIndex, bitIndex);
                }
            }
        }
        vertexIndex ++;
    }
}