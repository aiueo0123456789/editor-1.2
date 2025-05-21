struct MeshAllocation {
    vertexBufferOffset: u32,
    meshBufferOffset: u32,
    MAX_MESHES: u32,
    padding: u32,
}

struct Option {
    add: u32,
}

@group(0) @binding(0) var<storage, read_write> result: atomic<u32>;
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>; // 頂点
@group(0) @binding(2) var<storage, read> meshLoops: array<u32>; // メッシュを構成する頂点インデックス
@group(0) @binding(3) var<uniform> allocation: MeshAllocation; // 配分
@group(0) @binding(4) var<uniform> optionData: Option; // オプション
@group(0) @binding(5) var<uniform> p: vec2<f32>;

fn cross2D(a: vec2<f32>, b: vec2<f32>) -> f32 {
    return a.x * b.y - a.y * b.x;
}

fn hitTestPointTriangle(a: vec2<f32>, b: vec2<f32>, c: vec2<f32>) -> bool {
    let ab = b - a;
    let bp = p - b;

    let bc = c - b;
    let cp = p - c;

    let ca = a - c;
    let ap = p - a;

    let c1 = cross2D(ab, bp);
    let c2 = cross2D(bc, cp);
    let c3 = cross2D(ca, ap);
    return (c1 > 0.0 && c2 > 0.0 && c3 > 0.0) || (c1 < 0.0 && c2 < 0.0 && c3 < 0.0);
}

fn getMeshLoop(index: u32) -> vec3<u32> {
    return vec3<u32>(meshLoops[index * 3u], meshLoops[index * 3u + 1u], meshLoops[index * 3u + 2u]);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x == 0u) {
        atomicStore(&result, 0);
    }
    workgroupBarrier();
    if (allocation.MAX_MESHES <= global_id.x) {
        return;
    }

    let indexs = getMeshLoop(global_id.x + allocation.meshBufferOffset) + allocation.vertexBufferOffset;
    if (hitTestPointTriangle(vertices[indexs.x],vertices[indexs.y],vertices[indexs.z])) {
    // if (hitTestPointTriangle(vec2<f32>(0,-1000),vec2<f32>(500,0),vec2<f32>(1000,-1000))) {
        atomicStore(&result, 1);
    }
}