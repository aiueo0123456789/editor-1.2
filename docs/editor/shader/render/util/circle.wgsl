struct Camera {
    position: vec2<f32>,
    cvsSize: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct AffectedForZoom {
    raidus: f32,
    stroke: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var mySampler: sampler;
@group(1) @binding(0) var<uniform> coordinate: vec2<f32>;
@group(1) @binding(1) var<uniform> raidus: f32;
@group(1) @binding(2) var<uniform> color: vec4<f32>;
@group(1) @binding(3) var<uniform> strokeWidth: f32;
@group(1) @binding(4) var<uniform> strokeColor: vec4<f32>;
@group(1) @binding(5) var<uniform> isAffectedForZoom: AffectedForZoom;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

const pointData = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0), // 左下
    vec2<f32>(-1.0,  1.0), // 左上
    vec2<f32>( 1.0, -1.0), // 右下
    vec2<f32>( 1.0,  1.0), // 右上
);

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    var output: VertexOutput;

    let point = pointData[vertexIndex % 4u];
    output.position = vec4f(
        (
            (
                point * raidus * isAffectedForZoom.raidus +
                point * strokeWidth * isAffectedForZoom.stroke +
                coordinate - camera.position
            ) * camera.zoom +
            point * raidus * (1.0 - isAffectedForZoom.raidus) +
            point * strokeWidth * (1.0 - isAffectedForZoom.stroke)
        ) * camera.cvsSize,
        0,
        1.0
        );
    output.uv = (point * raidus * isAffectedForZoom.raidus + point * strokeWidth * isAffectedForZoom.stroke) * camera.zoom + (point * raidus * (1.0 - isAffectedForZoom.raidus) + point * strokeWidth * (1.0 - isAffectedForZoom.stroke));
    return output;
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

// フラグメントシェーダー
@fragment
fn fmain(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    let dist = length(uv);
    let fixRadius = (raidus * isAffectedForZoom.raidus) * camera.zoom + (raidus * (1.0 - isAffectedForZoom.raidus));
    let fixStrokeWidth = (strokeWidth * isAffectedForZoom.stroke) * camera.zoom + (strokeWidth * (1.0 - isAffectedForZoom.stroke));
    let sumRadius = fixRadius + fixStrokeWidth;
    if (dist < sumRadius) {
        if (dist < fixRadius) {
            output.color = color;
        } else {
            output.color = strokeColor;
        }
    } else {
        discard ;
    }
    return output;
}