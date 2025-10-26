struct Camera {
    position: vec2<f32>,
    cvsSize: vec2<f32>,
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

@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesCoordinates: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesUVs: array<vec2<f32>>;
@group(1) @binding(2) var<storage, read> weightBlocks: array<f32>; // indexと重みのデータ
@group(1) @binding(3) var<storage, read> meshLoops: array<u32>;
@group(1) @binding(4) var<uniform> zIndex: f32;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    var output: VertexOutput;
    let index = meshLoops[vertexIndex];
    output.position = vec4f((verticesCoordinates[index] - camera.position) * camera.zoom * camera.cvsSize, zIndex, 1.0);
    output.uv = verticesUVs[index];
    return output;
}

@group(0) @binding(1) var mySampler: sampler;
@group(1) @binding(5) var myTexture: texture_2d<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

// フラグメントシェーダー
@fragment
fn fmain(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        discard ;
    }
    let c = textureSample(myTexture, mySampler, uv);
    output.color = c;
    if (output.color.a == 0.0) {
        discard ;
    }
    // output.color = select(vec4<f32>(0.0), vec4<f32>(1.0,0.0,0.0,1.0), textureSample(myTexture, mySampler, uv).a > 0.05);
    return output;
}