struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uvForMask: vec2<f32>,
};

const pointData = array<vec4<f32>, 4>(
    vec4<f32>(-1.0, -1.0, 0.0, 0.0), // 左下
    vec4<f32>(-1.0, 1.0, 0.0, 1.0), // 左上
    vec4<f32>(1.0, -1.0, 1.0, 0.0), // 右下
    vec4<f32>(1.0, 1.0, 1.0, 1.0), // 右上
);

@vertex
fn vmain(
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    var output: VertexOutput;
    let point = pointData[vertexIndex];
    output.position = vec4<f32>(point.xy, 0.0, 1.0);
    output.uvForMask = point.zw;
    output.uvForMask.y = 1.0 - output.uvForMask.y;
    return output;
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var maskTexture: texture_2d<f32>;

@fragment
fn fmain(@location(0) uvForMask: vec2<f32>) -> @location(0) vec4<f32> {
    let color = vec4<f32>(1.0, 0.0, 0.0, textureSample(maskTexture, mySampler, uvForMask).r * 0.5);

    return color;
}
