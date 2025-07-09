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

struct WeightBlock {
    indexs: vec4<u32>,
    weights: vec4<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<Bezier>;
@group(1) @binding(1) var<storage, read> verticesSelected: array<u32>;
@group(1) @binding(2) var<storage, read> weightBlocks: array<WeightBlock>; // indexと重みのデータ
@group(2) @binding(0) var<uniform> bezierModifierAllocation: Allocation; // 配分情報
const size = 3.0;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
}

const pointData = array<vec4<f32>, 4>(
    vec4<f32>(-1.0, -1.0, 0.0, 1.0), // 左下
    vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>( 1.0,  1.0, 1.0, 0.0), // 右上
);

fn mathBezier(p1: vec2<f32>, c1: vec2<f32>, c2: vec2<f32>, p2: vec2<f32>, t: f32) -> vec2<f32> {
    let u = 1.0 - t;
    return p1 * pow(u, 3.0) + c1 * 3.0 * pow(u, 2.0) * t + c2 * 3.0 * u * pow(t, 2.0) + p2 * pow(t, 3.0);
}

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    // 頂点データを取得
    let index = instanceIndex + bezierModifierAllocation.vertexBufferOffset;
    let point1 = verticesPosition[index];
    let point2 = verticesPosition[index + 1u];
    let deltaT = 1.0 / 50.0;
    let t = f32(vertexIndex / 2u) / 50.0;
    let position1 = mathBezier(point1.p, point1.c2, point2.c1, point2.p, t);
    let position2 = mathBezier(point1.p, point1.c2, point2.c1, point2.p, t + deltaT);
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);

    let v = (normal * size) / camera.zoom;
    if (vertexIndex % 4u == 0u) {
        offset = position1 - v;
    } else if (vertexIndex % 4u == 1u) {
        offset = position1 + v;
    } else if (vertexIndex % 4u == 2u) {
        offset = position2 - v;
    } else {
        offset = position2 + v;
    }

    var output: VertexOutput;
    output.position = vec4f((offset - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    return output;
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn fmain(
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = vec4<f32>(0,0,0.5,1);
    return output;
}