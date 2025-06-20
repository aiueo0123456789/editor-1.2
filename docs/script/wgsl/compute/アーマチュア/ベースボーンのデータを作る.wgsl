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

@group(0) @binding(0) var<storage, read_write> baseBone: array<Bone>; // ローカルベースボーン
@group(0) @binding(1) var<storage, read_write> baseBoneMatrix: array<mat3x3<f32>>; // ベースボーンの行列
@group(0) @binding(2) var<storage, read> verticesPosition: array<BoneVertices>; // ベースボーンの行列
@group(0) @binding(3) var<storage, read> relationships: array<u32>; // indexに対応する親index

fn getAngle(p1: vec2<f32>, p2: vec2<f32>) -> f32 {
    let delta = p2 - p1;
    return atan2(delta.y, delta.x);
}

// 2次元の回転、スケール、平行移動を表現する行列を作成する関数
fn createTransformMatrix(scale: vec2<f32>, angle: f32, translation: vec2<f32>) -> mat3x3<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);

    // スケールと回転を組み合わせた行列
    var matrix: mat3x3<f32>;
    matrix[0] = vec3<f32>(scale.x * cosTheta, -scale.y * sinTheta, 0.0);
    matrix[1] = vec3<f32>(scale.x * sinTheta, scale.y * cosTheta, 0.0);
    matrix[2] = vec3<f32>(translation.x, translation.y, 1.0);

    return matrix;
}

fn inverseRotatePoint(point: vec2<f32>, angle: f32) -> vec2<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);
    return vec2<f32>(
        point.x * cosTheta - point.y * sinTheta,
        point.x * sinTheta + point.y * cosTheta
    );
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let boneIndex = global_id.x;
    if (boneIndex >= arrayLength(&relationships)) {
        return ;
    }

    let parentIndex = relationships[boneIndex];
    let vertex = verticesPosition[boneIndex];
    let boneData = Bone(vertex.h, vec2<f32>(1.0), -(getAngle(vertex.h, vertex.t) - 1.5708), length(vertex.h - vertex.t));
    if (boneIndex == parentIndex) { // 親がない場合
        baseBone[boneIndex] = boneData;
    } else { // 親がある場合
        let parentVertex = verticesPosition[parentIndex]; // 親ボーンのデータ
        let parentAngle = -(getAngle(parentVertex.h, parentVertex.t) - 1.5708); // 親ボーンの角度
        baseBone[boneIndex] = Bone(inverseRotatePoint(vertex.h - parentVertex.h, parentAngle), vec2<f32>(1.0), boneData.angle - parentAngle, boneData.length); // 親ボーンからのローカルデータ
    }
    baseBoneMatrix[boneIndex] = createTransformMatrix(boneData.scale, boneData.angle, boneData.position);
}