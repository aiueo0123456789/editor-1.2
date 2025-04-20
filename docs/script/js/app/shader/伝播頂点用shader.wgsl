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

struct WeightGroup {
    indexs: vec4<u32>,
    weights: vec4<f32>,
}

@group(0) @binding(0) var<uniform> allocation: Allocation; // 配分

// ベジェモディファイ
struct BezierData {
    vertices: vec2<f32>,
    control1: vec2<f32>,
    control2: vec2<f32>,
}
@group(1) @binding(0) var<storage, read_write> renderingBezier: array<vec2<f32>>; // 変形後のベジェ
@group(1) @binding(1) var<storage, read> baseBezier: array<vec2<f32>>; // 元のベジェ
@group(1) @binding(2) var<storage, read> bezierAllocationArray: array<Allocation>; // ベジェのメモリ配分
@group(1) @binding(3) var<storage, read> bezierWeightGroups: array<WeightGroup>; // indexと重みのデータ
fn getRenderingBezierData(index: u32) -> BezierData {
    return BezierData(
        renderingBezier[index * 3u],
        renderingBezier[index * 3u + 1u],
        renderingBezier[index * 3u + 2u],
    );
}
fn getBaseBezierData(index: u32) -> BezierData {
    return BezierData(
        baseBezier[index * 3u],
        baseBezier[index * 3u + 1u],
        baseBezier[index * 3u + 2u],
    );
}
fn mathBezier(p1: vec2<f32>, c1: vec2<f32>, c2: vec2<f32>, p2: vec2<f32>, t: f32) -> vec2<f32> {
    let u = 1.0 - t;
    return p1 * pow(u, 3.0) + c1 * 3.0 * pow(u, 2.0) * t + c2 * 3.0 * u * pow(t, 2.0) + p2 * pow(t, 3.0);
}
fn getBezierNormal(p1: vec2<f32>, c1: vec2<f32>, c2: vec2<f32>, p2: vec2<f32>, t: f32) -> vec2<f32> {
    let u = 1.0 - t;
    return normalize(3.0 * pow(u, 2.0) * (c1 - p1) + 6.0 * u * t * (c2 - c1) + 3.0 * pow(t, 2.0) * (p2 - c2));
}
fn calculateRotation(n1: vec2<f32>, n2: vec2<f32>) -> f32 {
    // 内積を使ってcosθを計算
    let dotProduct = dot(n1, n2);
    // 外積を使ってsinθを計算
    let crossProduct = n1.x * n2.y - n1.y * n2.x;
    // atan2を使用して角度を求める（ラジアン）
    let angle = atan2(crossProduct, dotProduct);
    return angle; // 回転量（ラジアン）
}
fn rotate2D(point: vec2<f32>, angle: f32) -> vec2<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);
    let xPrime = point.x * cosTheta - point.y * sinTheta;
    let yPrime = point.x * sinTheta + point.y * cosTheta;
    return vec2<f32>(xPrime, yPrime);
}

// ボーンモディファイア
@group(2) @binding(0) var<storage, read> boneMatrix: array<mat3x3<f32>>; // ボーンの行列
@group(2) @binding(1) var<storage, read> baseBoneMatrix: array<mat3x3<f32>>; // ベースボーンの行列
@group(2) @binding(2) var<storage, read> boneAllocationArray: array<Allocation>; // ボーンのメモリ配分
fn inverseMat3x3(matrix: mat3x3<f32>) -> mat3x3<f32> {
    var inv: mat3x3<f32>;
    let a = matrix[0][0];
    let b = matrix[0][1];
    let c = matrix[0][2];
    let d = matrix[1][0];
    let e = matrix[1][1];
    let f = matrix[1][2];
    let g = matrix[2][0];
    let h = matrix[2][1];
    let i = matrix[2][2];
    let det = a * (e * i - f * h) -
              b * (d * i - f * g) +
              c * (d * h - e * g);
    if (det == 0.0) {
        // 行列が逆行列を持たない場合
        return mat3x3<f32>(0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0);
    }
    let invDet = 1.0 / det;
    inv[0][0] = (e * i - f * h) * invDet;
    inv[0][1] = (c * h - b * i) * invDet;
    inv[0][2] = (b * f - c * e) * invDet;
    inv[1][0] = (f * g - d * i) * invDet;
    inv[1][1] = (a * i - c * g) * invDet;
    inv[1][2] = (c * d - a * f) * invDet;
    inv[2][0] = (d * h - e * g) * invDet;
    inv[2][1] = (b * g - a * h) * invDet;
    inv[2][2] = (a * e - b * d) * invDet;
    return inv;
}

fn isNaN(x: f32) -> bool {
    return x != x;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let vertexIndex = global_id.x;
    if (allocation.MAX_VERTICES <= vertexIndex) { // 頂点数を超えているか
        return ;
    }

    let weightGroupIndex = allocation.vertexBufferOffset + vertexIndex;
    let fixVertexIndex = allocation.vertexBufferOffset * 3 + vertexIndex;
    let targetVertices = select(vec2<f32>(0.0), renderingBezier[fixVertexIndex], allocation.myType == 2u);
    var newPosition = vec2<f32>(0.0);
    if (allocation.parentType == 2) { // 親がベジェモディファイア
        let weightGroup = bezierWeightGroups[fixVertexIndex];
        let bezierIndex = weightGroup.indexs[0] + bezierAllocationArray[allocation.parentIndex].vertexBufferOffset; // ベジェのindex
        let t = weightGroup.weights[0]; // ベジェのt

        // 元のベジェ
        let a1 = getBaseBezierData(bezierIndex - 1);
        let a2 = getBaseBezierData(bezierIndex);

        // 変形後のベジェ
        let b1 = getRenderingBezierData(bezierIndex - 1);
        let b2 = getRenderingBezierData(bezierIndex);

        let position1 = mathBezier(a1.vertices, a1.control2, a2.control1, a2.vertices, t);
        let position2 = mathBezier(b1.vertices, b1.control2, b2.control1, b2.vertices, t);

        let normal1 = getBezierNormal(a1.vertices, a1.control2, a2.control1, a2.vertices, t);
        let normal2 = getBezierNormal(b1.vertices, b1.control2, b2.control1, b2.vertices, t);

        let rotatePosition = rotate2D(targetVertices + (position2 - position1) - position2, calculateRotation(normal1, normal2));
        newPosition = rotatePosition + position2;
    } else if (allocation.parentType == 3) { // 親がボーンモディファイア
        let weightGroup = bezierWeightGroups[weightGroupIndex];
        let position = vec3<f32>(targetVertices,1.0);
        let indexs = weightGroup.indexs;
        let weights = weightGroup.weights;
        // 各ボーンのワールド行列を用いてスキニング
        for (var i = 0u; i < 4u; i = i + 1u) {
            let weight = weights[i];
            if (0.0 < weight) {
                let boneIndex = indexs[i] + boneAllocationArray[allocation.parentIndex].vertexBufferOffset;
                newPosition += weight * (boneMatrix[boneIndex] * inverseMat3x3(baseBoneMatrix[boneIndex]) * position).xy;
            }
        }
    }
    if (allocation.myType == 2u) {
        renderingBezier[fixVertexIndex] = newPosition;
    } else {
    }
}