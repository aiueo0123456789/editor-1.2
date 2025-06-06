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
@group(1) @binding(3) var<storage, read> flags: array<u32>;
@group(2) @binding(0) var<uniform> armatureAllocation: Allocation; // 配分情報

const size = 0.05;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) @interpolate(flat) boneIndex : u32, // flat指定で補間を防ぐ
    @location(1) uv: vec2<f32>,
    @location(2) kind: f32,
    @location(3) color: vec4<f32>,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

const pointData = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), // 左下
    vec2<f32>(-1.0,  1.0), // 左上
    vec2<f32>( 1.0, -1.0), // 右下
    vec2<f32>( 1.0, -1.0), // 右下
    vec2<f32>(-1.0,  1.0), // 左上
    vec2<f32>( 1.0,  1.0), // 右上
);

fn getBoolFromBit(arrayIndex: u32, bitIndex: u32) -> bool {
    return ((flags[arrayIndex] >> bitIndex) & 1u) == 1u;
}

fn getBoolFromIndex(index: u32) -> bool {
    return getBoolFromBit(index / 32u, index % 32u);
}

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32,
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    let point = pointData[vertexIndex % 6u];  // 12頂点の中から選択
    let index = armatureAllocation.vertexBufferOffset + instanceIndex;
    let bone = verticesPosition[index];
    let p = select(bone.h, bone.t, (vertexIndex % 12) / 6 == 1);
    let lenght = distance(bone.h, bone.t);
    var output: VertexOutput;

    let fixIndex = index * 2u + (vertexIndex % 12) / 6;

    output.position = worldPosToClipPos(p + point * size * lenght);
    output.uv = point;
    output.kind = select(0.0, 1.0, (vertexIndex % 12) / 6 == 1);
    output.boneIndex = index;
    output.color = select(boneColors[index], vec4<f32>(1.0,0.5,0.0,1.0), getBoolFromIndex(fixIndex));
    return output;
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const edgeWidth = 1.0 - 0.3;

@fragment
fn fmain(
    @location(0) @interpolate(flat) boneIndex: u32,
    @location(1) uv: vec2<f32>,
    @location(2) kind: f32,
    @location(3) color: vec4<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    var colorKind = false;
    if (kind == 0.0) {
        let dist = pow(uv.x, 2.0) + pow(uv.y, 2.0);
        if (dist > 1.0) {
            discard ;
        }
        colorKind = dist < edgeWidth;
    } else {
        colorKind = abs(uv.x) < edgeWidth && abs(uv.y) < edgeWidth;
    }
    output.color = select(color, vec4<f32>(0,0,0,1), colorKind);
    return output;
}