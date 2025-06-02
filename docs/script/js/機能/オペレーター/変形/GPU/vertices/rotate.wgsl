@group(0) @binding(0) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> originalVertices: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> baseData: array<vec2<f32>>; // 基準
@group(0) @binding(3) var<storage, read> weigth: array<f32>;
@group(0) @binding(4) var<storage, read> subjectIndex: array<u32>;
@group(0) @binding(5) var<uniform> centerPoint: vec2<f32>;
@group(0) @binding(6) var<uniform> value: vec2<f32>;

fn rotate(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(
        p.x * c - p.y * s,
        p.x * s + p.y * c,
    );
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let localIndex = global_id.x;
    if (arrayLength(&weigth) <= localIndex) {
        return;
    }
    let index = subjectIndex[global_id.x];
    let sub = rotate(originalVertices[localIndex] - centerPoint, value.x * (weigth[localIndex]));
    output[index] = sub + centerPoint - baseData[index];
}