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

struct Option {
    add: u32,
    groupNum: u32,
}

struct Point {
    position: vec2<f32>,
    raidus: f32,
    padding: f32,
}

struct Candidate {
    dist: atomic<i32>,
    index: atomic<u32>,
};

@group(0) @binding(0) var<storage, read_write> selected: array<u32>; // u32のそれぞれのビットに選択情報を詰め込む
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> allocation: Allocation; // 配分情報
@group(0) @binding(3) var<uniform> optionData: Option; // オプション
@group(0) @binding(4) var<uniform> point: Point; // 距離を計算する座標
@group(0) @binding(5) var<storage, read_write> atomicBuffer: Candidate; // 0: dist, 1: index

var<workgroup> workgroupAtomicBuffer: Candidate;

const SCALE_FACTOR: f32 = 1e5;

// ユーティリティ関数
fn f32_to_i32(value: f32) -> i32 {
    return i32(value * SCALE_FACTOR);
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

fn distance(vertex: vec2<f32>) -> f32 {
    return distanceSquared2D(point.position, vertex);
}

fn isNaN(x: f32) -> bool {
    return x != x;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
     // 初期化フェーズ
    if (global_id.x == 0u) {
        atomicStore(&atomicBuffer.dist, i32(1e10 * SCALE_FACTOR));
        atomicStore(&atomicBuffer.index, 0u);
    }

    if (local_id.x == 0u) {
        atomicStore(&workgroupAtomicBuffer.dist, i32(1e10 * SCALE_FACTOR));
        atomicStore(&workgroupAtomicBuffer.index, 0u);
    }

    let groupNum = optionData.groupNum;
    let fixOffset = allocation.vertexBufferOffset * groupNum;
    let fixMax = allocation.MAX_NUM * groupNum;
    let arrayStartIndex = (fixOffset) / 32u; // 書き込み対象の先頭index
    let arrayEndIndex = (fixOffset + fixMax) / 32u;

    if (arrayEndIndex - arrayStartIndex + 1u > global_id.x) {
        var localMinDist = 9000000000.0;
        var localMinIndex = 0u;
        let vertexIndexStart = arrayStartIndex * 32u;
        let arrayIndex: u32 = arrayStartIndex + global_id.x; // selectedのarrayIndex
        var vertexIndex = vertexIndexStart + global_id.x * 32u;
        for (var bitIndex = 0u; bitIndex < 32u; bitIndex ++) { // selectedのbitIndex
            if (fixOffset <= vertexIndex && vertexIndex < fixOffset + fixMax) { // チェック対象かの確認
                if (optionData.add == 0) { // 追加がoffなら
                    clearBit(arrayIndex, bitIndex);
                }
                if (isNaN(vertices[vertexIndex].x) || isNaN(vertices[vertexIndex].y)) {
                } else {
                    let dist = distance(vertices[vertexIndex]);
                    if (dist < localMinDist) {
                        localMinDist = dist;
                        localMinIndex = vertexIndex;
                    }
                }
            }
            vertexIndex ++;
        }
        // 範囲外スレッドの値を安全に無効化
        let i32Dist = f32_to_i32(localMinDist);
        if (i32Dist < atomicLoad(&workgroupAtomicBuffer.dist)) {
            atomicStore(&workgroupAtomicBuffer.dist, i32Dist);
            atomicStore(&workgroupAtomicBuffer.index, localMinIndex);
        }
    }
    workgroupBarrier();
     // ストレージバッファへの書き込みを安全に実行
    if (local_id.x == 0u) {
        let workgroupFinalDist = atomicLoad(&workgroupAtomicBuffer.dist);
        let workgroupFinalIndex = atomicLoad(&workgroupAtomicBuffer.index);
        if (workgroupFinalDist < atomicLoad(&atomicBuffer.dist)) {
            atomicStore(&atomicBuffer.dist, workgroupFinalDist);
            atomicStore(&atomicBuffer.index, workgroupFinalIndex);
        }
    }
    workgroupBarrier();
    if (global_id.x == 0u) {
        // 安全にストレージバッファに書き込み
        let finalIndex = atomicLoad(&atomicBuffer.index);
        setBit(finalIndex / 32u, finalIndex % 32u);
    }
}