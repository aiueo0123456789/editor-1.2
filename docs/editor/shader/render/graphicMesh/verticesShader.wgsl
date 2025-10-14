struct Camera {
    position: vec2<f32>,
    cvsSize: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesCoordinates: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesUVs: array<vec2<f32>>;
@group(1) @binding(2) var<storage, read> silhouetteEdges: array<vec2<u32>>; // シルエットの辺
@group(1) @binding(3) var<storage, read> edges: array<vec2<u32>>; // 辺
@group(1) @binding(4) var<storage, read> meshLoops: array<u32>;
@group(1) @binding(5) var<storage, read> vertexSelected: array<u32>;
@group(1) @binding(6) var<storage, read> silhouetteEdgeSelectedBuffer: array<u32>;
@group(1) @binding(7) var<storage, read> edgeSelected: array<u32>;
@group(1) @binding(8) var<storage, read> meshSelected: array<u32>;
@group(1) @binding(9) var<uniform> zIndex: f32;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) color: vec4<f32>,
}

const size = 5.0;

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

    let point = pointData[vertexIndex % 4u];
    output.position = vec4f(((verticesCoordinates[instanceIndex] - camera.position) * camera.zoom + point.xy * size) * camera.cvsSize, 0, 1.0);
    output.color = select(vec4f(0,0,0,1), vec4f(1,0,0,1), vertexSelected[instanceIndex] == 1u);
    return output;
}

@group(0) @binding(1) var mySampler: sampler;
@group(1) @binding(10) var myTexture: texture_2d<f32>;

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