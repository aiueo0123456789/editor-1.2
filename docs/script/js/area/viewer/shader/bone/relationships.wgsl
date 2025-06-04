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

const size = 2;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) y: f32,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    // 頂点データを取得
    let index = instanceIndex + armatureAllocation.vertexBufferOffset;
    let parent = relationships[index];
    let position1 = verticesPosition[index].h;
    let position2 = verticesPosition[parent].h;
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);

    let k = (normal * size) / camera.zoom;

    var output: VertexOutput;
    if (vertexIndex % 4u == 0u) {
        offset = position1 - k;
        output.y = 0;
    } else if (vertexIndex % 4u == 1u) {
        offset = position1 + k;
        output.y = 0;
    } else if (vertexIndex % 4u == 2u) {
        offset = position2 - k;
        output.y = length(sub);
    } else {
        offset = position2 + k;
        output.y = length(sub);
    }

    output.position = worldPosToClipPos(offset);
    return output;
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const sectionLength = 5.0;

@fragment
fn fmain(
    @location(0) y: f32,
) -> FragmentOutput {
    var output: FragmentOutput;
    let boolV = floor(y / sectionLength) % 2 == 1;
    output.color = vec4<f32>(1,0,0,select(0.0,1.0,boolV));
    // output.color = vec4<f32>(1,0,0,1);
    return output;
}