struct Point {
    position: vec2<f32>,
}

struct Candidate {
    index: atomic<u32>,
    dist: atomic<i32>,
};

@group(0) @binding(0) var<storage, read> vertices: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> indexs: array<u32>; // 判定する頂点のindex
@group(0) @binding(2) var<uniform> point: Point; // 距離を計算する座標
@group(0) @binding(3) var<storage, read_write> atomicBuffer: Candidate; // 0: index, 1: dist

var<workgroup> workgroupAtomicBuffer: Candidate;

const SCALE_FACTOR: f32 = 1e5;

// ユーティリティ関数
fn f32_to_i32(value: f32) -> i32 {
    return i32(value * SCALE_FACTOR);
}

fn distanceSquared2D(a: vec2<f32>, b: vec2<f32>) -> f32 {
    let diff = a - b;
    return dot(diff, diff);
}

fn ceilU32(a: u32, b: u32) -> u32 {
    return (a + b - 1u) / b;
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

    let index = indexs[global_id.x];
    let vertex = vertices[index];
    let dist = distanceSquared2D(vertex, point.position);
    let i32Dist = f32_to_i32(dist);
    loop {
        let current = atomicLoad(&workgroupAtomicBuffer.dist);
        if (i32Dist < current) {
            let exchanged = atomicCompareExchangeWeak(&workgroupAtomicBuffer.dist, current, i32Dist);
            if (exchanged.exchanged) {
                // dist の更新に成功したスレッドだけが index も更新
                atomicStore(&workgroupAtomicBuffer.index, index);
                break;
            }
        } else {
            break;
        }
    }
    workgroupBarrier();
    // ストレージバッファへの書き込みを安全に実行
    if (local_id.x == 0u) {
        let workgroupFinalDist = atomicLoad(&workgroupAtomicBuffer.dist);
        let workgroupFinalIndex = atomicLoad(&workgroupAtomicBuffer.index);
        loop {
            let current = atomicLoad(&atomicBuffer.dist);
            if (workgroupFinalDist < current) {
                let exchanged = atomicCompareExchangeWeak(&atomicBuffer.dist, current, workgroupFinalDist);
                if (exchanged.exchanged) {
                    // distの更新に成功した場合のみindexを更新
                    atomicStore(&atomicBuffer.index, workgroupFinalIndex);
                    break;
                }
                // 失敗したらループして再試行
            } else {
                break;
            }
        }
    }
}