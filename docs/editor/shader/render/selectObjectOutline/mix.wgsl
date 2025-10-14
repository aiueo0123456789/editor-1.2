struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uvForMask: vec2<f32>,
};

const pointData = array<vec4<f32>, 4>(
    vec4<f32>(-1.0, -1.0, 0.0, 0.0), // 左下
    vec4<f32>(-1.0,  1.0, 0.0, 1.0), // 左上
    vec4<f32>( 1.0, -1.0, 1.0, 0.0), // 右下
    vec4<f32>( 1.0,  1.0, 1.0, 1.0), // 右上
);

@vertex
fn vmain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var output: VertexOutput;
    let point = pointData[vertexIndex];
    output.position = vec4<f32>(point.xy, 0.0, 1.0);
    output.uvForMask = vec2<f32>(point.z, 1.0 - point.w);
    return output;
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var maskTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> edgeColor: vec4<f32>;

const outlineSize = 1.5;
const threshold = 1.0 / 255.0; // 約0.0039215

@fragment
fn fmain(@location(0) uvForMask: vec2<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(maskTexture, 0));
    let pixel = 1.0 / texSize;
    let offset = pixel * outlineSize;

    // Sobel フィルターのサンプル座標
    let s00 = textureSample(maskTexture, mySampler, uvForMask + vec2<f32>(-offset.x, -offset.y)).r;
    let s01 = textureSample(maskTexture, mySampler, uvForMask + vec2<f32>( 0.0,       -offset.y)).r;
    let s02 = textureSample(maskTexture, mySampler, uvForMask + vec2<f32>( offset.x,  -offset.y)).r;

    let s10 = textureSample(maskTexture, mySampler, uvForMask + vec2<f32>(-offset.x,  0.0)).r;
    let s11 = textureSample(maskTexture, mySampler, uvForMask).r;
    let s12 = textureSample(maskTexture, mySampler, uvForMask + vec2<f32>( offset.x,  0.0)).r;

    let s20 = textureSample(maskTexture, mySampler, uvForMask + vec2<f32>(-offset.x,  offset.y)).r;
    let s21 = textureSample(maskTexture, mySampler, uvForMask + vec2<f32>( 0.0,        offset.y)).r;
    let s22 = textureSample(maskTexture, mySampler, uvForMask + vec2<f32>( offset.x,   offset.y)).r;

    // Sobelカーネルによる勾配計算
    let gx = (s02 + 2.0 * s12 + s22) - (s00 + 2.0 * s10 + s20);
    let gy = (s00 + 2.0 * s01 + s02) - (s20 + 2.0 * s21 + s22);

    // エッジ強度（勾配の長さ）
    let gradient = sqrt(gx * gx + gy * gy);

    // 閾値以上だけを描画（1/255 以上の差分を検出）
    let edge = select(0.0, 1.0, gradient > threshold);

    // 色出力（エッジ部分のみ）
    var color = select(vec4<f32>(1.0, 0.5, 0.0, 1.0), vec4<f32>(1.0, 0.8, 0.0, 1.0), s11 == threshold || s01 == threshold || s02 == threshold || s10 == threshold || s20 == threshold);
    color.a *= edge;

    return color;
}