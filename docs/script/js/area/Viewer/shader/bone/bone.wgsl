struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
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
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;
@group(1) @binding(1) var<storage, read> boneColors: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read> relationships: array<u32>;
@group(1) @binding(3) var<storage, read> verticesSelected: array<u32>;
@group(1) @binding(4) var<storage, read> bonesSelected: array<u32>;
@group(2) @binding(0) var<uniform> armatureAllocation: Allocation; // 配分情報

const size = 0.04;
const ratio = 0.1;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) color: vec4<f32>,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

fn getBoolFromIndex(index: u32) -> bool {
    return ((verticesSelected[index / 32u] >> (index % 32u)) & 1u) == 1u;
}

fn getBoneSelectedBoolFromIndex(index: u32) -> bool {
    return ((bonesSelected[index / 32u] >> (index % 32u)) & 1u) == 1u;
}

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let index = instanceIndex + armatureAllocation.vertexBufferOffset;
    let position1 = verticesPosition[index].h;
    let position2 = verticesPosition[index].t;
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    let sectionPosition = mix(position1, position2, ratio);

    let vIndex = vertexIndex;

    let k = (normal * size * length(sub));
    if (vIndex == 0u) {
        offset = sectionPosition - k;
    } else if (vIndex == 1u) {
        offset = sectionPosition + k;
    } else if (vIndex == 2u) {
        offset = position2;
    } else if (vIndex == 3u) {
        offset = sectionPosition - k;
    } else if (vIndex == 4u) {
        offset = sectionPosition + k;
    } else if (vIndex == 5u) {
        offset = position1;
    }

    var output: VertexOutput;
    output.position = worldPosToClipPos(offset);

    let fixIndex = index * 2u;
    // output.color = select(boneColors[index], vec4<f32>(1.0,0.5,0.0,1.0), getBoolFromIndex(fixIndex) && getBoolFromIndex(fixIndex + 1u));
    output.color = select(boneColors[index], vec4<f32>(1.0,0.5,0.0,1.0), getBoneSelectedBoolFromIndex(index));
    return output;
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn fmain(
    @location(0) color: vec4<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = color;
    // output.color = vec4<f32>(0,1,0,1);
    return output;
}