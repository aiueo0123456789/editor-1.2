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

@group(0) @binding(0) var<storage, read_write> vertices: array<BoneVertices>; // 出力
@group(0) @binding(1) var<storage, read> boneMatrixs: array<f32>; // ボーンの行列
@group(0) @binding(2) var<storage, read> boneData: array<Bone>; // ボーンのデータ
@group(0) @binding(3) var<storage, read> allocationArray: array<Allocation>; // 配分

fn getMatrix(index: u32) -> mat3x3<f32> {
    let fixIndex = index * 9u;
    return mat3x3<f32>(
        vec3<f32>(boneMatrixs[fixIndex], boneMatrixs[fixIndex + 1], boneMatrixs[fixIndex + 2]),
        vec3<f32>(boneMatrixs[fixIndex + 3], boneMatrixs[fixIndex + 4], boneMatrixs[fixIndex + 5]),
        vec3<f32>(boneMatrixs[fixIndex + 6], boneMatrixs[fixIndex + 7], boneMatrixs[fixIndex + 8]),
    );
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let objectIndex = global_id.x;
    let boneIndex = global_id.y;
    if (arrayLength(&allocationArray) <= objectIndex) {
        return;
    }
    if (allocationArray[objectIndex].MAX_VERTICES <= boneIndex) {
        return;
    }

    let arrayIndex = allocationArray[objectIndex].vertexBufferOffset + boneIndex;

    // 頂点データを取得
    let matrix = getMatrix(arrayIndex);
    var output: BoneVertices;
    output.h = matrix[2].xy;
    output.t = matrix[2].xy + vec2<f32>(matrix[0][0], matrix[0][1]) * boneData[arrayIndex].length;
    // output.t = (matrix * vec3<f32>(0.0, boneData[arrayIndex].length, 1.0)).xy;
    vertices[arrayIndex] = output;
}