struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> edges: array<vec2<u32>>;

const size = 5;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let edge = edges[instanceIndex];
    let position1 = verticesPosition[edge.x];
    let position2 = verticesPosition[edge.y];

    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    let k = (normal * size) / camera.zoom;
    var output: VertexOutput;
    if (vertexIndex % 4u == 0u) {
        offset = position1 - k;
    } else if (vertexIndex % 4u == 1u) {
        offset = position1 + k;
    } else if (vertexIndex % 4u == 2u) {
        offset = position2 - k;
    } else {
        offset = position2 + k;
    }
    output.position = worldPosToClipPos(offset);
    return output;
}

@group(2) @binding(0) var<uniform> color: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const sectionLength = 2.0;

@fragment
fn fmain(
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = color;
    return output;
}