from pyparsing import Word, alphas, alphanums, oneOf, Group, Forward, Suppress, nestedExpr, restOfLine

# キーワード
STRUCT = Suppress("struct")
FN = Suppress("fn")
IDENT = Word(alphas, alphanums + "_")

# struct パターン
struct_body = nestedExpr("{", "}")
struct_def = STRUCT + IDENT("name") + struct_body("body")
struct_def.setParseAction(lambda t: f"struct {t.name} {t.body[0]}")

# function パターン
fn_body = nestedExpr("{", "}")
fn_def = FN + IDENT("name") + "(" + restOfLine + ")" + "->" + Word(alphas + "<>") + fn_body("body")
fn_def.setParseAction(lambda t: f"fn {t.name}() -> {t[2]} {t.body[0]}")

# 解析対象
wgsl_code = """
struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(2) @binding(0) var<uniform> size: f32;
@group(3) @binding(0) var<storage, read> indexs: array<u32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

const pointData = array<vec4<f32>, 4>(
    vec4<f32>(-1.0, -1.0, 0.0, 1.0), // 左下
    vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>( 1.0,  1.0, 1.0, 0.0), // 右上
);

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let point = pointData[vertexIndex % 4u];

    var output: VertexOutput;
    output.position = vec4f((verticesPosition[indexs[instanceIndex]] + point.xy * size / camera.zoom - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = point.zw;
    return output;
}
"""

for result in (struct_def.searchString(wgsl_code) + fn_def.searchString(wgsl_code)):
    print(result[0])