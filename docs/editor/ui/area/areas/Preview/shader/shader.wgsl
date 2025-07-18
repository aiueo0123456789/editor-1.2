struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
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
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesUV: array<vec2<f32>>;
@group(2) @binding(0) var<uniform> objectData: Allocation;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
    @location(1) uvForMask: vec2<f32>,
}

// バーテックスシェーダー
@vertex
fn vmain(
    // @builtin(vertex_index) vertexIndex: u32,
    @location(0) index: u32,
    ) -> VertexOutput {
    var output: VertexOutput;
    let fixIndex = objectData.vertexBufferOffset + index;
    output.position = vec4f((verticesPosition[fixIndex] - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = verticesUV[fixIndex];
    output.uvForMask = (output.position.xy * 0.5 + 0.5) * vec2<f32>(1.0, -1.0); // マスクはカメラに映る範囲しか表示しないので画面内のuvを求める
    return output;
}

@group(0) @binding(2) var mySampler: sampler;
@group(2) @binding(1) var myTexture: texture_2d<f32>;
@group(2) @binding(2) var maskTexture: texture_2d<f32>;
@group(2) @binding(3) var<uniform> maskType: f32;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

// フラグメントシェーダー
@fragment
fn fmain(
    @location(0) uv: vec2<f32>,
    @location(1) uvForMask: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        discard ;
    }
    let value = textureSample(maskTexture, mySampler, uvForMask).r;
    let maskValue = select(1.0 - value, value, maskType == 0.0);
    // output.color = textureSample(myTexture, mySampler, uv).bgra * maskValue;
    output.color = textureSample(myTexture, mySampler, uv) * maskValue;
    // output.color = vec4<f32>(maskValue, 0.0, 0.0, 1.0);
    return output;
}