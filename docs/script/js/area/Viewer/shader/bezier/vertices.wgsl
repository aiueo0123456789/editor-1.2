struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct Bezier {
    p: vec2<f32>,
    c1: vec2<f32>,
    c2: vec2<f32>,
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

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<Bezier>;
@group(1) @binding(1) var<storage, read> verticesSelected: array<u32>;
@group(2) @binding(0) var<uniform> bezierModifierAllocation: Allocation; // 配分情報

const size = 20.0;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
    @location(1) kind: f32,
    @location(2) color: vec4<f32>,
}

fn getBoolFromBit(arrayIndex: u32, bitIndex: u32) -> bool {
    return ((verticesSelected[arrayIndex] >> bitIndex) & 1u) == 1u;
}

fn getBoolFromIndex(index: u32) -> bool {
    return getBoolFromBit(index / 32u, index % 32u);
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
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
    let index = bezierModifierAllocation.vertexBufferOffset + instanceIndex;
    let point = pointData[vertexIndex % 6u];  // 12頂点の中から選択
    let bezier = verticesPosition[index];
    let vertexType = (vertexIndex % 18) / 6;
    let p = select(select(bezier.c1, bezier.c2, vertexType == 2), bezier.p, vertexType == 0);
    var output: VertexOutput;
    output.position = worldPosToClipPos(p + (point * size) / camera.zoom);
    output.uv = point;
    output.kind = select(1.0, 0.0, vertexType == 0);
    output.color = select(vec4<f32>(0.0,1.0,0.0,1.0), vec4<f32>(1.0,0.0,0.0,1.0), getBoolFromIndex(index * 3u + (vertexIndex % 18) / 6));
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