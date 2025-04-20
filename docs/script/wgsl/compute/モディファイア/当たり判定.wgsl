
@group(0) @binding(0) var<storage, read_write> hitTestResult: array<f32>; // 出力
@group(0) @binding(1) var<uniform> point: vec2<f32>; // 距離を計算する座標
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<uniform> modifierFineness: vec2<u32>; // モディファイアの分割数

fn cross2D(a: vec2<f32>, b: vec2<f32>) -> f32 {
    return a.x * b.y - a.y * b.x;
}

fn hitTestPointTriangle(a: vec2<f32>, b: vec2<f32>, c: vec2<f32>, p: vec2<f32>) -> bool {
    let ab = b - a;
    let bp = p - b;

    let bc = c - b;
    let cp = p - c;

    let ca = a - c;
    let ap = p - a;

    let c1 = cross2D(ab, bp);
    let c2 = cross2D(bc, cp);
    let c3 = cross2D(ca, ap);
    return (c1 > 0.0 && c2 > 0.0 && c3 > 0.0) || (c1 < 0.0 && c2 < 0.0 && c3 < 0.0);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= 4) {
        return ;
    }
    // 4つかどのindexを求める
    let sectionX = index % 2u;
    let sectionY = index / 2u;
    let vertIndex = i32((sectionX * (modifierFineness.x)) + ((sectionY * modifierFineness.y) * modifierFineness.x));

    let xk = -(i32(sectionX) * 2 - 1);
    let yk = -(i32(sectionY) * 2 - 1);
    let height = select(0,i32(modifierFineness.y),sectionY == 1u);
    let top = vertIndex + height;
    let bottom = vertIndex + (i32(modifierFineness.x) * yk) + height + yk;
    // let indexs = vec4<i32>(top, top + xk, bottom, bottom + xk);
    let indexs = vec3<i32>(top, top + xk, bottom);

    let a = verticesPosition[indexs.x];
    let b = mix(verticesPosition[indexs.x], verticesPosition[indexs.y], 0.4);
    let c = mix(verticesPosition[indexs.x], verticesPosition[indexs.z], 0.4);

    if (hitTestPointTriangle(a,b,c,point)) {
        hitTestResult[index] = 100.0;
    } else {
        hitTestResult[index] = 0.0;
    }
}