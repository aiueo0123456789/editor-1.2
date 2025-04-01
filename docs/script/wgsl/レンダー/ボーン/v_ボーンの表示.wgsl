struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;
// @group(2) @binding(0) var<uniform> size: f32;
const size = 0.05;
const ratio = 0.1;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
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
    let index = instanceIndex;
    let position1 = verticesPosition[index].h;
    let position2 = verticesPosition[index].t;
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    let sectionPosition = mix(position1, position2, ratio);

    let vIndex = vertexIndex % 6u;

    let k = (normal * size * length(sub));
    if (vIndex == 0u) {
        offset = sectionPosition - k;
    } else if (vIndex == 1u) {
        offset = sectionPosition + k;
    } else if (vIndex == 2u) {
        offset = position2;
    } else if (vIndex == 3u) {
        offset = sectionPosition - k;
    } else if (vIndex == 4u) {
        offset = sectionPosition + k;
    } else if (vIndex == 5u) {
        offset = position1;
    }

    var output: VertexOutput;
    output.position = worldPosToClipPos(offset);
    output.uv = offset;
    return output;
}