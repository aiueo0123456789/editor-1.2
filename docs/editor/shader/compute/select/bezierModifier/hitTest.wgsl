struct Bezier {
    p: vec2<f32>,
    c1: vec2<f32>,
    c2: vec2<f32>,
}

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

@group(0) @binding(0) var<storage, read_write> result: atomic<u32>;
@group(0) @binding(1) var<storage, read> modifierVertices: array<Bezier>; // モディファイアの頂点位置
@group(0) @binding(2) var<uniform> allocation: Allocation; // 配分情報
@group(0) @binding(3) var<uniform> optionData: Option; // オプション
@group(0) @binding(4) var<uniform> point: vec2<f32>; // 距離を計算する座標
const size = 5.0;

// 内積
fn dot(a: vec2<f32>, b: vec2<f32>) -> f32 {
    return a.x * b.x + a.y * b.y;
}

// ベクトルのノルムの二乗
fn norm_squared(a: vec2<f32>) -> f32 {
    return dot(a, a);
}

// ベジェ曲線上の点を計算
fn completion(t: f32, bz: array<vec2<f32>, 4>) -> vec2<f32> {
    let t_ = 1.0 - t;
    return bz[0] * (t_ * t_ * t_) +
           bz[1] * (3 * t_ * t_ * t) +
           bz[2] * (3 * t_ * t * t) +
           bz[3] * (t * t * t);
}

// ベジェ曲線の分割
fn split_bezier(bz: array<vec2<f32>, 4>) -> array<array<vec2<f32>, 4>, 2> {
    let center = completion(0.5, bz);
    return array<array<vec2<f32>, 4>, 2>(
        array<vec2<f32>, 4>(
            bz[0],
            (bz[0] + bz[1]) / 2.0,
            (bz[0] + bz[1] * 2.0 + bz[2]) / 4.0,
            center
        ),
        array<vec2<f32>, 4>(
            center,
            (bz[1] + bz[2] * 2.0 + bz[3]) / 4.0,
            (bz[2] + bz[3]) / 2.0,
            bz[3]
        )
    );
}

// 線分と点の二乗距離を計算
fn diff2_to_line(line: array<vec2<f32>, 2>, p: vec2<f32>) -> f32 {
    let ps = line[0] - p;
    let d = line[1] - line[0];
    let n2 = norm_squared(d);
    let tt = -dot(d, ps);
    if (tt < 0.0) {
        return norm_squared(ps);
    } else if (tt > n2) {
        return norm_squared(line[1] - p);
    }
    let f1 = d.x * ps.y - d.y * ps.x;
    return f1 * f1 / n2;
}

// ベジェ曲線ポリゴンと点の最短距離（二乗）
fn diff2_to_polygon(bz: array<vec2<f32>, 4>, p: vec2<f32>) -> f32 {
    return min(
        diff2_to_line(array<vec2<f32>, 2>(bz[0], bz[1]), p),
        min(
            diff2_to_line(array<vec2<f32>, 2>(bz[1], bz[2]), p),
            min(
                diff2_to_line(array<vec2<f32>, 2>(bz[2], bz[3]), p),
                diff2_to_line(array<vec2<f32>, 2>(bz[3], bz[0]), p)
            )
        )
    );
}

// ベジェ曲線近接点の計算
fn neighbor_bezier(
    bz: array<vec2<f32>, 4>,
    p: vec2<f32>,
    t0: f32,
    t1: f32
) -> vec2<f32> {
    var currentBz = bz;
    var tStart = t0;
    var tEnd = t1;
    var result = vec2<f32>(0.0, 0.0);

    // 最大ループ回数を設定
    let maxIterations = 50;
    var iteration = 0;

    loop {
        iteration ++;

        // 長さが十分短い場合は終了
        let n2 = norm_squared(currentBz[3] - currentBz[0]);
        if (n2 < 0.001 || iteration >= maxIterations) {
            let t = (tStart + tEnd) * 0.5;
            let pointOnCurve = completion(t, currentBz);
            let distanceSquared = norm_squared(pointOnCurve - p);
            result = vec2<f32>(t, sqrt(distanceSquared));
            break;
        }

        // ベジェ曲線を分割
        let splitbz = split_bezier(currentBz);
        let d0 = diff2_to_polygon(splitbz[0], p);
        let d1 = diff2_to_polygon(splitbz[1], p);
        let tCenter = (tStart + tEnd) * 0.5;

        // 距離が短い方を選択して処理を続行
        if (d0 < d1) {
            currentBz = splitbz[0];
            tEnd = tCenter;
        } else {
            currentBz = splitbz[1];
            tStart = tCenter;
        }
    }

    return result;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x == 0u) {
        atomicStore(&result, 0);
    }
    workgroupBarrier();
    if (allocation.MAX_VERTICES <= global_id.x) {
        return;
    }
    let bezierIndex = global_id.x + allocation.vertexBufferOffset;
    let controlPoints = array<vec2<f32>, 4>(modifierVertices[bezierIndex].p, modifierVertices[bezierIndex].c2, modifierVertices[bezierIndex + 1].c1, modifierVertices[bezierIndex + 1].p); // ベジェ曲線の制御点
    if (neighbor_bezier(controlPoints, point, 0, 1).y < size) {
        atomicStore(&result, 1);
    }
}