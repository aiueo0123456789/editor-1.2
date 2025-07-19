struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct MeshAllocation {
    vertexBufferOffset: u32,
    meshBufferOffset: u32,
    MAX_MESHES: u32,
    padding: u32,
}

struct WeightBlock {
    indexs: vec4<u32>,
    weights: vec4<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> meshLoops: array<u32>;
@group(1) @binding(2) var<storage, read> verticesSelected: array<u32>;
@group(1) @binding(3) var<storage, read> weightBlocks: array<WeightBlock>; // indexと重みのデータ
@group(2) @binding(0) var<uniform> objectData: MeshAllocation; // 配分
@group(2) @binding(1) var<storage, read> baseSilhouetteEdges: array<vec2<u32>>; // シルエットの辺
@group(2) @binding(2) var<storage, read> baseEdges: array<vec2<u32>>; // 辺

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) color: vec4<f32>,
}

fn getBoolFromBit(arrayIndex: u32, bitIndex: u32) -> bool {
    return ((verticesSelected[arrayIndex] >> bitIndex) & 1u) == 1u;
}

fn getBoolFromIndex(index: u32) -> bool {
    return getBoolFromBit(index / 32u, index % 32u);
}

const size = 2.0;

fn getMeshLoop(index: u32) -> vec3<u32> {
    return vec3<u32>(meshLoops[index * 3u], meshLoops[index * 3u + 1u], meshLoops[index * 3u + 2u]);
}

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    // 頂点データを取得
    // let index = instanceIndex * 2u;
    let indexs = baseSilhouetteEdges[instanceIndex] + objectData.vertexBufferOffset;

    var position1 = verticesPosition[indexs.x];
    var position2 = verticesPosition[indexs.y];
    var b = getBoolFromIndex(indexs.x) && getBoolFromIndex(indexs.y);
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);

    let v = (normal * size) / camera.zoom;
    // let v = (normal * lineConfig.width) / select(camera.zoom, 1.0, lineConfig.cze == 0.0);
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
    output.color = select(vec4f(0,0,1,1),vec4f(0,1,0,1),b);
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