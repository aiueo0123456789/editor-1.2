struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<uniform> modifierFineness: vec2<u32>; // モディファイアの分割数
// @group(2) @binding(0) var<uniform> size: f32;
const size = 2.0;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    // let index = instanceIndex * 2u;
    let index = instanceIndex;
    let height = index / modifierFineness.x;
    let indexs = vec4<u32>(index + height, index + 1u + height, index + modifierFineness.x + 1u + height, index + modifierFineness.x + 2u + height);

    var position1 = vec2<f32>(0.0);
    var position2 = vec2<f32>(0.0);
    if (vertexIndex / 4u == 0u) {
        position1 = verticesPosition[indexs.x];
        position2 = verticesPosition[indexs.y];
    } else if (vertexIndex / 4u == 1u) {
        position1 = verticesPosition[indexs.y];
        position2 = verticesPosition[indexs.w];
    } else if (vertexIndex / 4u == 2u) {
        position1 = verticesPosition[indexs.w];
        position2 = verticesPosition[indexs.z];
    } else {
        position1 = verticesPosition[indexs.z];
        position2 = verticesPosition[indexs.x];
    }
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    if (vertexIndex % 4u == 0u) {
        offset = position1 - (normal * size) / camera.zoom;
    } else if (vertexIndex % 4u == 1u) {
        offset = position1 + (normal * size) / camera.zoom;
    } else if (vertexIndex % 4u == 2u) {
        offset = position2 - (normal * size) / camera.zoom;
    } else {
        offset = position2 + (normal * size) / camera.zoom;
    }

    var output: VertexOutput;
    output.position = worldPosToClipPos(offset);
    return output;
}