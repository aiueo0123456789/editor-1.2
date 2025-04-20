struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct IndexAndWeight {
    index: vec4<u32>,
    weight: vec4<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesIndexAndWeight: array<IndexAndWeight>;
@group(2) @binding(0) var<storage, read> targetIndex: u32;

const size = 50;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
    @location(1) weight: f32,
}

const pointData = array<vec4<f32>, 4>(
    vec4<f32>(-1.0, -1.0, -0.5, 0.5), // 左下
    vec4<f32>(-1.0,  1.0, -0.5, -0.5), // 左上
    vec4<f32>( 1.0, -1.0, 0.5, 0.5), // 右下
    vec4<f32>( 1.0,  1.0, 0.5, -0.5), // 右上
);

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let point = pointData[vertexIndex % 4u];

    var output: VertexOutput;
    output.position = vec4f((verticesPosition[instanceIndex] + point.xy * size / camera.zoom - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = point.zw;
    // 表示ターゲットのindexを検索する
    let data = verticesIndexAndWeight[instanceIndex];
    let indexs = data.index;
    let weights = data.weight;
    var weight = 0.0;
    for (var i = 0u; i < 4u; i ++) {
        if (indexs[i] == targetIndex) {
            weight = weights[i];
            break ;
        }
    }
    output.weight = weight;
    return output;
}

fn is_point_in_sector(
    // テストする点（中心からの相対位置）
    point: vec2<f32>,
    // 扇の開始角度（ラジアン）
    start_angle: f32,
    // 扇の終了角度（ラジアン）
    end_angle: f32,
    // 扇の内径（中心から内側の円までの距離）
    inner_radius: f32,
    // 扇の外径（中心から外側の円までの距離）
    outer_radius: f32
) -> bool {
    // ポイントの中心からの距離
    let distance = length(point);

    // 距離が内径と外径の間にあるかチェック
    if distance < inner_radius || distance > outer_radius {
        return false;
    }

    // ポイントの角度を計算（atan2を使用）
    let angle = atan2(point.y, point.x);

    // 角度を0～2πの範囲に正規化
    let normalized_angle = angle + select(0.0, 2.0 * PI, angle < 0.0);
    let normalized_start = start_angle;
    let normalized_end = end_angle;

    // 角度が開始角度と終了角度の間にあるかチェック
    if normalized_start <= normalized_end {
        return normalized_angle >= normalized_start && normalized_angle <= normalized_end;
    } else {
        // 開始角度が終了角度を超える場合（360度を跨ぐ場合）
        return normalized_angle >= normalized_start || normalized_angle <= normalized_end;
    }
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const PI = 3.14;
const strokeWidth = 0.1;

@fragment
fn fmain(
    @location(0) uv: vec2<f32>,
    @location(1) weight: f32,
) -> FragmentOutput {
    var output: FragmentOutput;
    if (uv.x * uv.x + uv.y * uv.y > 0.5 * 0.5) { // 円の外
        discard ;
    } else if (uv.x * uv.x + uv.y * uv.y > (0.5 - strokeWidth) * (0.5 - strokeWidth)) {
        output.color = vec4<f32>(0,0,0,1);
    } else {
        let end_angle = weight * 2.0 * PI; // weightが1の時ラジアンで360になるように
        let color = select(0.2, 0.9, is_point_in_sector(uv, 0, end_angle, 0, 0.5));
        output.color = vec4<f32>(color,color,color,1);
    }
    return output;
}