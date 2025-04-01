struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

@group(0) @binding(0) var<storage, read_write> boneAnimation: array<Bone>;
@group(0) @binding(1) var<storage, read> originalBoneAnimation: array<Bone>;
@group(0) @binding(2) var<storage, read> boneMatrix: array<mat3x3<f32>>;
@group(0) @binding(3) var<storage, read> parents: array<u32>;
@group(0) @binding(4) var<storage, read> verticesIndexs: array<u32>;
@group(0) @binding(5) var<uniform> value: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&verticesIndexs) <= index) {
        return;
    }
    let boneIndex = verticesIndexs[index];
    boneAnimation[boneIndex].angle = originalBoneAnimation[boneIndex].angle - value.x;
}