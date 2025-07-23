struct Allocation {
    vertexBufferOffset: u32,
    animationBufferOffset: u32,
    weightBufferOffset: u32,
    MAX_BONES: u32,
    MAX_ANIMATIONS: u32,
    parentType: u32, // 親がなければ0
    parentIndex: u32, // 親がなければ0
    myType: u32,
}

struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

@group(0) @binding(0) var<storage, read_write> localBonewMatrix: array<mat3x3<f32>>; // 出力
@group(0) @binding(1) var<storage, read> base: array<Bone>; // 元
@group(0) @binding(2) var<storage, read> animations: array<Bone>; // アニメーション
@group(0) @binding(3) var<storage, read> allocationArray: array<Allocation>; // 配分

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

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let objectIndex = global_id.x;
    let vertexIndex = global_id.y;
    if (arrayLength(&allocationArray) <= objectIndex) { // オブジェクト数を超えているか
        return ;
    }
    if (allocationArray[objectIndex].MAX_BONES <= vertexIndex) { // ボーン数を超えているか
        return ;
    }

    let fixVertexIndex = allocationArray[objectIndex].vertexBufferOffset + vertexIndex;
    var localBoneData = base[fixVertexIndex];
    let animation = animations[fixVertexIndex];
    localBoneData.position += animation.position;
    localBoneData.scale += animation.scale;
    localBoneData.angle += animation.angle;

    localBonewMatrix[fixVertexIndex] = createTransformMatrix(localBoneData.scale, localBoneData.angle, localBoneData.position);
}