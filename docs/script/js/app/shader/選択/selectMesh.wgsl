struct MeshAllocation {
    vertexBufferOffset: u32,
    meshBufferOffset: u32,
    MAX_MESHES: u32,
    padding: u32,
}

struct Option {
    add: u32,
}

@group(0) @binding(0) var<storage, read_write> selected: array<u32>; // 出力
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>; // 頂点
@group(0) @binding(2) var<storage, read> meshLoops: array<u32>; // メッシュを構成する頂点インデックス
@group(0) @binding(3) var<uniform> allocation: MeshAllocation; // 配分
@group(0) @binding(4) var<uniform> optionData: Option; // オプション
@group(0) @binding(5) var<uniform> p: vec2<f32>;

// 指定ビットを 1 にする
fn setBit(arrayIndex: u32, bitIndex: u32) {
    selected[arrayIndex] = selected[arrayIndex] | (1u << bitIndex);
}

// 指定ビットを 0 にする
fn clearBit(arrayIndex: u32, bitIndex: u32) {
    selected[arrayIndex] = selected[arrayIndex] & ~(1u << bitIndex);
}

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
    if (allocation.MAX_MESHES <= global_id.x) {
        return;
    }

    let arrayStartIndex = allocation.meshBufferOffset / 32u; // 書き込み対象の先頭index
    let meshIndexStart = arrayStartIndex * 32u;

    let arrayIndex: u32 = arrayStartIndex + global_id.x; // selectedのarrayIndex
    var meshIndex = meshIndexStart + global_id.x * 32;
    for (var bitIndex = 0u; bitIndex < 32u; bitIndex ++) { // selectedのbitIndex
        if (allocation.meshBufferOffset <= meshIndex && meshIndex < allocation.meshBufferOffset + allocation.MAX_MESHES) { // チェック対象かの確認
            let indexs = getMeshLoop(meshIndex) + allocation.vertexBufferOffset;
            if (hitTestPointTriangle(vertices[indexs.x],vertices[indexs.y],vertices[indexs.z])) {
                setBit(arrayIndex, bitIndex);
            } else if (optionData.add == 0) { // 追加がoffなら
                clearBit(arrayIndex, bitIndex);
            }
        }
        meshIndex ++;
    }
}