struct BBox {
    min: vec2<f32>,
    max: vec2<f32>,
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

@group(0) @binding(0) var<storage, read_write> uv: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>;
@group(0) @binding(2) var<uniform> imageBBox: BBox;
@group(0) @binding(3) var<uniform> allocation: Allocation;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (allocation.MAX_VERTICES <= global_id.x) {
        return;
    }
    let index = allocation.vertexBufferOffset + global_id.x;
    let a = (vertices[index] - imageBBox.min) / (imageBBox.max - imageBBox.min);
    uv[index] = vec2<f32>(a.x, 1.0 - a.y);
}