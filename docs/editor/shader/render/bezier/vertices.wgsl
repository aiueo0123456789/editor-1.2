struct Camera {
    position: vec2<f32>,
    cvsSize: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct Bezier {
    p: vec2<f32>,
    c1: vec2<f32>,
    c2: vec2<f32>,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<array<vec2<f32>, 3>>;
@group(1) @binding(1) var<storage, read> verticesSelected: array<u32>; // array<vec3<u32>>だとpaddingが入る

const size = 10.0;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
    @location(1) kind: f32,
    @location(2) color: vec4<f32>,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * camera.cvsSize, 0, 1.0);
}

const pointData = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), // 左下
    vec2<f32>(-1.0,  1.0), // 左上
    vec2<f32>( 1.0, -1.0), // 右下
    vec2<f32>( 1.0, -1.0), // 右下
    vec2<f32>(-1.0,  1.0), // 左上
    vec2<f32>( 1.0,  1.0), // 右上
);

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32,
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    let index = instanceIndex;
    let point = pointData[vertexIndex % 6u]; // 12頂点の中から選択
    let bezier = verticesPosition[index];
    let vertexType = (vertexIndex % 18) / 6;
    let p = bezier[vertexType];
    var output: VertexOutput;
    output.position = worldPosToClipPos(p + (point * size) / camera.zoom);
    output.uv = point;
    output.kind = select(1.0, 0.0, vertexType == 0);
    output.color = select(vec4<f32>(0.0,1.0,0.0,1.0), vec4<f32>(1.0,0.0,0.0,1.0), verticesSelected[index * 3u + vertexType] == 1u);
    return output;
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const edgeWidth = 1.0 - 0.3;

@fragment
fn fmain(
    @location(0) uv: vec2<f32>,
    @location(1) kind: f32,
    @location(2) color: vec4<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    var colorKind = false;
    if (kind == 0.0) {
        let dist = pow(uv.x, 2.0) + pow(uv.y, 2.0);
        if (dist > 1.0) {
            discard ;
        }
        colorKind = dist < edgeWidth;
    } else {
        colorKind = abs(uv.x) < edgeWidth && abs(uv.y) < edgeWidth;
    }
    output.color = select(color, vec4<f32>(0,0,0,1), colorKind);
    return output;
}