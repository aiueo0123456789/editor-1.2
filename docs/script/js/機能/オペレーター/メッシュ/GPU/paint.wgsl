struct Output {
    indexs: vec4<u32>,
    weights: vec4<f32>,
}

struct Config {
    decayType: u32,
    decaySize: f32,
    index: u32,
    weight: f32,
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
@group(1) @binding(0) var<uniform> config: Config;
@group(1) @binding(1) var<uniform> centerPoint: vec2<f32>;
@group(1) @binding(2) var<storage, read> decayBezier: array<Bezier>;

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
    let p1 = leftPoint.p + leftPoint.c2;
    let p2 = rightPoint.p + rightPoint.c1;
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
    let fixIndex = global_id.x + allocation.vertexBufferOffset;
    let index = global_id.x + allocation.vertexBufferOffset;
    let dist = distance(centerPoint, vertices[index]);
    let decay = bezier_interpolation(dist);
    if (dist < config.decaySize) {
        let weight = config.weight * decay;
        maxWeights[index] = max(maxWeights[index],weight);
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
    if (minWeight < maxWeights[index]) {
        indexAndWeight[fixIndex].indexs[minIndex] = config.index;
        indexAndWeight[fixIndex].weights[minIndex] = maxWeights[index];
        var sumWeight = 0.0;
        for (var i = 0u; i < 4u; i ++) {
            sumWeight += indexAndWeight[fixIndex].weights[i];
        }
        indexAndWeight[fixIndex].weights /= sumWeight; // 正規化
    }
    indexAndWeight[fixIndex].weights = vec4<f32>(1.0,0.0,0.0,0.0); // 正規化
    indexAndWeight[fixIndex].indexs = vec4<u32>(config.index,1u,2u,3u); // 正規化
}