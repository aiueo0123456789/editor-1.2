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


struct MeshLoop {
    indexs: vec4<f32>,
}


@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> meshLoops: array<MeshLoop>;
@group(1) @binding(2) var<storage, read> flags: array<u32>;
@group(2) @binding(0) var<uniform> objectData: Allocation;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) color: vec4<f32>,
}

fn getBit(arrayIndex: u32, bitIndex: u32) -> u32 {
    return (flags[arrayIndex] >> bitIndex) & 1u;
}

const size = 8.0;

const pointData = array<vec4<f32>, 4>(
    vec4<f32>(-1.0, -1.0, 0.0, 1.0), // 左下
    vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>( 1.0,  1.0, 1.0, 0.0), // 右上
);

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    var output: VertexOutput;
    let fixIndex = objectData.vertexBufferOffset + instanceIndex;
    let flagsArrayIndex = fixIndex / 32u;
    let flagBitIndex = fixIndex % 32u;

    let point = pointData[vertexIndex % 4u];
    output.position = vec4f((verticesPosition[fixIndex] + point.xy * size / camera.zoom - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.color = select(vec4f(0,0,0,1), vec4f(1,0,0,1), getBit(flagsArrayIndex, flagBitIndex) == 1u);
    return output;
}

@group(0) @binding(2) var mySampler: sampler;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

// フラグメントシェーダー
@fragment
fn fmain(
    @location(0) color: vec4<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    // if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    //     discard ;
    // }
    output.color = color;
    return output;
}