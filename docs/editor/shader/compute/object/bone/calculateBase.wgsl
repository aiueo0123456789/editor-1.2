struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
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

@group(0) @binding(0) var<storage, read_write> baseBone: array<Bone>; // ローカルベースボーン
@group(0) @binding(1) var<storage, read_write> baseMatrix: array<mat3x3<f32>>; // ベースボーンの行列
@group(0) @binding(2) var<storage, read> baseVertices: array<BoneVertices>; // ベースボーンの頂点
@group(0) @binding(3) var<storage, read> parentIndexs: array<u32>; // indexに対応する親index
@group(0) @binding(4) var<uniform> armatureAllocation: Allocation; // 配分情報

fn getAngle(p1: vec2<f32>, p2: vec2<f32>) -> f32 {
    let delta = p2 - p1;
    return atan2(delta.y, delta.x);
}

// 2次元の回転、スケール、平行移動を表現する行列を作成する関数
fn createTransformMatrix(scale: vec2<f32>, angle: f32, translation: vec2<f32>) -> mat3x3<f32> {
    let rx = angle;
    let ry = angle + 1.5708;
    // スケールと回転を組み合わせた行列
    var matrix: mat3x3<f32>;
    matrix[0] = vec3<f32>(scale.x * cos(rx), scale.x * sin(rx), 0.0);
    matrix[1] = vec3<f32>(scale.y * cos(ry), scale.y * sin(ry), 0.0);
    matrix[2] = vec3<f32>(translation.x, translation.y, 1.0);

    return matrix;
}

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

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let localBoneIndex = global_id.x;
    // if (localBoneIndex >= armatureAllocation.MAX_VERTICES) { // ボーン数を超えているか
    if (localBoneIndex >= arrayLength(&parentIndexs)) { // ボーン数を超えているか
        return ;
    }

    let startIndex = armatureAllocation.vertexBufferOffset;
    let parentIndex = parentIndexs[localBoneIndex] + startIndex;
    let boneIndex = localBoneIndex + startIndex;
    let vertex = baseVertices[boneIndex];
    baseMatrix[boneIndex] = createTransformMatrix(vec2<f32>(1.0), getAngle(vertex.h, vertex.t), vertex.h); // ベース行列
    if (boneIndex == parentIndex) { // 親がない場合
        baseBone[boneIndex] = Bone(vertex.h, vec2<f32>(1.0, 1.0), getAngle(vertex.h, vertex.t), length(vertex.h - vertex.t));
    } else { // 親がある場合
        let parentMatrixInv = inverseMat3x3(baseMatrix[parentIndex]);
        let localMatrix = parentMatrixInv * baseMatrix[boneIndex];
        baseBone[boneIndex] = Bone(localMatrix[2].xy, vec2<f32>(1.0), atan2(localMatrix[0][1], localMatrix[0][0]), length(vertex.h - vertex.t)); // 親ボーンからのローカルデータ
    }
}