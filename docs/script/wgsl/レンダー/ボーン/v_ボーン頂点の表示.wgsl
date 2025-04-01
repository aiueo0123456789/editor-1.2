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
const size = 0.05;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

const pointData = array<vec4<f32>, 12>(
    // 1つ目の四角形 (hを基準)
    vec4<f32>(-1.0, -1.0, 0.0, 1.0), // 左下
    vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0,  1.0, 1.0, 0.0), // 右上

    // 2つ目の四角形 (tを基準)
    vec4<f32>(-1.0, -1.0, 0.0, 1.0),
    vec4<f32>(-1.0,  1.0, 0.0, 0.0),
    vec4<f32>( 1.0, -1.0, 1.0, 1.0),
    vec4<f32>( 1.0, -1.0, 1.0, 1.0),
    vec4<f32>(-1.0,  1.0, 0.0, 0.0),
    vec4<f32>( 1.0,  1.0, 1.0, 0.0)
);

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32,
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    let point = pointData[vertexIndex % 12u];  // 12頂点の中から選択
    let bone = verticesPosition[instanceIndex];
    let p = select(bone.h, bone.t, (vertexIndex % 12) / 6 == 1);
    var output: VertexOutput;
    output.position = worldPosToClipPos(p + point.xy * size * distance(bone.h, bone.t));
    output.uv = point.zw;
    return output;
}

@group(2) @binding(0) var<uniform> color: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const sectionLength = 2.0;

@fragment
fn fmain(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    let dist = pow(uv.x * 2.0 - 1.0, 2.0) + pow(uv.y * 2.0 - 1.0, 2.0);
    if (dist > 1.0) {
        discard ;
    }
    output.color = select(color, vec4<f32>(0,0,0,1), dist < 0.7 * 0.7);
    return output;
}