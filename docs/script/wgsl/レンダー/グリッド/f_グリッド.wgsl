struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const gridSize = 10.0;

@fragment
fn main(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    let x = select(uv.x, -uv.x, uv.x < 0.0) + gridSize / 2;
    let y = select(uv.y, -uv.y, uv.y < 0.0) + gridSize / 2;
    let value = select(0.2, 0.3, (floor(x / gridSize) % 2 + floor(y / gridSize) % 2) % 2 == 0);
    output.color = vec4<f32>(value, value, value, 1.0);
    return output;
}