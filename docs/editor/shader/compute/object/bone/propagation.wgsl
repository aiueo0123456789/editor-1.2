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

@group(0) @binding(0) var<storage, read_write> boneMatrix: array<mat3x3<f32>>; // 出力
@group(0) @binding(1) var<storage, read_write> baseBone: array<Bone>; // ローカルベースボーン
@group(0) @binding(2) var<storage, read_write> physicsAttachmentDatas: array<PhysicsAttachmentData>; // 物理アタッチメント
@group(1) @binding(0) var<storage, read> relationships: array<Relationship>; // 親のindexと自分の深度

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&relationships)) {
        return ;
    }
    let relationship = relationships[index];
    // boneMatrix[relationship.child] = boneMatrix[relationship.parent] * boneMatrix[relationship.child];
    boneMatrix[relationship.child] = boneMatrix[relationship.parent] * boneMatrix[relationship.child];
}