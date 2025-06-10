@group(0) @binding(0) var<storage, read_write> result: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> data: array<f32>;
@group(0) @binding(2) var<storage, read> index: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let localIndex = global_id.x;
    if (arrayLength(&result) <= localIndex) {
        return ;
    }
    result[localIndex] = data[index[localIndex]];
}