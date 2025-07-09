struct Output {
    indexs: vec4<u32>,
    weights: vec4<f32>,
}

struct Config {
    decayType: u32,
    decaySize: f32,
    index: u32,
    weight: f32,
    groupNum: u32,
    padding: f32,
    padding_: f32,
    padding__: f32,
}

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

@group(0) @binding(0) var<storage, read_write> indexAndWeight: array<Output>;
@group(0) @binding(1) var<storage, read> originalIndexAndWeight: array<Output>;
@group(0) @binding(2) var<storage, read_write> maxWeights: array<f32>;
@group(0) @binding(3) var<storage, read> vertices: array<vec2<f32>>;
@group(0) @binding(4) var<uniform> allocation: Allocation;
@group(0) @binding(5) var<uniform> paintPoint: vec2<f32>;
@group(0) @binding(6) var<uniform> config: Config;
@group(0) @binding(7) var<storage, read> decayBezier: array<Bezier>;

fn mathBezier(p1: vec2<f32>, c1: vec2<f32>, c2: vec2<f32>, p2: vec2<f32>, t: f32) -> vec2<f32> {
    let u = 1.0 - t;
    return p1 * pow(u, 3.0) + c1 * 3.0 * pow(u, 2.0) * t + c2 * 3.0 * u * pow(t, 2.0) + p2 * pow(t, 3.0);
}

fn bezier_interpolation(
    dist: f32
) -> f32 {
    let normalized_dist = dist / config.decaySize;
    if (normalized_dist <= 0) {
        return 1;
    }
    if (normalized_dist >= 1) {
        return 0;
    }

    var leftPoint = decayBezier[0];
    var rightPoint = decayBezier[0];
    for (var i = 1u; i < arrayLength(&decayBezier); i ++) {
        leftPoint = rightPoint;
        rightPoint = decayBezier[i];
        if (normalized_dist < decayBezier[i].p.x) {
            break ;
        }
    }

    if (leftPoint.p.x == rightPoint.p.x) {
        return leftPoint.p.y;
    }

    let p0 = leftPoint.p;
    let p1 = leftPoint.c2;
    let p2 = rightPoint.c1;
    let p3 = rightPoint.p;

    var tLow = 0.0;
    var tHigh = 1.0;
    var t = 0.5;
    let epsilon = 0.0001;

    // 最大20回の二分探索でtを見つける
    for (var i = 0u; i < 20u; i = i + 1u) {
        let point = mathBezier(p0, p1, p2, p3, t);
        let x = point.x;

        if (abs(x - normalized_dist) < epsilon) {
            break;
        }

        if (x < normalized_dist) {
            tLow = t;
        } else {
            tHigh = t;
        }

        t = (tLow + tHigh) * 0.5;
    }

    let result = mathBezier(p0, p1, p2, p3, t);
    return result.y;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (allocation.MAX_VERTICES <= global_id.x) {
        return;
    }
    let fixIndex = global_id.x + allocation.vertexBufferOffset * config.groupNum;
    let index = global_id.x;
    let dist = distance(paintPoint, vertices[fixIndex]);
    if (dist < config.decaySize) {
        let decay = bezier_interpolation(dist);
        let weight = config.weight * decay;
        maxWeights[index] = max(maxWeights[index],weight);
        // indexAndWeight[fixIndex].weights[0] = 1.0;
        // indexAndWeight[fixIndex].indexs[0] = config.index; // 正規化
    }
    var minIndex = 0u;
    var minWeight = 1.1;
    let data = originalIndexAndWeight[index];
    for (var i = 0u; i < 4u; i ++) {
        if (config.index == data.indexs[i]) {
            minIndex = i;
            minWeight = data.weights[i];
            break ;
        } else if (data.weights[i] < minWeight) {
            minIndex = i;
            minWeight = data.weights[i];
        }
    }
    if (config.decayType == 0u) { // mix
        if (minWeight < maxWeights[index]) {
            indexAndWeight[fixIndex].indexs[minIndex] = config.index;
            indexAndWeight[fixIndex].weights[minIndex] = maxWeights[index];
            var sumWeight = 0.0;
            for (var i = 0u; i < 4u; i ++) {
                sumWeight += indexAndWeight[fixIndex].weights[i];
            }
            indexAndWeight[fixIndex].weights /= sumWeight; // 正規化
        }
    } else if (config.decayType == 1u) { // 上書き
        if (minWeight < maxWeights[index]) {
            indexAndWeight[fixIndex].indexs[minIndex] = config.index;
            indexAndWeight[fixIndex].weights[minIndex] = maxWeights[index];

            var othersSumWeight = 0.0; // 書き換え対象以外の合計値
            let othersMaxWeight = 1.0 - maxWeights[index]; // 書き換え対象以外で使える値の最大値
            for (var i = 0u; i < 4u; i ++) {
                if (i != minIndex) {
                    othersSumWeight += originalIndexAndWeight[index].weights[i];
                }
            }
            let othersK = othersMaxWeight / othersSumWeight; // 書き換え対象以外を何倍するか
            for (var i = 0u; i < 4u; i ++) {
                if (i != minIndex) {
                    indexAndWeight[fixIndex].weights[i] = originalIndexAndWeight[index].weights[i] * othersK;
                }
            }
        }
    }
    // indexAndWeight[fixIndex].indexs[0] = config.index;
    // indexAndWeight[fixIndex].weights[0] = 1.0;
}