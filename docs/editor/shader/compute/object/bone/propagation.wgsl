struct Relationship {
    child: u32,
    parent: u32,
}

@group(0) @binding(0) var<storage, read_write> boneMatrix: array<mat3x3<f32>>; // 出力
@group(1) @binding(0) var<storage, read> relationships: array<Relationship>; // 親のindexと自分の深度

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&relationships)) {
        return ;
    }
    let relationship = relationships[index];
    boneMatrix[relationship.child] = boneMatrix[relationship.parent] * boneMatrix[relationship.child];
}