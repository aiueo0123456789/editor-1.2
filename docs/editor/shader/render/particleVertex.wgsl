struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct Allocation {
    particleOffset: u32,
    MAX_PARTICLES: u32,
    padding0: u32,
    padding1: u32,
    padding2: u32,
    padding3: u32, // 親がなければ0
    padding4: u32, // 親がなければ0
    padding5: u32,
}

struct Particle {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    zIndex: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> particles: array<Particle>;
@group(2) @binding(0) var<uniform> objectData: Allocation;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

const pointData = array<vec2<f32>, 4>(
    vec2<f32>(-0.5, -0.5), // 左下
    vec2<f32>(-0.5,  0.5), // 左上
    vec2<f32>( 0.5, -0.5), // 右下
    vec2<f32>( 0.5,  0.5), // 右上
);

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32,
    @builtin(vertex_index) vertexIndex: u32,
    // @location(0) index: u32,
) -> VertexOutput {
    let localIndex = vertexIndex % 4u;
    var output: VertexOutput;
    let fixIndex = objectData.particleOffset + instanceIndex;
    let particle = particles[fixIndex];
    output.position = vec4f((particle.position + pointData[localIndex] * particle.scale - camera.position) * camera.zoom * cvsAspect, 1.0 / (particles[fixIndex].zIndex + 1.0), 1.0);
    output.uv = pointData[localIndex] + 0.5;
    return output;
}

@group(0) @binding(2) var mySampler: sampler;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

// フラグメントシェーダー
@fragment
fn fmain(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    // if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    //     discard ;
    // }
    output.color = vec4<f32>(1.0, 1.0, 1.0, 1.0 - length(uv - 0.5) * 2.0);
    return output;
}