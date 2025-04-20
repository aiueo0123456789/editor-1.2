struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;

@group(1) @binding(0) var<uniform> centerPoint: vec2<f32>;
@group(1) @binding(1) var<uniform> radius: f32;
@group(1) @binding(2) var<uniform> width: f32;
@group(1) @binding(3) var<uniform> color: vec4<f32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
    @location(1) color: vec4<f32>,
}

const pointData = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0), // 左下
    vec2<f32>(-1.0,  1.0), // 左上
    vec2<f32>( 1.0, -1.0), // 右下
    vec2<f32>( 1.0,  1.0), // 右上
);

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let point = pointData[vertexIndex];

    var output: VertexOutput;
    output.position = vec4f((centerPoint + point * radius - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = point * radius;
    return output;
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn fmain(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    let dist = pow(uv.x, 2.0) + pow(uv.y, 2.0);
    if (dist <= radius * radius && dist >= (radius - width) * (radius - width)) {
    } else {
        discard ;
    }
    output.color = color;
    return output;
}