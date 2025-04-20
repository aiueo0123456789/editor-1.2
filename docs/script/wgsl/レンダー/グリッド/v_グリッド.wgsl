@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

const pointData = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0), // 左下
    vec2<f32>(-1.0, 1.0), // 左上
    vec2<f32>(1.0, -1.0), // 右下
    vec2<f32>(1.0, 1.0), // 右上
);

@vertex
fn main(
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    var output: VertexOutput;
    let point = pointData[vertexIndex];
    output.position = vec4<f32>(point.xy, 0.0, 1.0);
    output.uv = point.xy * (1 / cvsAspect) / camera.zoom + camera.position;
    return output;
}