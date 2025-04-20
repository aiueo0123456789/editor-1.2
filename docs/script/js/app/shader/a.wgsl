struct Bone {
    matrix: mat3x3<f32>
}
struct Armature {
    base: array<Bone,100>
    rendering: array<Bone,100>
}
@group(0) @binding(0) var<storage, read_write> boneMatrix: Armature;
boneMatrix.rendering[k] = boneMatrix.base[k]を使った処理;

@group(0) @binding(0) var<storage, read> baseBoneMatrix: array<mat3x3<f32>>;
@group(0) @binding(1) var<storage, read_write> boneMatrix: array<mat3x3<f32>>;
boneMatrix[k] = baseBoneMatrix[k]を使った処理;