struct Relationship {
    child: u32,
    parent: u32,
}

struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

struct PhysicsAttachmentData {
    length: f32,

    translate: vec2<f32>,
    rotate: f32,
    scaleX: f32,
    shearX: f32,

    inertia: f32, // 慣性
    strength: f32, // 復元率
    damping: f32, // 減衰率
    massInverse: f32, // 質量の逆数
    wind: f32, // 風
    gravity: f32, // 重力
    // externalForce: vec2<f32>, // 風,重力
    mix: f32, // どれだけ適応するか

    limit: f32, // 最大速度

    u: vec2<f32>,
    c: vec2<f32>,
    t: vec2<f32>,
    offset: vec2<f32>,
    velocity: vec2<f32>,
    rotateOffset: f32,
    rotateVelocity: f32,
    scaleOffset: f32,
    scaleVelocity: f32,
}

@group(0) @binding(0) var<storage, read_write> boneMatrixs: array<f32>; // 出力
@group(0) @binding(1) var<storage, read_write> baseBone: array<Bone>; // ローカルベースボーン
@group(0) @binding(2) var<storage, read_write> physicsAttachmentDatas: array<PhysicsAttachmentData>; // 物理アタッチメント
@group(1) @binding(0) var<storage, read> relationships: array<Relationship>; // 親のindex

fn getMatrix(index: u32) -> mat3x3<f32> {
    let fixIndex = index * 9u;
    return mat3x3<f32>(
        vec3<f32>(boneMatrixs[fixIndex], boneMatrixs[fixIndex + 1], boneMatrixs[fixIndex + 2]),
        vec3<f32>(boneMatrixs[fixIndex + 3], boneMatrixs[fixIndex + 4], boneMatrixs[fixIndex + 5]),
        vec3<f32>(boneMatrixs[fixIndex + 6], boneMatrixs[fixIndex + 7], boneMatrixs[fixIndex + 8]),
    );
}

fn setMatrix(index: u32, m: mat3x3<f32>) {
    let fixIndex = index * 9u;
    boneMatrixs[fixIndex] = m[0][0];
    boneMatrixs[fixIndex + 1] = m[0][1];
    boneMatrixs[fixIndex + 2] = m[0][2];
    boneMatrixs[fixIndex + 3] = m[1][0];
    boneMatrixs[fixIndex + 4] = m[1][1];
    boneMatrixs[fixIndex + 5] = m[1][2];
    boneMatrixs[fixIndex + 6] = m[2][0];
    boneMatrixs[fixIndex + 7] = m[2][1];
    boneMatrixs[fixIndex + 8] = m[2][2];
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&relationships)) {
        return ;
    }
    let relationship = relationships[index];
    if (relationship.parent != relationship.child) { // indexが同じなら親を持たない
        setMatrix(relationship.child, getMatrix(relationship.parent) * getMatrix(relationship.child));
    }
}