@group(0) @binding(0) var<storage, read_write> result: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> fix: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let localIndex = global_id.x;
    if (arrayLength(&vertices) <= localIndex) {
        return ;
    }
    result[fix[localIndex]] = vertices[localIndex];
}