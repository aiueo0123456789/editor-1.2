export const shaders = new Map()
// paint.wgsl
shaders.set('./script/js/データマネージャー/GPU/weight/paint.wgsl',`struct Output {
    indexs: vec4<u32>,
    weights: vec4<f32>,
}

struct Config {
    decayType: u32,
    decaySize: f32,
    index: u32,
    weight: f32,
}

@group(0) @binding(0) var<storage, read_write> indexAndWeight: array<Output>;
@group(0) @binding(1) var<storage, read> originalIndexAndWeight: array<Output>;
@group(0) @binding(2) var<storage, read_write> maxWeights: array<f32>;
@group(0) @binding(3) var<storage, read> vertices: array<vec2<f32>>;
@group(1) @binding(0) var<uniform> config: Config;
@group(1) @binding(1) var<uniform> centerPoint: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&vertices) <= index) {
        return;
    }
    let dist = distance(centerPoint, vertices[index]);
    let decay = (config.decaySize - dist) / config.decaySize;
    if (dist < config.decaySize) {
        let weight = config.weight * decay;
        maxWeights[index] = max(maxWeights[index],weight);
    }
    var minIndex = 0u;
    var minWeight = 1.1;
    let data = originalIndexAndWeight[index];
    for (var i = 0u; i < 4u; i ++) {
        if (config.index == data.indexs[i]) {
            minIndex = i;
            minWeight = data.weights[i];
            break ;
        } else if (data.weights[i] < minWeight) {
            minIndex = i;
            minWeight = data.weights[i];
        }
    }
    if (minWeight < maxWeights[index]) {
        indexAndWeight[index].indexs[minIndex] = config.index;
        indexAndWeight[index].weights[minIndex] = maxWeights[index];
        var sumWeight = 0.0;
        for (var i = 0u; i < 4u; i ++) {
            sumWeight += indexAndWeight[index].weights[i];
        }
        indexAndWeight[index].weights /= sumWeight; // 正規化
    }
}`)
// resize.wgsl
shaders.set('./script/js/データマネージャー/GPU/vertices/resize.wgsl',`@group(0) @binding(0) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> originalVertices: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> baseData: array<vec2<f32>>; // 基準
@group(0) @binding(3) var<storage, read> weigth: array<f32>;
@group(0) @binding(4) var<uniform> centerPoint: vec2<f32>;
@group(0) @binding(5) var<uniform> value: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&weigth) <= index) {
        return;
    }
    let sub = (originalVertices[index] - centerPoint);
    // output[index] = sub * (value) * (weigth[index]) + sub + centerPoint;
    output[index] = ((sub * (value) + centerPoint) * weigth[index]) + (originalVertices[index] * (1.0 - weigth[index])) - baseData[index];
}`)
// rotate.wgsl
shaders.set('./script/js/データマネージャー/GPU/vertices/rotate.wgsl',`@group(0) @binding(0) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> originalVertices: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> baseData: array<vec2<f32>>; // 基準
@group(0) @binding(3) var<storage, read> weigth: array<f32>;
@group(0) @binding(4) var<uniform> centerPoint: vec2<f32>;
@group(0) @binding(5) var<uniform> value: vec2<f32>;

fn rotate(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(
        p.x * c - p.y * s,
        p.x * s + p.y * c,
    );
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&weigth) <= index) {
        return;
    }
    let sub = rotate(originalVertices[index] - centerPoint, value.x * (weigth[index]));
    output[index] = sub + centerPoint - baseData[index];
}`)
// translate.wgsl
shaders.set('./script/js/データマネージャー/GPU/vertices/translate.wgsl',`@group(0) @binding(0) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> originalVertices: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> baseData: array<vec2<f32>>; // 基準
@group(0) @binding(3) var<storage, read> weigth: array<f32>;
@group(0) @binding(4) var<uniform> centerPoint: vec2<f32>;
@group(0) @binding(5) var<uniform> value: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&weigth) <= index) {
        return;
    }
    let sub = (originalVertices[index] - centerPoint) + (value) * (weigth[index]);
    output[index] = sub + centerPoint - baseData[index];
}`)
// resize.wgsl
shaders.set('./script/js/データマネージャー/GPU/boneAnimation/resize.wgsl',`struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

@group(0) @binding(0) var<storage, read_write> boneAnimation: array<Bone>;
@group(0) @binding(1) var<storage, read> originalBoneAnimation: array<Bone>;
@group(0) @binding(2) var<storage, read> boneMatrix: array<mat3x3<f32>>;
@group(0) @binding(3) var<storage, read> parents: array<u32>;
@group(0) @binding(4) var<storage, read> verticesIndexs: array<u32>;
@group(0) @binding(5) var<uniform> value: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&verticesIndexs) <= index) {
        return;
    }
    let boneIndex = verticesIndexs[index];
    boneAnimation[boneIndex].scale = originalBoneAnimation[boneIndex].scale * value - 1.0;
}`)
// rotate.wgsl
shaders.set('./script/js/データマネージャー/GPU/boneAnimation/rotate.wgsl',`struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

@group(0) @binding(0) var<storage, read_write> boneAnimation: array<Bone>;
@group(0) @binding(1) var<storage, read> originalBoneAnimation: array<Bone>;
@group(0) @binding(2) var<storage, read> boneMatrix: array<mat3x3<f32>>;
@group(0) @binding(3) var<storage, read> parents: array<u32>;
@group(0) @binding(4) var<storage, read> verticesIndexs: array<u32>;
@group(0) @binding(5) var<uniform> value: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&verticesIndexs) <= index) {
        return;
    }
    let boneIndex = verticesIndexs[index];
    boneAnimation[boneIndex].angle = originalBoneAnimation[boneIndex].angle - value.x;
}`)
// translate.wgsl
shaders.set('./script/js/データマネージャー/GPU/boneAnimation/translate.wgsl',`struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

@group(0) @binding(0) var<storage, read_write> boneAnimation: array<Bone>;
@group(0) @binding(1) var<storage, read> originalBoneAnimation: array<Bone>;
@group(0) @binding(2) var<storage, read> boneMatrix: array<mat3x3<f32>>;
@group(0) @binding(3) var<storage, read> parents: array<u32>;
@group(0) @binding(4) var<storage, read> verticesIndexs: array<u32>;
@group(0) @binding(5) var<uniform> value: vec2<f32>;

fn inverseMat3x3(matrix: mat3x3<f32>) -> mat3x3<f32> {
    var inv: mat3x3<f32>;

    let a = matrix[0][0];
    let b = matrix[0][1];
    let c = matrix[0][2];
    let d = matrix[1][0];
    let e = matrix[1][1];
    let f = matrix[1][2];
    let g = matrix[2][0];
    let h = matrix[2][1];
    let i = matrix[2][2];

    let det = a * (e * i - f * h) -
              b * (d * i - f * g) +
              c * (d * h - e * g);

    if (det == 0.0) {
        // 行列が逆行列を持たない場合
        return mat3x3<f32>(0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0);
    }

    let invDet = 1.0 / det;

    inv[0][0] = (e * i - f * h) * invDet;
    inv[0][1] = (c * h - b * i) * invDet;
    inv[0][2] = (b * f - c * e) * invDet;
    inv[1][0] = (f * g - d * i) * invDet;
    inv[1][1] = (a * i - c * g) * invDet;
    inv[1][2] = (c * d - a * f) * invDet;
    inv[2][0] = 0.0;
    inv[2][1] = 0.0;
    inv[2][2] = 1.0;

    return inv;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&verticesIndexs) <= index) {
        return;
    }
    let boneIndex = verticesIndexs[index];
    let parentIndex = parents[boneIndex];
    if (boneIndex == parentIndex) {
        boneAnimation[boneIndex].position = value + originalBoneAnimation[boneIndex].position;
    } else {
        let parentMatrix = inverseMat3x3(boneMatrix[parentIndex]);
        boneAnimation[boneIndex].position = (parentMatrix * vec3f(value,1.0)).xy + originalBoneAnimation[boneIndex].position;
    }
}`)
// compute.wgsl
shaders.set('./script/js/オブジェクト/アタッチメント/followBone/compute.wgsl',`@group(0) @binding(0) var<storage, read_write> targetBoneMatrix: array<mat3x3<f32>>;
@group(0) @binding(1) var<storage, read> sourceBoneMatrix: array<mat3x3<f32>>;
@group(0) @binding(2) var<storage, read> sourceBaseBoneMatrix: array<mat3x3<f32>>;
@group(0) @binding(3) var<uniform> indexs: vec2<u32>;

fn inverseMat3x3(matrix: mat3x3<f32>) -> mat3x3<f32> {
    var inv: mat3x3<f32>;

    let a = matrix[0][0];
    let b = matrix[0][1];
    let c = matrix[0][2];
    let d = matrix[1][0];
    let e = matrix[1][1];
    let f = matrix[1][2];
    let g = matrix[2][0];
    let h = matrix[2][1];
    let i = matrix[2][2];

    let det = a * (e * i - f * h) -
              b * (d * i - f * g) +
              c * (d * h - e * g);

    if (det == 0.0) {
        // 行列が逆行列を持たない場合
        return mat3x3<f32>(0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0);
    }

    let invDet = 1.0 / det;

    inv[0][0] = (e * i - f * h) * invDet;
    inv[0][1] = (c * h - b * i) * invDet;
    inv[0][2] = (b * f - c * e) * invDet;
    inv[1][0] = (f * g - d * i) * invDet;
    inv[1][1] = (a * i - c * g) * invDet;
    inv[1][2] = (c * d - a * f) * invDet;
    inv[2][0] = (d * h - e * g) * invDet;
    inv[2][1] = (b * g - a * h) * invDet;
    inv[2][2] = (a * e - b * d) * invDet;

    return inv;
}

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    targetBoneMatrix[indexs.x] = sourceBoneMatrix[indexs.y] * inverseMat3x3(sourceBaseBoneMatrix[indexs.y]) * targetBoneMatrix[indexs.x];
}`)
// baseStructes.wgsl
shaders.set('./script/wgsl/baseStructes.wgsl',`struct Animaition {
    position: vec2<f32>
}

struct Test {
    animaition: vec2<f32>
}`)
// v_限られた頂点を四角として表示.wgsl
shaders.set('./script/wgsl/レンダー/v_限られた頂点を四角として表示.wgsl',`struct Camera {
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
}`)
// v_BBox.wgsl
shaders.set('./script/wgsl/レンダー/v_BBox.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> boxPoint: vec4<f32>;

const size = 5.0;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
    @location(1) wk: f32,
    @location(2) hk: f32,
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
    var point: vec2<f32>;
    if (vertexIndex % 4u == 0u) {
        point = boxPoint.xy;
    } else  if (vertexIndex % 4u == 1u) {
        point = boxPoint.xw;
    } else  if (vertexIndex % 4u == 2u) {
        point = boxPoint.zy;
    } else {
        point = boxPoint.zw;
    }

    var output: VertexOutput;
    output.position = vec4f((point - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = pointData[vertexIndex % 4u].zw;
    output.wk = size / (boxPoint.z - boxPoint.x) / camera.zoom;
    output.hk = size / (boxPoint.w - boxPoint.y) / camera.zoom;
    return output;
}`)
// f_枠線.wgsl
shaders.set('./script/wgsl/レンダー/f_枠線.wgsl',`@group(2) @binding(0) var<uniform> color: vec4<f32>; // 距離を計算する座標
// @group(2) @binding(0) var<uniform> boxPoint: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
    @location(0) uv: vec2<f32>,
    @location(1) wk: f32,
    @location(2) hk: f32,
) -> FragmentOutput {
    var output: FragmentOutput;
    if (uv.x > wk && uv.x < 1.0 - wk && uv.y > hk && uv.y < 1.0 - hk) {
        discard ;
    }
    output.color = color;
    return output;
}`)
// v_全ての頂点を四角として表示.wgsl
shaders.set('./script/wgsl/レンダー/v_全ての頂点を四角として表示.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(2) @binding(0) var<uniform> size: f32;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
    @location(1) color: vec4<f32>,
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
    output.position = vec4f((verticesPosition[instanceIndex] + point.xy * size - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = point.zw;
    return output;
}`)
// v_線分.wgsl
shaders.set('./script/wgsl/レンダー/v_線分.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(2) @binding(0) var<uniform> size: f32;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
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
    // let index = instanceIndex * 2u;
    let index = instanceIndex;
    let position1 = verticesPosition[index];
    let position2 = verticesPosition[index + 1u];
    // let point = pointData[vertexIndex % 4u];
    let sub = position2 - position1;
    let thickness = 0.005; // 線の太さ
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);

    if (vertexIndex % 4u == 0u) {
        offset = position1 - (normal * thickness) / camera.zoom;
    } else if (vertexIndex % 4u == 1u) {
        offset = position1 + (normal * thickness) / camera.zoom;
    } else if (vertexIndex % 4u == 2u) {
        offset = position2 - (normal * thickness) / camera.zoom;
    } else {
        offset = position2 + (normal * thickness) / camera.zoom;
    }

    var output: VertexOutput;
    output.position = vec4f((offset - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    return output;
}`)
// v_グラフィックメッシュごとのレンダリング.wgsl
shaders.set('./script/wgsl/レンダー/v_グラフィックメッシュごとのレンダリング.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesUV: array<vec2<f32>>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

// バーテックスシェーダー
@vertex
fn main(
    // @builtin(vertex_index) vertexIndex: u32
    @location(0) index: u32,
    ) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f((verticesPosition[index]) * cvsAspect, 0, 1.0);
    output.uv = verticesUV[index];
    return output;
}`)
// f_単色塗りつぶし.wgsl
shaders.set('./script/wgsl/レンダー/f_単色塗りつぶし.wgsl',`@group(2) @binding(0) var<uniform> color: vec4<f32>; // 距離を計算する座標

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = color;
    return output;
}`)
// v_render.wgsl
shaders.set('./script/wgsl/レンダー/v_render.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesUV: array<vec2<f32>>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
    @location(1) uvForMask: vec2<f32>,
}

// バーテックスシェーダー
@vertex
fn main(
    // @builtin(vertex_index) vertexIndex: u32,
    @location(0) index: u32,
    ) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f((verticesPosition[index] - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = verticesUV[index];
    output.uvForMask = (output.position.xy * 0.5 + 0.5) * vec2<f32>(1.0, -1.0);
    return output;
}`)
// v_全ての頂点をスクーリン座標に四角として表示.wgsl
shaders.set('./script/wgsl/レンダー/v_全ての頂点をスクーリン座標に四角として表示.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(2) @binding(0) var<uniform> size: f32;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
    @location(1) color: vec4<f32>,
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
    output.position = vec4f((verticesPosition[instanceIndex] + point.xy * size / camera.zoom - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = point.zw;
    return output;
}`)
// f_テクスチャ表示.wgsl
shaders.set('./script/wgsl/レンダー/f_テクスチャ表示.wgsl',`@group(0) @binding(2) var mySampler: sampler;
@group(2) @binding(1) var myTexture: texture_2d<f32>;
@group(3) @binding(0) var<uniform> color: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = select(color, vec4<f32>(0.0), textureSample(myTexture, mySampler, uv).a < 0.5);
    return output;
}`)
// v_座標・回転・スケールを四角として表示.wgsl
shaders.set('./script/wgsl/レンダー/v_座標・回転・スケールを四角として表示.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct Data {
    position: vec2<f32>,
    scale: f32,
    angle: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<uniform> data: Data;
@group(2) @binding(0) var<uniform> textureSize: vec2<f32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

const pointData = array<vec4<f32>, 4>(
    // vec4<f32>(-1.0, -1.0, 0.0, 1.0), // 左下
    // vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    // vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    // vec4<f32>( 1.0,  1.0, 1.0, 0.0), // 右上
    vec4<f32>(-1.0, 0.0, 0.0, 1.0), // 左下
    vec4<f32>(-1.0,  2.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0, 0.0, 1.0, 1.0), // 右下
    vec4<f32>( 1.0,  2.0, 1.0, 0.0), // 右上
);

fn rotate2D(point: vec2<f32>, angle: f32) -> vec2<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);

    let xPrime = point.x * cosTheta - point.y * sinTheta;
    let yPrime = point.x * sinTheta + point.y * cosTheta;

    return vec2<f32>(xPrime, yPrime);
}

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let point = pointData[vertexIndex % 4u];

    var output: VertexOutput;
    output.position = vec4f((data.position + rotate2D(point.xy * textureSize * data.scale, data.angle) - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = point.zw;
    return output;
}`)
// f_円塗りつぶし.wgsl
shaders.set('./script/wgsl/レンダー/f_円塗りつぶし.wgsl',`@group(2) @binding(1) var<uniform> color: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    // if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    if (pow(uv.x * 2.0 - 1.0, 2.0) + pow(uv.y * 2.0 - 1.0, 2.0) > 1.0) {
        discard ;
    }
    // output.color = vec4f(1,0,0,1);
    output.color = color;
    return output;
}`)
// f_render.wgsl
shaders.set('./script/wgsl/レンダー/f_render.wgsl',`@group(0) @binding(2) var mySampler: sampler;
@group(1) @binding(2) var myTexture: texture_2d<f32>;
@group(1) @binding(3) var maskTexture: texture_2d<f32>;
@group(1) @binding(4) var<uniform> maskType: f32;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
    @location(0) uv: vec2<f32>,
    @location(1) uvForMask: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        discard ;
    }
    let value = textureSample(maskTexture, mySampler, uvForMask).r;
    let maskValue = select(1.0 - value, value, maskType == 0.0);
    // output.color = textureSample(myTexture, mySampler, uv).bgra * maskValue;
    output.color = textureSample(myTexture, mySampler, uv) * maskValue;
    // output.color = vec4<f32>(maskValue, 0.0, 0.0, 1.0);
    return output;
}`)
// v_ボーンの表示.wgsl
shaders.set('./script/wgsl/レンダー/ボーン/v_ボーンの表示.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;
// @group(2) @binding(0) var<uniform> size: f32;
const size = 0.05;
const ratio = 0.1;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let index = instanceIndex;
    let position1 = verticesPosition[index].h;
    let position2 = verticesPosition[index].t;
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    let sectionPosition = mix(position1, position2, ratio);

    let vIndex = vertexIndex % 6u;

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
    output.uv = offset;
    return output;
}`)
// v_特定のボーンの表示.wgsl
shaders.set('./script/wgsl/レンダー/ボーン/v_特定のボーンの表示.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;
@group(3) @binding(0) var<storage, read> indexs: array<u32>;
const size = 0.05;
const ratio = 0.1;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let index = indexs[instanceIndex];
    let position1 = verticesPosition[index].h;
    let position2 = verticesPosition[index].t;
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    let sectionPosition = mix(position1, position2, ratio);

    let vIndex = vertexIndex % 6u;

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
    output.uv = offset;
    return output;
}`)
// v_ボーン頂点の表示.wgsl
shaders.set('./script/wgsl/レンダー/ボーン/v_ボーン頂点の表示.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;
const size = 0.05;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

const pointData = array<vec4<f32>, 12>(
    // 1つ目の四角形 (hを基準)
    vec4<f32>(-1.0, -1.0, 0.0, 1.0), // 左下
    vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0,  1.0, 1.0, 0.0), // 右上

    // 2つ目の四角形 (tを基準)
    vec4<f32>(-1.0, -1.0, 0.0, 1.0),
    vec4<f32>(-1.0,  1.0, 0.0, 0.0),
    vec4<f32>( 1.0, -1.0, 1.0, 1.0),
    vec4<f32>( 1.0, -1.0, 1.0, 1.0),
    vec4<f32>(-1.0,  1.0, 0.0, 0.0),
    vec4<f32>( 1.0,  1.0, 1.0, 0.0)
);

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32,
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    let point = pointData[vertexIndex % 12u];  // 12頂点の中から選択
    let bone = verticesPosition[instanceIndex];
    let p = select(bone.h, bone.t, (vertexIndex % 12) / 6 == 1);
    var output: VertexOutput;
    output.position = worldPosToClipPos(p + point.xy * size * distance(bone.h, bone.t));
    output.uv = point.zw;
    return output;
}

@group(2) @binding(0) var<uniform> color: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const sectionLength = 2.0;

@fragment
fn fmain(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    let dist = pow(uv.x * 2.0 - 1.0, 2.0) + pow(uv.y * 2.0 - 1.0, 2.0);
    if (dist > 1.0) {
        discard ;
    }
    output.color = select(color, vec4<f32>(0,0,0,1), dist < 0.7 * 0.7);
    return output;
}`)
// v_三角.wgsl
shaders.set('./script/wgsl/レンダー/ボーン/関係/v_三角.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;
@group(1) @binding(1) var<storage, read> relationships: array<u32>;

const size = 5;

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
    let index = instanceIndex;
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

// @group(2) @binding(0) var<uniform> color: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn fmain(
    @location(0) y: f32,
) -> FragmentOutput {
    var output: FragmentOutput;
    let boolV = floor(y / 5) % 2 == 1;
    output.color = vec4<f32>(1,0,0,select(0.0,1.0,boolV));
    // output.color = vec4<f32>(1,0,0,1);
    return output;
}`)
// 点線.wgsl
shaders.set('./script/wgsl/レンダー/ボーン/関係/点線.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;
@group(1) @binding(1) var<storage, read> relationships: array<u32>;

const size = 5;

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
    let index = instanceIndex;
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

// @group(2) @binding(0) var<uniform> color: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const sectionLength = 2.0;

@fragment
fn fmain(
    @location(0) y: f32,
) -> FragmentOutput {
    var output: FragmentOutput;
    let boolV = floor(y / sectionLength) % 2 == 1;
    output.color = vec4<f32>(1,0,0,select(0.0,1.0,boolV));
    // output.color = vec4<f32>(1,0,0,1);
    return output;
}`)
// v_枠の表示.wgsl
shaders.set('./script/wgsl/レンダー/モディファイア/v_枠の表示.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<uniform> modifierFineness: vec2<u32>; // モディファイアの分割数

const size = 5.0;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
}

const pointData = array<vec4<f32>, 4>(
    vec4<f32>(-1.0, -1.0, 0.0, 1.0), // 左下
    vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>( 1.0,  1.0, 1.0, 0.0), // 右上
);

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let mySection = instanceIndex / modifierFineness.x;

    var position1 = vec2<f32>(0.0);
    var position2 = vec2<f32>(0.0);
    // instanceIndexが横幅の２以上ある時はyの描画をする
    if (mySection >= 2u) {
        let index = instanceIndex - modifierFineness.x * 2u;
        let height = index % (modifierFineness.y) * modifierFineness.x;

        let w = select(modifierFineness.x, 0, index < modifierFineness.y);

        let k = height / modifierFineness.x;
        position1 = verticesPosition[height + k + w];
        position2 = verticesPosition[height + modifierFineness.x + k + 1 + w];
    } else {
        let height = modifierFineness.y * modifierFineness.x;
        let k = height / modifierFineness.x;
        let myIndex = instanceIndex % modifierFineness.x + select(height + k, 0, mySection < 1u);

        position1 = verticesPosition[myIndex];
        position2 = verticesPosition[myIndex + 1u];
    }

    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    let k = (normal * size) / camera.zoom;
    if (vertexIndex % 4u == 0u) {
        offset = position1 - k;
    } else if (vertexIndex % 4u == 1u) {
        offset = position1 + k;
    } else if (vertexIndex % 4u == 2u) {
        offset = position2 - k;
    } else {
        offset = position2 + k;
    }

    var output: VertexOutput;
    output.position = worldPosToClipPos(offset);
    return output;
}`)
// v_枠2の表示 .wgsl
shaders.set('./script/wgsl/レンダー/モディファイア/v_枠2の表示 .wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<uniform> modifierFineness: vec2<u32>; // モディファイアの分割数

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 4つかどのindexを求める
    let sectionX = instanceIndex % 2u;
    let sectionY = instanceIndex / 2u;
    let index = i32((sectionX * (modifierFineness.x)) + ((sectionY * modifierFineness.y) * modifierFineness.x));

    let xk = -(i32(sectionX) * 2 - 1);
    let yk = -(i32(sectionY) * 2 - 1);
    let height = select(0,i32(modifierFineness.y),sectionY == 1u);
    let top = index + height;
    let bottom = index + (i32(modifierFineness.x) * yk) + height + yk;
    // let indexs = vec4<i32>(top, top + xk, bottom, bottom + xk);
    let indexs = vec3<i32>(top, top + xk, bottom);

    var offset = vec2<f32>(0.0);
    if (vertexIndex % 3u == 0u) {
        offset = verticesPosition[indexs.x];
    } else if (vertexIndex % 3u == 1u) {
        offset = mix(verticesPosition[indexs.x], verticesPosition[indexs.y], 0.4);
    } else {
        offset = mix(verticesPosition[indexs.x], verticesPosition[indexs.z], 0.4);
    }

    var output: VertexOutput;
    output.position = worldPosToClipPos(offset);
    return output;
}`)
// v_メッシュ.wgsl
shaders.set('./script/wgsl/レンダー/モディファイア/v_メッシュ.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<uniform> modifierFineness: vec2<u32>; // モディファイアの分割数
// @group(2) @binding(0) var<uniform> size: f32;
const size = 2.0;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    // let index = instanceIndex * 2u;
    let index = instanceIndex;
    let height = index / modifierFineness.x;
    let indexs = vec4<u32>(index + height, index + 1u + height, index + modifierFineness.x + 1u + height, index + modifierFineness.x + 2u + height);

    var position1 = vec2<f32>(0.0);
    var position2 = vec2<f32>(0.0);
    if (vertexIndex / 4u == 0u) {
        position1 = verticesPosition[indexs.x];
        position2 = verticesPosition[indexs.y];
    } else if (vertexIndex / 4u == 1u) {
        position1 = verticesPosition[indexs.y];
        position2 = verticesPosition[indexs.w];
    } else if (vertexIndex / 4u == 2u) {
        position1 = verticesPosition[indexs.w];
        position2 = verticesPosition[indexs.z];
    } else {
        position1 = verticesPosition[indexs.z];
        position2 = verticesPosition[indexs.x];
    }
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    if (vertexIndex % 4u == 0u) {
        offset = position1 - (normal * size) / camera.zoom;
    } else if (vertexIndex % 4u == 1u) {
        offset = position1 + (normal * size) / camera.zoom;
    } else if (vertexIndex % 4u == 2u) {
        offset = position2 - (normal * size) / camera.zoom;
    } else {
        offset = position2 + (normal * size) / camera.zoom;
    }

    var output: VertexOutput;
    output.position = worldPosToClipPos(offset);
    return output;
}`)
// v_ベジェ.wgsl
shaders.set('./script/wgsl/レンダー/ベジェモディファイア/v_ベジェ.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct Bezier {
    p: vec2<f32>,
    c1: vec2<f32>,
    c2: vec2<f32>,
}

struct LineConfig {
    width: f32,
    cze: f32, // カメラのズームに影響を受けるか
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<Bezier>;
const size = 10.0;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
}

const pointData = array<vec4<f32>, 4>(
    vec4<f32>(-1.0, -1.0, 0.0, 1.0), // 左下
    vec4<f32>(-1.0,  1.0, 0.0, 0.0), // 左上
    vec4<f32>( 1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>( 1.0,  1.0, 1.0, 0.0), // 右上
);

fn mathBezier(p1: vec2<f32>, c1: vec2<f32>, c2: vec2<f32>, p2: vec2<f32>, t: f32) -> vec2<f32> {
    let u = 1.0 - t;
    return p1 * pow(u, 3.0) + c1 * 3.0 * pow(u, 2.0) * t + c2 * 3.0 * u * pow(t, 2.0) + p2 * pow(t, 3.0);
}

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let index = instanceIndex;
    let point1 = verticesPosition[index];
    let point2 = verticesPosition[index + 1u];
    let deltaT = 1.0 / 50.0;
    let t = f32(vertexIndex / 2u) / 50.0;
    let position1 = mathBezier(point1.p, point1.c2, point2.c1, point2.p, t);
    let position2 = mathBezier(point1.p, point1.c2, point2.c1, point2.p, t + deltaT);
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);

    let v = (normal * size) / camera.zoom;
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
    return output;
}`)
// f_canvasDraw.wgsl
shaders.set('./script/wgsl/レンダー/テクスチャのcvs表示/f_canvasDraw.wgsl',`@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;

@fragment
fn main(
    @location(0) texCoord: vec2<f32>
) -> @location(0) vec4<f32> {
    // 4つの隣接ピクセルを取得
    let color = textureSample(inputTexture, mySampler, texCoord); // 色
    // let color = vec4<f32>(0.0,0.0,0.0,1.0); // 色
    return color;
}`)
// v_canvasDraw.wgsl
shaders.set('./script/wgsl/レンダー/テクスチャのcvs表示/v_canvasDraw.wgsl',`struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) texCoord: vec2<f32>,
};

const pointData = array<vec4<f32>, 4>(
    vec4<f32>(-1.0, -1.0, 0.0, 1.0), // 左下
    vec4<f32>(-1.0, 1.0, 0.0, 0.0), // 左上
    vec4<f32>(1.0, -1.0, 1.0, 1.0), // 右下
    vec4<f32>(1.0, 1.0, 1.0, 0.0), // 右上
);

@vertex
fn main(
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    var output: VertexOutput;
    let point = pointData[vertexIndex];
    output.position = vec4<f32>(point.xy, 0.0, 1.0);
    output.texCoord = point.zw;
    return output;
}`)
// f.wgsl
shaders.set('./script/wgsl/レンダー/ウェイトのレンダリング/f.wgsl',`struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
    @location(0) color: vec4<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = color;
    return output;
}`)
// v.wgsl
shaders.set('./script/wgsl/レンダー/ウェイトのレンダリング/v.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct AnimationData {
    index: vec4<u32>,
    weight: vec4<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesIndexAndWeight: array<AnimationData>;
@group(2) @binding(0) var<storage, read> targetIndex: u32;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) color: vec4<f32>,
}

// バーテックスシェーダー
@vertex
fn main(
    // @builtin(vertex_index) vertexIndex: u32
    @location(0) index: u32,
    ) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f((verticesPosition[index] - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    let data = verticesIndexAndWeight[index];
    let indexs = data.index;
    let weights = data.weight;
    var weight = 0.0;
    for (var i = 0u; i < 4u; i ++) {
        if (indexs[i] == targetIndex) {
            weight = weights[i];
            break ;
        }
    }
    output.color = vec4<f32>(weight, weight, weight, 1.0);
    return output;
}`)
// f_グリッド.wgsl
shaders.set('./script/wgsl/レンダー/グリッド/f_グリッド.wgsl',`struct FragmentOutput {
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
}`)
// v_グリッド.wgsl
shaders.set('./script/wgsl/レンダー/グリッド/v_グリッド.wgsl',`@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

const pointData = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0), // 左下
    vec2<f32>(-1.0, 1.0), // 左上
    vec2<f32>(1.0, -1.0), // 右下
    vec2<f32>(1.0, 1.0), // 右上
);

@vertex
fn main(
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    var output: VertexOutput;
    let point = pointData[vertexIndex];
    output.position = vec4<f32>(point.xy, 0.0, 1.0);
    output.uv = point.xy * (1 / cvsAspect) / camera.zoom + camera.position;
    return output;
}`)
// v_表示.wgsl
shaders.set('./script/wgsl/レンダー/回転モディファイア/v_表示.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct Data {
    position: vec2<f32>,
    scale: f32,
    angle: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<uniform> data: Data;

const size = 5.0;
const length = 50.0;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}


const pointData = array<vec4<f32>, 3>(
    vec4<f32>(-size, 0.0, 0.0, 1.0), // 左下
    vec4<f32>(0.0, length, 0.0, 0.0), // 左上
    vec4<f32>(size, 0.0, 1.0, 1.0), // 右下
);

fn rotate2D(point: vec2<f32>, angle: f32) -> vec2<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);

    let xPrime = point.x * cosTheta - point.y * sinTheta;
    let yPrime = point.x * sinTheta + point.y * cosTheta;

    return vec2<f32>(xPrime, yPrime);
}

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let point = pointData[vertexIndex % 4u];

    var output: VertexOutput;
    output.position = vec4f((data.position + rotate2D(point.xy * data.scale, data.angle) - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    // output.position = vec4f(point.xy / 2, 0, 1.0);
    output.uv = point.zw;
    return output;
}`)
// v_メッシュ.wgsl
shaders.set('./script/wgsl/レンダー/グラフィックメッシュ/v_メッシュ.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct Meshu {
    i1: u32,
    i2: u32,
    i3: u32,
    padding: u32,
}

struct LineConfig {
    width: f32,
    cze: f32, // カメラのズームに影響を受けるか
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> mesh: array<Meshu>; // メッシュを構成する頂点インデックス
// @group(2) @binding(0) var<uniform> lineConfig: LineConfig;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
}

const size = 2.0;

// バーテックスシェーダー
@vertex
fn main(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    // let index = instanceIndex * 2u;
    let index = instanceIndex;
    let indexs = mesh[index];

    var position1 = vec2<f32>(0.0);
    var position2 = vec2<f32>(0.0);
    if (vertexIndex / 4u == 0u) {
        position1 = verticesPosition[indexs.i1];
        position2 = verticesPosition[indexs.i2];
    } else if (vertexIndex / 4u == 1u) {
        position1 = verticesPosition[indexs.i2];
        position2 = verticesPosition[indexs.i3];
    } else {
        position1 = verticesPosition[indexs.i3];
        position2 = verticesPosition[indexs.i1];
    }
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
    return output;
}`)
// 特定の辺の表示.wgsl
shaders.set('./script/wgsl/レンダー/グラフィックメッシュ/特定の辺の表示.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> edges: array<vec2<u32>>;

const size = 5;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
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
    let edge = edges[instanceIndex];
    let position1 = verticesPosition[edge.x];
    let position2 = verticesPosition[edge.y];

    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    let k = (normal * size) / camera.zoom;
    var output: VertexOutput;
    if (vertexIndex % 4u == 0u) {
        offset = position1 - k;
    } else if (vertexIndex % 4u == 1u) {
        offset = position1 + k;
    } else if (vertexIndex % 4u == 2u) {
        offset = position2 - k;
    } else {
        offset = position2 + k;
    }
    output.position = worldPosToClipPos(offset);
    return output;
}

@group(2) @binding(0) var<uniform> color: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

const sectionLength = 2.0;

@fragment
fn fmain(
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = color;
    return output;
}`)
// f.wgsl
shaders.set('./script/wgsl/レンダー/円枠線/f.wgsl',`@group(2) @binding(1) var<uniform> color: vec4<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    if (pow(uv.x * 2.0 - 1.0, 2.0) + pow(uv.y * 2.0 - 1.0, 2.0) > 1.0) {
        discard ;
    }
    // output.color = vec4f(1,0,0,1);
    output.color = color;
    return output;
}`)
// f.wgsl
shaders.set('./script/wgsl/レンダー/マスク/f.wgsl',`@group(0) @binding(2) var mySampler: sampler;
@group(1) @binding(2) var myTexture: texture_2d<f32>;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
    @location(0) uv: vec2<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        discard ;
    }

    let alpha = textureSample(myTexture, mySampler, uv).a;
    output.color = vec4<f32>(1.0,0.0,0.0,alpha);
    return output;
}`)
// v.wgsl
shaders.set('./script/wgsl/レンダー/マスク/v.wgsl',`struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesUV: array<vec2<f32>>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

// バーテックスシェーダー
@vertex
fn main(
    // @builtin(vertex_index) vertexIndex: u32
    @location(0) index: u32,
    ) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f((verticesPosition[index] - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    output.uv = verticesUV[index];
    return output;
}`)
// 限られた頂点からBBoxを計算.wgsl
shaders.set('./script/wgsl/compute/限られた頂点からBBoxを計算.wgsl',`@group(0) @binding(0) var<storage, read_write> minMaxBuffer: array<vec2<f32>, 2>;
@group(0) @binding(1) var<storage, read> indexs: array<u32>;
@group(1) @binding(0) var<storage, read> vertices: array<vec2<f32>>;
@group(2) @binding(0) var<storage, read_write> aaa: array<atomic<i32>, 4>;

// スカラー型で共有メモリを定義
var<workgroup> sharedMinX: atomic<i32>;
var<workgroup> sharedMinY: atomic<i32>;
var<workgroup> sharedMaxX: atomic<i32>;
var<workgroup> sharedMaxY: atomic<i32>;

const SCALE_FACTOR: f32 = 1e5;
const threadProcessNum = 20u;

// ユーティリティ関数
fn f32_to_i32(value: f32) -> i32 {
    return i32(value * SCALE_FACTOR);
}

fn i32_to_f32(value: i32) -> f32 {
    return f32(value) / SCALE_FACTOR;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
    let index = global_id.x * threadProcessNum;

    // 初期化フェーズ
    if (index == 0u) {
        atomicStore(&aaa[0], i32(1e10 * SCALE_FACTOR));
        atomicStore(&aaa[1], i32(1e10 * SCALE_FACTOR));
        atomicStore(&aaa[2], i32(-1e10 * SCALE_FACTOR));
        atomicStore(&aaa[3], i32(-1e10 * SCALE_FACTOR));
    }

    if (local_id.x == 0u) {
        atomicStore(&sharedMinX, i32(1e10 * SCALE_FACTOR));
        atomicStore(&sharedMinY, i32(1e10 * SCALE_FACTOR));
        atomicStore(&sharedMaxX, i32(-1e10 * SCALE_FACTOR));
        atomicStore(&sharedMaxY, i32(-1e10 * SCALE_FACTOR));
    }

    // 頂点配列の長さを取得
    let vertexCount = arrayLength(&indexs);

    workgroupBarrier();

    // アトミック操作
    if (index < vertexCount) {
        // 範囲外スレッドの値を安全に無効化
        var minValue = vec2<f32>(99999999.0);
        var maxValue = vec2<f32>(-99999999.0);
        for (var i = 0u; i < threadProcessNum; i ++) {
            if (index + i < vertexCount) {
                let position = vertices[indexs[index + i]];
                minValue = min(minValue, position);
                maxValue = max(maxValue, position);
            }
        }
        // スケーリングして整数に変換
        let localMinX = f32_to_i32(minValue.x);
        let localMinY = f32_to_i32(minValue.y);
        let localMaxX = f32_to_i32(maxValue.x);
        let localMaxY = f32_to_i32(maxValue.y);
        // 範囲外スレッドの値を安全に無効化
        atomicMin(&sharedMinX, localMinX);
        atomicMin(&sharedMinY, localMinY);
        atomicMax(&sharedMaxX, localMaxX);
        atomicMax(&sharedMaxY, localMaxY);
    }

    workgroupBarrier();

    // ストレージバッファへの書き込みを安全に実行
    if (local_id.x == 0u) {
        let finalMinX = atomicLoad(&sharedMinX);
        let finalMinY = atomicLoad(&sharedMinY);
        let finalMaxX = atomicLoad(&sharedMaxX);
        let finalMaxY = atomicLoad(&sharedMaxY);

        atomicMin(&aaa[0], finalMinX);
        atomicMin(&aaa[1], finalMinY);
        atomicMax(&aaa[2], finalMaxX);
        atomicMax(&aaa[3], finalMaxY);
    }

    workgroupBarrier();

    if (index == 0u) {
        // 安全にストレージバッファに書き込み
        minMaxBuffer[0] = vec2<f32>(i32_to_f32(atomicLoad(&aaa[0])), i32_to_f32(atomicLoad(&aaa[1])));
        minMaxBuffer[1] = vec2<f32>(i32_to_f32(atomicLoad(&aaa[2])), i32_to_f32(atomicLoad(&aaa[3])));
    }
}`)
// 全ての頂点の平均.wgsl
shaders.set('./script/wgsl/compute/全ての頂点の平均.wgsl',`@group(0) @binding(0) var<storage, read_write> output: vec2<f32>;
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>;
@group(1) @binding(0) var<storage, read_write> aaa: array<atomic<i32>, 2>;

// スカラー型で共有メモリを定義
var<workgroup> sumX: atomic<i32>;
var<workgroup> sumY: atomic<i32>;

const SCALE_FACTOR: f32 = 1e5;
const threadProcessNum = 20u;

// ユーティリティ関数
fn f32_to_i32(value: f32) -> i32 {
    return i32(value * SCALE_FACTOR);
}

fn i32_to_f32(value: i32) -> f32 {
    return f32(value) / SCALE_FACTOR;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
    let index = global_id.x * threadProcessNum;

    // 初期化フェーズ
    if (index == 0u) {
        atomicStore(&aaa[0], 0);
        atomicStore(&aaa[1], 0);
    }

    if (local_id.x == 0u) {
        atomicStore(&sumX, 0);
        atomicStore(&sumY, 0);
    }

    // 頂点配列の長さを取得
    let vertexCount = arrayLength(&vertices);

    workgroupBarrier();

    // アトミック操作
    if (index < vertexCount) {
        var sum = vec2<f32>(0.0);
        for (var i = 0u; i < threadProcessNum; i ++) {
            // 範囲外スレッドの値を安全に無効化
            if (index + i < vertexCount) {
                let position = vertices[index + i];
                sum += position;
            }
        }
        atomicAdd(&sumX, f32_to_i32(sum.x));
        atomicAdd(&sumY, f32_to_i32(sum.y));
    }

    workgroupBarrier();

    // 全てのスレッドで統合
    if (local_id.x == 0u) {
        atomicAdd(&aaa[0], atomicLoad(&sumX));
        atomicAdd(&aaa[1], atomicLoad(&sumY));
    }

    workgroupBarrier();

    // 結果を一つのスレッドが書き込み
    if (index == 0u) {
        // 安全にストレージバッファに書き込み
        output = vec2<f32>(i32_to_f32(atomicLoad(&aaa[0])), i32_to_f32(atomicLoad(&aaa[1]))) / f32(vertexCount);
    }
}`)
// 回転モディファイアのアニメーション.wgsl
shaders.set('./script/wgsl/compute/回転モディファイアのアニメーション.wgsl',`struct Rotate {
    position: vec2<f32>,
    scale: f32,
    angle: f32,
}

@group(0) @binding(0) var<storage, read_write> outputData: Rotate; // 出力
@group(0) @binding(1) var<uniform> rotateData: Rotate; // 移動回転スケールデータ

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    outputData += rotateData;
}`)
// MarchingSquares.wgsl
shaders.set('./script/wgsl/compute/MarchingSquares.wgsl',`fn binary4ToU32Direct(b0: u32, b1: u32, b2: u32, b3: u32) -> u32 {
    return (b0 << 3u) | (b1 << 2u) | (b2 << 1u) | b3;
}

@group(0) @binding(0) var<storage, read_write> outputData: array<u32>; // 出力
@group(0) @binding(1) var inputTexture: texture_2d<f32>;

fn sampleValue(samplePoint: vec2<i32>, dimensions: vec2<i32>) -> u32 {
    if (samplePoint.x >= dimensions.x || samplePoint.x < 0 ||
        samplePoint.y >= dimensions.y || samplePoint.y < 0) {
        return 0u;
    }
    return select(0u,1u,textureLoad(inputTexture, samplePoint, 0).a != 0.0);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let samplePoint = vec2i(id.xy) + vec2i(-1,-1);
    let dimensions = vec2i(textureDimensions(inputTexture).xy);
    if (dimensions.x <= samplePoint.x || dimensions.y <= samplePoint.y) {
        return ;
    }
    var b0 = sampleValue(samplePoint + vec2<i32>(0, 1), dimensions);
    var b1 = sampleValue(samplePoint + vec2<i32>(1, 1), dimensions);
    var b2 = sampleValue(samplePoint + vec2<i32>(1, 0), dimensions);
    var b3 = sampleValue(samplePoint + vec2<i32>(0, 0), dimensions);

    outputData[id.x + id.y * u32(dimensions.x + 1)] = binary4ToU32Direct(b0,b1,b2,b3);
}`)
// 中心位置を変更.wgsl
shaders.set('./script/wgsl/compute/中心位置を変更.wgsl',`@group(0) @binding(0) var<storage, read_write> outputData: array<vec2<f32>>; // 出力
@group(0) @binding(1) var<storage, read> bbox: array<vec2<f32>, 2>; // 頂点インデックスのデータ
@group(1) @binding(0) var<uniform> center: vec2<f32>; // 頂点インデックスのデータ

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let threadIndex = global_id.x;
    if (arrayLength(&outputData) <= threadIndex) {
        return;
    }

    let sub = outputData[threadIndex] - (bbox[0] + bbox[1]) / 2.0;
    outputData[threadIndex] = sub + center;
}`)
// 全ての頂点にアニメーションを適応.wgsl
shaders.set('./script/wgsl/compute/全ての頂点にアニメーションを適応.wgsl',`@group(0) @binding(0) var<storage, read_write> outputData: array<vec2<f32>>; // 出力
@group(1) @binding(0) var<storage, read> animationDatas: array<vec2<f32>>; // シェイプキーのデータ
@group(1) @binding(1) var<uniform> animationWeight: f32; // シェイプキーの重み

fn isNaN(x: f32) -> bool {
    return x != x;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pointIndex = global_id.x;
    if (arrayLength(&outputData) <= pointIndex) {
        return;
    }

    if (!isNaN(animationDatas[pointIndex].x) && !isNaN(animationDatas[pointIndex].y)) {
        outputData[pointIndex] += animationDatas[pointIndex] * animationWeight;
    }
}`)
// 頂点の円選択.wgsl
shaders.set('./script/wgsl/compute/頂点の円選択.wgsl',`@group(0) @binding(0) var<storage, read_write> outputData: array<f32>; // 出力
@group(0) @binding(1) var<uniform> point: vec2<f32>; // 距離を計算する座標
@group(1) @binding(0) var<storage, read> vertices: array<vec2<f32>>; // 頂点座標

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pointIndex = global_id.x;
    if (arrayLength(&vertices) <= pointIndex) {
        return;
    }

    outputData[pointIndex] = distance(vertices[pointIndex], point);
}`)
// 限られた頂点にアニメーションを適応.wgsl
shaders.set('./script/wgsl/compute/限られた頂点にアニメーションを適応.wgsl',`struct Animation {
    index: u32,
    padding: f32,
    movement: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<vec2<f32>>; // 出力
@group(1) @binding(0) var<storage, read> animationDatas: array<Animation>; // シェイプキーのデータ
@group(1) @binding(1) var<uniform> animationWeight: f32; // シェイプキーの重み

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pointIndex = global_id.x;
    if (arrayLength(&animationDatas) <= pointIndex) {
        return;
    }

    let animationData = animationDatas[pointIndex];

    outputData[animationData.index] += animationData.movement * animationWeight;
}`)
// 全ての頂点からBBoxを計算.wgsl
shaders.set('./script/wgsl/compute/全ての頂点からBBoxを計算.wgsl',`@group(0) @binding(0) var<storage, read_write> minMaxBuffer: array<vec2<f32>, 2>;
@group(0) @binding(1) var<storage, read> vertices: array<vec2<f32>>;
@group(1) @binding(0) var<storage, read_write> aaa: array<atomic<i32>, 4>;

// スカラー型で共有メモリを定義
var<workgroup> sharedMinX: atomic<i32>;
var<workgroup> sharedMinY: atomic<i32>;
var<workgroup> sharedMaxX: atomic<i32>;
var<workgroup> sharedMaxY: atomic<i32>;

const SCALE_FACTOR: f32 = 1e5;
const threadProcessNum = 20u;

// ユーティリティ関数
fn f32_to_i32(value: f32) -> i32 {
    return i32(value * SCALE_FACTOR);
}

fn i32_to_f32(value: i32) -> f32 {
    return f32(value) / SCALE_FACTOR;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
    let index = global_id.x * threadProcessNum;

    // 初期化フェーズ
    if (index == 0u) {
        atomicStore(&aaa[0], i32(1e10 * SCALE_FACTOR));
        atomicStore(&aaa[1], i32(1e10 * SCALE_FACTOR));
        atomicStore(&aaa[2], i32(-1e10 * SCALE_FACTOR));
        atomicStore(&aaa[3], i32(-1e10 * SCALE_FACTOR));
    }

    if (local_id.x == 0u) {
        atomicStore(&sharedMinX, i32(1e10 * SCALE_FACTOR));
        atomicStore(&sharedMinY, i32(1e10 * SCALE_FACTOR));
        atomicStore(&sharedMaxX, i32(-1e10 * SCALE_FACTOR));
        atomicStore(&sharedMaxY, i32(-1e10 * SCALE_FACTOR));
    }

    // 頂点配列の長さを取得
    let vertexCount = arrayLength(&vertices);

    workgroupBarrier();

    // アトミック操作
    if (index < vertexCount) {
        // 範囲外スレッドの値を安全に無効化
        var minValue = vec2<f32>(99999999.0);
        var maxValue = vec2<f32>(-99999999.0);
        for (var i = 0u; i < threadProcessNum; i ++) {
            if (index + i < vertexCount) {
                let position = vertices[index + i];
                minValue = min(minValue, position);
                maxValue = max(maxValue, position);
            }
        }
        // スケーリングして整数に変換
        let localMinX = f32_to_i32(minValue.x);
        let localMinY = f32_to_i32(minValue.y);
        let localMaxX = f32_to_i32(maxValue.x);
        let localMaxY = f32_to_i32(maxValue.y);
        // 範囲外スレッドの値を安全に無効化
        atomicMin(&sharedMinX, localMinX);
        atomicMin(&sharedMinY, localMinY);
        atomicMax(&sharedMaxX, localMaxX);
        atomicMax(&sharedMaxY, localMaxY);
    }

    workgroupBarrier();

    // ストレージバッファへの書き込みを安全に実行
    if (local_id.x == 0u) {
        let finalMinX = atomicLoad(&sharedMinX);
        let finalMinY = atomicLoad(&sharedMinY);
        let finalMaxX = atomicLoad(&sharedMaxX);
        let finalMaxY = atomicLoad(&sharedMaxY);

        atomicMin(&aaa[0], finalMinX);
        atomicMin(&aaa[1], finalMinY);
        atomicMax(&aaa[2], finalMaxX);
        atomicMax(&aaa[3], finalMaxY);
    }

    workgroupBarrier();

    if (index == 0u) {
        // 安全にストレージバッファに書き込み
        minMaxBuffer[0] = vec2<f32>(i32_to_f32(atomicLoad(&aaa[0])), i32_to_f32(atomicLoad(&aaa[1])));
        minMaxBuffer[1] = vec2<f32>(i32_to_f32(atomicLoad(&aaa[2])), i32_to_f32(atomicLoad(&aaa[3])));
    }
}`)
// 限られたボーンからBBoxを計算.wgsl
shaders.set('./script/wgsl/compute/限られたボーンからBBoxを計算.wgsl',`struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> minMaxBuffer: array<vec2<f32>, 2>;
@group(0) @binding(1) var<storage, read> indexs: array<u32>;
@group(1) @binding(0) var<storage, read> vertices: array<BoneVertices>;
@group(2) @binding(0) var<storage, read_write> aaa: array<atomic<i32>, 4>;

// スカラー型で共有メモリを定義
var<workgroup> sharedMinX: atomic<i32>;
var<workgroup> sharedMinY: atomic<i32>;
var<workgroup> sharedMaxX: atomic<i32>;
var<workgroup> sharedMaxY: atomic<i32>;

const SCALE_FACTOR: f32 = 1e5;
const threadProcessNum = 20u;

// ユーティリティ関数
fn f32_to_i32(value: f32) -> i32 {
    return i32(value * SCALE_FACTOR);
}

fn i32_to_f32(value: i32) -> f32 {
    return f32(value) / SCALE_FACTOR;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
    let index = global_id.x * threadProcessNum;

    // 初期化フェーズ
    if (index == 0u) {
        atomicStore(&aaa[0], i32(1e10 * SCALE_FACTOR));
        atomicStore(&aaa[1], i32(1e10 * SCALE_FACTOR));
        atomicStore(&aaa[2], i32(-1e10 * SCALE_FACTOR));
        atomicStore(&aaa[3], i32(-1e10 * SCALE_FACTOR));
    }

    if (local_id.x == 0u) {
        atomicStore(&sharedMinX, i32(1e10 * SCALE_FACTOR));
        atomicStore(&sharedMinY, i32(1e10 * SCALE_FACTOR));
        atomicStore(&sharedMaxX, i32(-1e10 * SCALE_FACTOR));
        atomicStore(&sharedMaxY, i32(-1e10 * SCALE_FACTOR));
    }

    // 頂点配列の長さを取得
    let vertexCount = arrayLength(&indexs);

    workgroupBarrier();

    // アトミック操作
    if (index < vertexCount) {
        // 範囲外スレッドの値を安全に無効化
        var minValue = vec2<f32>(99999999.0);
        var maxValue = vec2<f32>(-99999999.0);
        for (var i = 0u; i < threadProcessNum; i ++) {
            if (index + i < vertexCount) {
                let bone = vertices[indexs[index + i]];
                minValue = min(minValue, min(bone.h,bone.t));
                maxValue = max(maxValue, max(bone.h,bone.t));
            }
        }
        // スケーリングして整数に変換
        let localMinX = f32_to_i32(minValue.x);
        let localMinY = f32_to_i32(minValue.y);
        let localMaxX = f32_to_i32(maxValue.x);
        let localMaxY = f32_to_i32(maxValue.y);
        // 範囲外スレッドの値を安全に無効化
        atomicMin(&sharedMinX, localMinX);
        atomicMin(&sharedMinY, localMinY);
        atomicMax(&sharedMaxX, localMaxX);
        atomicMax(&sharedMaxY, localMaxY);
    }

    workgroupBarrier();

    // ストレージバッファへの書き込みを安全に実行
    if (local_id.x == 0u) {
        let finalMinX = atomicLoad(&sharedMinX);
        let finalMinY = atomicLoad(&sharedMinY);
        let finalMaxX = atomicLoad(&sharedMaxX);
        let finalMaxY = atomicLoad(&sharedMaxY);

        atomicMin(&aaa[0], finalMinX);
        atomicMin(&aaa[1], finalMinY);
        atomicMax(&aaa[2], finalMaxX);
        atomicMax(&aaa[3], finalMaxY);
    }

    workgroupBarrier();

    if (index == 0u) {
        // 安全にストレージバッファに書き込み
        minMaxBuffer[0] = vec2<f32>(i32_to_f32(atomicLoad(&aaa[0])), i32_to_f32(atomicLoad(&aaa[1])));
        minMaxBuffer[1] = vec2<f32>(i32_to_f32(atomicLoad(&aaa[2])), i32_to_f32(atomicLoad(&aaa[3])));
    }
}`)
// モディファイアの頂点位置.wgsl
shaders.set('./script/wgsl/compute/モディファイアの頂点位置.wgsl',`struct ModifierBox {
    max: vec2<f32>,
    min: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<vec2<f32>>; // 出力
@group(0) @binding(1) var<storage, read> movement: array<vec2<f32>>; // 移動距離
@group(0) @binding(2) var<uniform> modifierBox: ModifierBox;
@group(0) @binding(3) var<uniform> fineness: vec2<u32>; // キーに含まれる頂点の数

@compute @workgroup_size(16,16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x >= fineness.x + 1 || global_id.y >= fineness.y + 1) {
        return;
    }
    let pointIndex = global_id.x + global_id.y * (fineness.x + 1);

    let pos = modifierBox.min + ((vec2f(global_id.xy) / vec2f(fineness.xy)) * (modifierBox.max - modifierBox.min)) + movement[pointIndex];
    outputData[pointIndex] = pos;
}`)
// 頂点のボックス選択.wgsl
shaders.set('./script/wgsl/compute/頂点のボックス選択.wgsl',`struct CollsionBox {
    max: vec2<f32>,
    min: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<f32>; // 出力
@group(0) @binding(1) var<uniform> collsionBox: CollsionBox; // 距離を計算する座標
@group(1) @binding(0) var<storage, read> vertices: array<vec2<f32>>; // キーに含まれる頂点の数

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pointIndex = global_id.x;
    if (arrayLength(&vertices) <= pointIndex) {
        return;
    }

    let pos = vertices[pointIndex];
    if (collsionBox.min.x < pos.x && collsionBox.min.y < pos.y &&
        collsionBox.max.x > pos.x && collsionBox.max.y > pos.y) {
        outputData[pointIndex] = 100.0;
    } else {
        outputData[pointIndex] = 0.0;
    }
}`)
// 回転モディファイアの変形を適応.wgsl
shaders.set('./script/wgsl/compute/回転モディファイアの変形を適応.wgsl',`struct Rotate {
    position: vec2<f32>,
    scale: f32,
    angle: f32,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<vec2<f32>>; // 出力
@group(1) @binding(0) var<uniform> baseData: Rotate; // 回転の中心
@group(1) @binding(1) var<uniform> rotateData: Rotate; // 移動回転スケールデータ

fn rotate2D(point: vec2<f32>, angle: f32) -> vec2<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);

    let xPrime = point.x * cosTheta - point.y * sinTheta;
    let yPrime = point.x * sinTheta + point.y * cosTheta;

    return vec2<f32>(xPrime, yPrime);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pointIndex = global_id.x;
    if (arrayLength(&outputData) <= pointIndex) {
        return;
    }

    let pos = rotate2D(outputData[pointIndex] - baseData.position, rotateData.angle - baseData.angle) * (rotateData.scale - baseData.scale + 1.0) + rotateData.position;
    outputData[pointIndex] = pos;
}`)
// updateAnimationVerticesPosition.wgsl
shaders.set('./script/wgsl/compute/updateAnimationVerticesPosition.wgsl',`struct Output {
    index: u32,
    padding: f32,
    movement: vec2<f32>,
}

struct ActiveIndex {
    padding: vec3<f32>, // パディングで16バイトを確保
    index: u32,
};

@group(0) @binding(0) var<storage, read_write> outputData: array<Output>; // 出力
@group(1) @binding(0) var<uniform> activeIndexs: array<ActiveIndex, 1000>; // シェイプキーのデータ
@group(1) @binding(1) var<uniform> movement: vec2<f32>; // 移動距離

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pointIndex = global_id.x;
    if (arrayLength(&activeIndexs) <= pointIndex) {
        return;
    }

    outputData[activeIndexs[pointIndex].index].movement += movement;
}`)
// 複数アニメーション.wgsl
shaders.set('./script/wgsl/compute/アニメーション/コピー/複数アニメーション.wgsl',`@group(0) @binding(0) var<storage, read_write> outputData: array<f32>; // 出力
@group(1) @binding(0) var<storage, read> animationDatas: array<f32>; // シェイプキーのデータ
@group(1) @binding(1) var<storage, read> keyPoints: array<f32>; // キーの位置
@group(1) @binding(2) var<uniform> nowPoint: f32; // シェイプキーの重み

fn isNaN(x: f32) -> bool {
    return x != x;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let dataIndex = global_id.x;
    let dataNum = arrayLength(&outputData);
    if (dataNum <= dataIndex) {
        return;
    }
    let animationNum = arrayLength(&keyPoints);

    var leftKey = animationDatas[dataIndex];
    var rightKey = 0.0;
    var leftPoint = keyPoints[0];
    var rightPoint = 0.0;
    for (var animationIndex = 0; animationIndex < animationNum; animationIndex) {
        let data = animationDatas[animationIndex * dataNum + dataIndex];
        if (!isNaN(data)) {
            let point = keyPoints[animationIndex];
            rightKey = dataIndex;
            rightPoint = point;
            if (nowPoint < point) {
                break ;
            }
            leftKey = rightKey;
        }
    }
    if (isNaN(leftKey)) {
        outputData[dataIndex] = 0 / 0;
    } else {
        outputData[dataIndex] = mix(leftKey, rightKey, (rightPoint - leftPoint) / (nowPoint - leftPoint));
    }
}`)
// inversionCopy.wgsl
shaders.set('./script/wgsl/compute/アニメーション/コピー/inversionCopy.wgsl',`struct Animation {
    index: u32,
    padding: f32,
    movement: vec2<f32>,
}

struct Option {
    shaft: u32,
};

@group(0) @binding(0) var<storage, read_write> targetData: array<Animation>; // 出力
@group(1) @binding(0) var<storage, read> sourceData: array<Animation>; // 出力
@group(2) @binding(0) var<uniform> optionData: Option; // 頂点インデックスのデータ

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let threadIndex = global_id.x;
    if (arrayLength(&targetData) <= threadIndex) {
        return;
    }

    let data = sourceData[threadIndex];
    if (optionData.shaft == 0u) {
        targetData[threadIndex] = Animation(data.index, data.padding, data.movement * vec2f(-1,1));
    } else if (optionData.shaft == 1u) {
        targetData[threadIndex] = Animation(data.index, data.padding, data.movement * vec2f(1,-1));
    } else {
        targetData[threadIndex] = Animation(data.index, data.padding, data.movement * vec2f(-1,-1));
    }
}`)
// モディファイアの変形を適応.wgsl
shaders.set('./script/wgsl/compute/モディファイア/モディファイアの変形を適応.wgsl',`struct AnimationData {
    index: vec4<u32>,
    weight: vec4<f32>,
}

struct Animation {
    index: u32,
    padding: f32,
    position: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<vec2<f32>>; // 出力
@group(0) @binding(1) var<storage, read> animationDatas: array<AnimationData>; // 頂点がモディファイのどの頂点にどれぐらい影響を受けるか
@group(1) @binding(0) var<storage, read> baseModifierVertices: array<vec2<f32>>; // モディファイア
@group(1) @binding(1) var<storage, read> modifierVertices: array<vec2<f32>>; // モディファイア

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pointIndex = global_id.x;
    if (arrayLength(&animationDatas) <= pointIndex) {
        return;
    }

    let animationData = animationDatas[pointIndex];
    let indexs = animationData.index;
    let a = modifierVertices[indexs.x] - baseModifierVertices[indexs.x];
    let b = modifierVertices[indexs.y] - baseModifierVertices[indexs.y];
    let c = modifierVertices[indexs.z] - baseModifierVertices[indexs.z];
    let d = modifierVertices[indexs.w] - baseModifierVertices[indexs.w];

    outputData[pointIndex] +=
        a * animationData.weight.x +
        b * animationData.weight.y +
        c * animationData.weight.z +
        d * animationData.weight.w
        ;
}`)
// 頂点にモディファイアとの関係を作る.wgsl
shaders.set('./script/wgsl/compute/モディファイア/頂点にモディファイアとの関係を作る.wgsl',`struct Output {
    index: vec4<u32>,
    weight: vec4<f32>,
}

struct ModifierBox {
    max: vec2<f32>,
    min: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<Output>; // 出力
@group(0) @binding(1) var<storage, read> baseVertices: array<vec2<f32>>; // グラフィックメッシュの頂点位置
@group(1) @binding(0) var<uniform> modifierBox: ModifierBox; // モディファイアの頂点位置
@group(1) @binding(1) var<uniform> modifierFineness: vec2<u32>; // モディファイアの分割数

fn calculateWeight(position: vec2<f32>) -> Output {
    var output: Output;
    var p = vec2<u32>(floor(position));
    var k = position % 1.0;
    if (p.x >= modifierFineness.x) {
        p.x = modifierFineness.x - 1u;
        k.x = 1.0;
    }
    if (p.y >= modifierFineness.y) {
        p.y = modifierFineness.y - 1u;
        k.y = 1.0;
    }
    let i: u32 = p.x + p.y * modifierFineness.x;
    output.index = vec4<u32>(i + p.y, i + 1u + p.y, i + modifierFineness.x + 1u + p.y, i + modifierFineness.x + 2u + p.y);
    output.weight = vec4<f32>(
        (1.0 - k.y) * (1.0 - k.x),
        (1.0 - k.y) * (k.x),
        k.y * (1.0 - k.x),
        k.y * k.x,
    );
    return output;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let verticesIndex = global_id.x;
    if (arrayLength(&baseVertices) <= verticesIndex) {
        return;
    }

    outputData[verticesIndex] = calculateWeight(
            (baseVertices[verticesIndex] - modifierBox.min) / (modifierBox.max - modifierBox.min) * vec2f(modifierFineness)
        );
}`)
// 当たり判定.wgsl
shaders.set('./script/wgsl/compute/モディファイア/当たり判定.wgsl',`
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
}`)
// 子の変形.wgsl
shaders.set('./script/wgsl/compute/アーマチュア/子の変形.wgsl',`struct AnimationData {
    index: vec4<u32>,
    weight: vec4<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<vec2<f32>>; // 出力
@group(0) @binding(1) var<storage, read> animationDatas: array<AnimationData>; // 頂点がモディファイのどの頂点にどれぐらい影響を受けるか
@group(1) @binding(0) var<storage, read> baseBoneMatrix: array<mat3x3<f32>>; // ベースボーンの行列
@group(1) @binding(1) var<storage, read> boneMatrix: array<mat3x3<f32>>; // ベースボーンのデータ

fn inverseMat3x3(matrix: mat3x3<f32>) -> mat3x3<f32> {
    var inv: mat3x3<f32>;

    let a = matrix[0][0];
    let b = matrix[0][1];
    let c = matrix[0][2];
    let d = matrix[1][0];
    let e = matrix[1][1];
    let f = matrix[1][2];
    let g = matrix[2][0];
    let h = matrix[2][1];
    let i = matrix[2][2];

    let det = a * (e * i - f * h) -
              b * (d * i - f * g) +
              c * (d * h - e * g);

    if (det == 0.0) {
        // 行列が逆行列を持たない場合
        return mat3x3<f32>(0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0);
    }

    let invDet = 1.0 / det;

    inv[0][0] = (e * i - f * h) * invDet;
    inv[0][1] = (c * h - b * i) * invDet;
    inv[0][2] = (b * f - c * e) * invDet;
    inv[1][0] = (f * g - d * i) * invDet;
    inv[1][1] = (a * i - c * g) * invDet;
    inv[1][2] = (c * d - a * f) * invDet;
    inv[2][0] = (d * h - e * g) * invDet;
    inv[2][1] = (b * g - a * h) * invDet;
    inv[2][2] = (a * e - b * d) * invDet;

    return inv;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let vertexIndex = global_id.x;
    if (arrayLength(&outputData) <= vertexIndex) {
        return;
    }

    let position = vec3<f32>(outputData[vertexIndex],1.0);
    let animationData = animationDatas[vertexIndex];
    let indexs = animationData.index;
    let weights = animationData.weight;
    var skinnedPosition = vec2<f32>(0.0, 0.0);
    // 各ボーンのワールド行列を用いてスキニング
    for (var i = 0u; i < 4u; i = i + 1u) {
        let weight = weights[i];
        if (0.0 < weight) {
            let boneIndex = indexs[i];
            skinnedPosition += weight * (boneMatrix[boneIndex] * inverseMat3x3(baseBoneMatrix[boneIndex]) * position).xy;
        }
    }
    outputData[vertexIndex] = skinnedPosition;
}`)
// ベースボーンのデータを作る.wgsl
shaders.set('./script/wgsl/compute/アーマチュア/ベースボーンのデータを作る.wgsl',`struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> baseBone: array<Bone>; // ローカルベースボーン
@group(0) @binding(1) var<storage, read_write> baseBoneMatrix: array<mat3x3<f32>>; // ベースボーンの行列
@group(0) @binding(2) var<storage, read> verticesPosition: array<BoneVertices>; // ベースボーンの行列
@group(0) @binding(3) var<storage, read> relationships: array<u32>; // indexに対応する親index

fn getAngle(p1: vec2<f32>, p2: vec2<f32>) -> f32 {
    let delta = p2 - p1;
    return atan2(delta.y, delta.x);
}

// 2次元の回転、スケール、平行移動を表現する行列を作成する関数
fn createTransformMatrix(scale: vec2<f32>, angle: f32, translation: vec2<f32>) -> mat3x3<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);

    // スケールと回転を組み合わせた行列
    var matrix: mat3x3<f32>;
    matrix[0] = vec3<f32>(scale.x * cosTheta, -scale.y * sinTheta, 0.0);
    matrix[1] = vec3<f32>(scale.x * sinTheta, scale.y * cosTheta, 0.0);
    matrix[2] = vec3<f32>(translation.x, translation.y, 1.0);

    return matrix;
}

fn inverseRotatePoint(point: vec2<f32>, angle: f32) -> vec2<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);
    return vec2<f32>(
        point.x * cosTheta - point.y * sinTheta,
        point.x * sinTheta + point.y * cosTheta
    );
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let boneIndex = global_id.x;
    if (boneIndex >= arrayLength(&relationships)) {
        return ;
    }

    let parentIndex = relationships[boneIndex];
    let vertex = verticesPosition[boneIndex];
    let boneData = Bone(vertex.h, vec2<f32>(1.0), -(getAngle(vertex.h, vertex.t) - 1.5708), length(vertex.h - vertex.t));
    if (boneIndex == parentIndex) { // 親がない場合
        baseBone[boneIndex] = boneData;
    } else { // 親がある場合
        let parentVertex = verticesPosition[parentIndex]; // 親ボーンのデータ
        let parentAngle = -(getAngle(parentVertex.h, parentVertex.t) - 1.5708); // 親ボーンの角度
        baseBone[boneIndex] = Bone(inverseRotatePoint(vertex.h - parentVertex.h, parentAngle), vec2<f32>(1.0), boneData.angle - parentAngle, boneData.length); // 親ボーンからのローカルデータ
    }
    baseBoneMatrix[boneIndex] = createTransformMatrix(boneData.scale, boneData.angle, boneData.position);
}`)
// 適応.wgsl
shaders.set('./script/wgsl/compute/アーマチュア/適応.wgsl',`struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

@group(0) @binding(0) var<storage, read_write> localBonewMatrix: array<mat3x3<f32>>; // 出力
@group(0) @binding(1) var<storage, read> localBoneDatas: array<Bone>;

// 2次元の回転、スケール、平行移動を表現する行列を作成する関数
fn createTransformMatrix(scale: vec2<f32>, angle: f32, translation: vec2<f32>) -> mat3x3<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);

    // スケールと回転を組み合わせた行列
    var matrix: mat3x3<f32>;
    matrix[0] = vec3<f32>(scale.x * cosTheta, -scale.y * sinTheta, 0.0);
    matrix[1] = vec3<f32>(scale.x * sinTheta, scale.y * cosTheta, 0.0);
    matrix[2] = vec3<f32>(translation.x, translation.y, 1.0);

    return matrix;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let boneIndex = global_id.x;
    if (boneIndex >= arrayLength(&localBoneDatas)) {
        return;
    }

    let localBoneData = localBoneDatas[boneIndex];
    localBonewMatrix[boneIndex] = createTransformMatrix(localBoneData.scale, localBoneData.angle, localBoneData.position);
}`)
// 当たり判定.wgsl
shaders.set('./script/wgsl/compute/アーマチュア/当たり判定.wgsl',`struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> hitTestResult: array<f32>; // 出力
@group(0) @binding(1) var<uniform> point: vec2<f32>; // 距離を計算する座標
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;

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

const size = 0.05;
const ratio = 0.1;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let boneIndex = global_id.x;
    if (arrayLength(&verticesPosition) <= boneIndex) {
        return;
    }

    // 頂点データを取得
    let position1 = verticesPosition[boneIndex].h;
    let position2 = verticesPosition[boneIndex].t;
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);

    let v0 = position1 - (normal * size * length(sub));
    let v1 = position1 + (normal * size * length(sub));
    let v2 = position2;

    if (hitTestPointTriangle(v0,v1,v2,point)) {
        hitTestResult[boneIndex] = 100.0;
    } else {
        hitTestResult[boneIndex] = 0.0;
    }
}`)
// 表示頂点を計算.wgsl
shaders.set('./script/wgsl/compute/アーマチュア/表示頂点を計算.wgsl',`struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<BoneVertices>; // 出力
@group(0) @binding(1) var<storage, read> boneMatrix: array<mat3x3<f32>>; // ボーンの行列
@group(0) @binding(2) var<storage, read> boneData: array<Bone>; // ボーンのデータ

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let boneIndex = global_id.x;
    if (arrayLength(&outputData) <= boneIndex) {
        return;
    }

    // 頂点データを取得
    let matrix = boneMatrix[boneIndex];
    var output: BoneVertices;
    output.h = (matrix * vec3<f32>(0.0, 0.0, 1.0)).xy;
    output.t = (matrix * vec3<f32>(0.0, boneData[boneIndex].length, 1.0)).xy;
    outputData[boneIndex] = output;
}`)
// 伝播非採用.wgsl
shaders.set('./script/wgsl/compute/アーマチュア/伝播非採用.wgsl',`struct Bone {
    position: vec2<f32>,
    scale: f32,
    angle: f32,
}

struct ParentAndDepth {
    parent: u32,
    depth: u32,
}

@group(0) @binding(0) var<storage, read_write> boneMatrix: array<mat3x3<f32>>; // 出力
@group(1) @binding(0) var<storage, read> relationships: array<ParentAndDepth>; // 親のindexと自分の深度
@group(1) @binding(1) var<uniform> maxDepth: u32; // 深度の最大値

fn extractRotation(matrix: mat3x3<f32>) -> mat3x3<f32> { // スケールの取り出し
    // 回転行列を抽出（スケールを無視）
    var rotation: mat3x3<f32>;
    rotation[0] = normalize(matrix[0]);
    rotation[1] = normalize(matrix[1]);
    rotation[2] = vec3<f32>(0.0, 0.0, 1.0); // 平行移動成分はそのまま
    return rotation;
}

fn extractTranslation(matrix: mat3x3<f32>) -> mat3x3<f32> { // 並行移動の取り出し
    // 平行移動成分を抽出
    var m: mat3x3<f32>;
    m[0] = vec3<f32>(1.0,0.0,0.0);
    m[1] = vec3<f32>(0.0,1.0,0.0);
    m[2] = matrix[2]; // 平行移動成分はそのまま
    return m;
}

fn extractScale(matrix: mat3x3<f32>) -> mat3x3<f32> {
    // スケール成分を抽出
    let sx = length(matrix[0]);
    let sy = length(matrix[1]);
    var m: mat3x3<f32>;
    m[0] = vec3<f32>(sx,0.0,0.0);
    m[1] = vec3<f32>(0.0,sy,0.0);
    m[2] = vec3<f32>(0.0,0.0,1.0); // 平行移動成分はそのまま
    return m;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let boneIndex = global_id.x;
    for (var depth = 1u; depth < maxDepth; depth ++) {
        if (arrayLength(&boneMatrix) > boneIndex) {
            let relationship = relationships[boneIndex];
            if (relationship.depth == depth) {
                boneMatrix[boneIndex] = boneMatrix[relationship.parent] * boneMatrix[boneIndex];
            }
        }
        workgroupBarrier();
    }
}`)
// ウェイト付与.wgsl
shaders.set('./script/wgsl/compute/アーマチュア/ウェイト付与.wgsl',`struct Output {
    index: vec4<u32>,
    weight: vec4<f32>,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<Output>; // 出力
@group(0) @binding(1) var<storage, read> baseVertices: array<vec2<f32>>; // グラフィックメッシュの頂点位置
@group(1) @binding(0) var<storage, read> baseBone: array<BoneVertices>; // ベースボーンの行列
@group(1) @binding(1) var<uniform> effectMaxDist: f32; // ベースボーンのデータ

fn pointToLineDistance(point: vec2<f32>, lineStart: vec2<f32>, lineEnd: vec2<f32>) -> f32 {
    // 線分が点の場合
    if (all(lineStart == lineEnd)) {
        return distance(point, lineStart);
    }

    let lineDir = lineEnd - lineStart;
    let pointDir = point - lineStart;
    let t = dot(pointDir, lineDir) / dot(lineDir, lineDir);

    // 点が線分の外側にある場合
    if (t < 0.0) {
        return distance(point, lineStart);
    } else if (t > 1.0) {
        return distance(point, lineEnd);
    }

    // 点が線分の内側にある場合
    let projection = lineStart + t * lineDir;
    return distance(point, projection);
}

fn mathWeight(dist: f32) -> f32 {
    return pow((dist - 40.0) / 1000.0, 10.0);
}
fn mathWeight2(dist: f32) -> f32 {
    return pow(effectMaxDist, 2.0) - pow(dist, 2.0);
}

fn calculateWeight(position: vec2<f32>) -> Output {
    var output: Output;
    let inf = 999999999u;
    output.index = vec4<u32>(inf);
    output.weight = vec4<f32>(99999999999.0);
    for (var boneIndex = 0u; boneIndex < arrayLength(&baseBone); boneIndex ++) {
        let bone = baseBone[boneIndex];
        let lineStart = bone.h;
        let lineEnd = bone.t;
        let dist = pointToLineDistance(position, lineStart, lineEnd);

        let weight = mathWeight(dist);

        var maxIndex = 0u;
        var maxValue = 0.0;
        for (var i = 0u; i < 4u; i ++) {
            if (output.weight[i] >= maxValue) {
                maxIndex = i;
                maxValue = output.weight[i];
            }
        }
        if (weight < maxValue) {
            output.index[maxIndex] = boneIndex;
            output.weight[maxIndex] = weight;
        }
    }
    // 見つからなかったものは無効にする
    var sumWeight = 0.0;
    for (var i = 0u; i < 4u; i ++) {
        if (inf != output.index[i]) {
            sumWeight += output.weight[i];
        }
    }
    for (var i = 0u; i < 4u; i ++) {
        if (inf == output.index[i]) {
            output.index[i] = 0u;
            output.weight[i] = 0.0;
        } else {
            output.weight[i] = sumWeight - output.weight[i]; // 正規化
        }
    }
    sumWeight = 0.0;
    for (var i = 0u; i < 4u; i ++) {
        sumWeight += output.weight[i];
    }
    for (var i = 0u; i < 4u; i ++) {
        output.weight[i] /= sumWeight;
    }
    return output;
}
fn calculateWeight2(position: vec2<f32>) -> Output {
    var output: Output;
    let inf = 99999999u;
    let maxValue = pow(effectMaxDist, 2.0);
    output.index = vec4<u32>(inf);
    output.weight = vec4<f32>(0.0);
    var maxWeight = -9999999.0;
    var maxWeightIndex = 0u;
    var hasFound = false;
    for (var boneIndex = 0u; boneIndex < arrayLength(&baseBone); boneIndex ++) {
        let bone = baseBone[boneIndex];
        let lineStart = bone.h;
        let lineEnd = bone.t;
        let dist = pointToLineDistance(position, lineStart, lineEnd);
        let weight = mathWeight2(dist);
        if (maxWeight < weight) {
            maxWeight = weight;
            maxWeightIndex = boneIndex;
        }
        if (weight > 0.0) {
            var minIndex = 0u;
            var value = maxValue + 1.0;
            for (var i = 0u; i < 4u; i ++) {
                if (output.weight[i] < value) {
                    minIndex = i;
                    value = output.weight[i];
                }
            }
            if (weight > value) {
                output.index[minIndex] = boneIndex;
                output.weight[minIndex] = weight;
                hasFound = true;
            }
        }
    }
    if (hasFound) {
        // 見つからなかったものは無効にする
        var sumWeight = 0.0;
        for (var i = 0u; i < 4u; i ++) {
            if (inf == output.index[i]) {
                output.index[i] = 0u;
            } else {
                sumWeight += output.weight[i];
            }
        }
        output.weight /= sumWeight; // 正規化
    } else {
        output.index = vec4<u32>(maxWeightIndex, 0, 0, 0);
        output.weight = vec4<f32>(1.0, 0.0, 0.0, 0.0);
    }
    return output;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let verticesIndex = global_id.x;
    if (arrayLength(&baseVertices) <= verticesIndex) {
        return;
    }

    outputData[verticesIndex] = calculateWeight(baseVertices[verticesIndex]);
}`)
// 伝播.wgsl
shaders.set('./script/wgsl/compute/アーマチュア/伝播.wgsl',`struct Relationship {
    child: u32,
    parent: u32,
}

@group(0) @binding(0) var<storage, read_write> boneMatrix: array<mat3x3<f32>>; // 出力
@group(1) @binding(0) var<storage, read> relationships: array<Relationship>; // 親のindexと自分の深度

fn extractRotation(matrix: mat3x3<f32>) -> mat3x3<f32> { // スケールの取り出し
    // 回転行列を抽出（スケールを無視）
    var rotation: mat3x3<f32>;
    rotation[0] = normalize(matrix[0]);
    rotation[1] = normalize(matrix[1]);
    rotation[2] = vec3<f32>(0.0, 0.0, 1.0); // 平行移動成分はそのまま
    return rotation;
}

fn extractTranslation(matrix: mat3x3<f32>) -> mat3x3<f32> { // 並行移動の取り出し
    // 平行移動成分を抽出
    var m: mat3x3<f32>;
    m[0] = vec3<f32>(1.0,0.0,0.0);
    m[1] = vec3<f32>(0.0,1.0,0.0);
    m[2] = matrix[2]; // 平行移動成分はそのまま
    return m;
}

fn extractScale(matrix: mat3x3<f32>) -> mat3x3<f32> {
    // スケール成分を抽出
    let sx = length(matrix[0]);
    let sy = length(matrix[1]);
    var m: mat3x3<f32>;
    m[0] = vec3<f32>(sx,0.0,0.0);
    m[1] = vec3<f32>(0.0,sy,0.0);
    m[2] = vec3<f32>(0.0,0.0,1.0); // 平行移動成分はそのまま
    return m;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&relationships)) {
        return ;
    }
    let relationship = relationships[index];
    boneMatrix[relationship.child] = boneMatrix[relationship.parent] * boneMatrix[relationship.child];
}`)
// 当たり判定.wgsl
shaders.set('./script/wgsl/compute/ベジェモディファイア/当たり判定.wgsl',`struct Bezier {
    p: vec2<f32>,
    c1: vec2<f32>,
    c2: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> hitTestResult: array<f32>; // 出力
@group(0) @binding(1) var<uniform> point: vec2<f32>; // 距離を計算する座標
@group(1) @binding(0) var<storage, read> modifierVertices: array<Bezier>; // モディファイアの頂点位置
const size = 10.0;

// 内積
fn dot(a: vec2<f32>, b: vec2<f32>) -> f32 {
    return a.x * b.x + a.y * b.y;
}

// ベクトルのノルムの二乗
fn norm_squared(a: vec2<f32>) -> f32 {
    return dot(a, a);
}

// ベジェ曲線上の点を計算
fn completion(t: f32, bz: array<vec2<f32>, 4>) -> vec2<f32> {
    let t_ = 1.0 - t;
    return bz[0] * (t_ * t_ * t_) +
           bz[1] * (3 * t_ * t_ * t) +
           bz[2] * (3 * t_ * t * t) +
           bz[3] * (t * t * t);
}

// ベジェ曲線の分割
fn split_bezier(bz: array<vec2<f32>, 4>) -> array<array<vec2<f32>, 4>, 2> {
    let center = completion(0.5, bz);
    return array<array<vec2<f32>, 4>, 2>(
        array<vec2<f32>, 4>(
            bz[0],
            (bz[0] + bz[1]) / 2.0,
            (bz[0] + bz[1] * 2.0 + bz[2]) / 4.0,
            center
        ),
        array<vec2<f32>, 4>(
            center,
            (bz[1] + bz[2] * 2.0 + bz[3]) / 4.0,
            (bz[2] + bz[3]) / 2.0,
            bz[3]
        )
    );
}

// 線分と点の二乗距離を計算
fn diff2_to_line(line: array<vec2<f32>, 2>, p: vec2<f32>) -> f32 {
    let ps = line[0] - p;
    let d = line[1] - line[0];
    let n2 = norm_squared(d);
    let tt = -dot(d, ps);
    if (tt < 0.0) {
        return norm_squared(ps);
    } else if (tt > n2) {
        return norm_squared(line[1] - p);
    }
    let f1 = d.x * ps.y - d.y * ps.x;
    return f1 * f1 / n2;
}

// ベジェ曲線ポリゴンと点の最短距離（二乗）
fn diff2_to_polygon(bz: array<vec2<f32>, 4>, p: vec2<f32>) -> f32 {
    return min(
        diff2_to_line(array<vec2<f32>, 2>(bz[0], bz[1]), p),
        min(
            diff2_to_line(array<vec2<f32>, 2>(bz[1], bz[2]), p),
            min(
                diff2_to_line(array<vec2<f32>, 2>(bz[2], bz[3]), p),
                diff2_to_line(array<vec2<f32>, 2>(bz[3], bz[0]), p)
            )
        )
    );
}

// ベジェ曲線近接点の計算
fn neighbor_bezier(
    bz: array<vec2<f32>, 4>,
    p: vec2<f32>,
    t0: f32,
    t1: f32
) -> vec2<f32> {
    var currentBz = bz;
    var tStart = t0;
    var tEnd = t1;
    var result = vec2<f32>(0.0, 0.0);

    // 最大ループ回数を設定
    let maxIterations = 50;
    var iteration = 0;

    loop {
        iteration ++;

        // 長さが十分短い場合は終了
        let n2 = norm_squared(currentBz[3] - currentBz[0]);
        if (n2 < 0.001 || iteration >= maxIterations) {
            let t = (tStart + tEnd) * 0.5;
            let pointOnCurve = completion(t, currentBz);
            let distanceSquared = norm_squared(pointOnCurve - p);
            result = vec2<f32>(t, sqrt(distanceSquared));
            break;
        }

        // ベジェ曲線を分割
        let splitbz = split_bezier(currentBz);
        let d0 = diff2_to_polygon(splitbz[0], p);
        let d1 = diff2_to_polygon(splitbz[1], p);
        let tCenter = (tStart + tEnd) * 0.5;

        // 距離が短い方を選択して処理を続行
        if (d0 < d1) {
            currentBz = splitbz[0];
            tEnd = tCenter;
        } else {
            currentBz = splitbz[1];
            tStart = tCenter;
        }
    }

    return result;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let bezierIndex = global_id.x;
    if (arrayLength(&hitTestResult) <= bezierIndex) {
        return;
    }

    let controlPoints = array<vec2<f32>, 4>(modifierVertices[bezierIndex].p, modifierVertices[bezierIndex].c2, modifierVertices[bezierIndex + 1].c1, modifierVertices[bezierIndex + 1].p); // ベジェ曲線の制御点
    hitTestResult[bezierIndex] = neighbor_bezier(controlPoints, point, 0, 1).y;
}`)
// 頂点にベジェモディファイアとの関係を作る.wgsl
shaders.set('./script/wgsl/compute/ベジェモディファイア/頂点にベジェモディファイアとの関係を作る.wgsl',`struct Output {
    index: u32,
    t: f32,
}

struct Bezier {
    p: vec2<f32>,
    c1: vec2<f32>,
    c2: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<Output>; // 出力
@group(0) @binding(1) var<storage, read> baseVertices: array<vec2<f32>>; // グラフィックメッシュの頂点位置
@group(1) @binding(0) var<storage, read> modifierVertices: array<Bezier>; // モディファイアの頂点位置

// 内積
fn dot(a: vec2<f32>, b: vec2<f32>) -> f32 {
    return a.x * b.x + a.y * b.y;
}

// ベクトルのノルムの二乗
fn norm_squared(a: vec2<f32>) -> f32 {
    return dot(a, a);
}

// ベジェ曲線上の点を計算
fn completion(t: f32, bz: array<vec2<f32>, 4>) -> vec2<f32> {
    let t_ = 1.0 - t;
    return bz[0] * (t_ * t_ * t_) +
           bz[1] * (3 * t_ * t_ * t) +
           bz[2] * (3 * t_ * t * t) +
           bz[3] * (t * t * t);
}

// ベジェ曲線の分割
fn split_bezier(bz: array<vec2<f32>, 4>) -> array<array<vec2<f32>, 4>, 2> {
    let center = completion(0.5, bz);
    return array<array<vec2<f32>, 4>, 2>(
        array<vec2<f32>, 4>(
            bz[0],
            (bz[0] + bz[1]) / 2.0,
            (bz[0] + bz[1] * 2.0 + bz[2]) / 4.0,
            center
        ),
        array<vec2<f32>, 4>(
            center,
            (bz[1] + bz[2] * 2.0 + bz[3]) / 4.0,
            (bz[2] + bz[3]) / 2.0,
            bz[3]
        )
    );
}

// 線分と点の二乗距離を計算
fn diff2_to_line(line: array<vec2<f32>, 2>, p: vec2<f32>) -> f32 {
    let ps = line[0] - p;
    let d = line[1] - line[0];
    let n2 = norm_squared(d);
    let tt = -dot(d, ps);
    if (tt < 0.0) {
        return norm_squared(ps);
    } else if (tt > n2) {
        return norm_squared(line[1] - p);
    }
    let f1 = d.x * ps.y - d.y * ps.x;
    return f1 * f1 / n2;
}

// ベジェ曲線ポリゴンと点の最短距離（二乗）
fn diff2_to_polygon(bz: array<vec2<f32>, 4>, p: vec2<f32>) -> f32 {
    return min(
        diff2_to_line(array<vec2<f32>, 2>(bz[0], bz[1]), p),
        min(
            diff2_to_line(array<vec2<f32>, 2>(bz[1], bz[2]), p),
            min(
                diff2_to_line(array<vec2<f32>, 2>(bz[2], bz[3]), p),
                diff2_to_line(array<vec2<f32>, 2>(bz[3], bz[0]), p)
            )
        )
    );
}

// ベジェ曲線近接点の計算
fn neighbor_bezier(
    bz: array<vec2<f32>, 4>,
    p: vec2<f32>,
    t0: f32,
    t1: f32
) -> vec2<f32> {
    var currentBz = bz;
    var tStart = t0;
    var tEnd = t1;
    var result = vec2<f32>(0.0, 0.0);

    // 最大ループ回数を設定
    let maxIterations = 50;
    var iteration = 0;

    loop {
        iteration ++;

        // 長さが十分短い場合は終了
        let n2 = norm_squared(currentBz[3] - currentBz[0]);
        if (n2 < 0.001 || iteration >= maxIterations) {
            let t = (tStart + tEnd) * 0.5;
            let pointOnCurve = completion(t, currentBz);
            let distanceSquared = norm_squared(pointOnCurve - p);
            result = vec2<f32>(t, sqrt(distanceSquared));
            break;
        }

        // ベジェ曲線を分割
        let splitbz = split_bezier(currentBz);
        let d0 = diff2_to_polygon(splitbz[0], p);
        let d1 = diff2_to_polygon(splitbz[1], p);
        let tCenter = (tStart + tEnd) * 0.5;

        // 距離が短い方を選択して処理を続行
        if (d0 < d1) {
            currentBz = splitbz[0];
            tEnd = tCenter;
        } else {
            currentBz = splitbz[1];
            tStart = tCenter;
        }
    }

    return result;
}

fn bezierModifierWeightFromPoint(point: vec2<f32>) -> Output {
    var resultIndex = 0u;
    var resultT = 0.0;
    var minDist = f32(99999999.0);
    var lastVertices = modifierVertices[0].p;
    var lastControlPoint = modifierVertices[0].c2;
    for (var i = 1u; i < arrayLength(&modifierVertices); i ++) {
        let vertices = modifierVertices[i].p;
        let controlPoint = modifierVertices[i].c1;
        let controlPoints = array<vec2<f32>, 4>(lastVertices, lastControlPoint, controlPoint, vertices); // ベジェ曲線の制御点
        let result = neighbor_bezier(controlPoints, point, 0, 1);
        if (result.y < minDist) {
            resultIndex = i;
            resultT = result.x;
            minDist = result.y;
        }
        lastVertices = vertices;
        lastControlPoint = modifierVertices[i].c2;
    }
    return Output(resultIndex, resultT);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let verticesIndex = global_id.x;
    if (arrayLength(&baseVertices) <= verticesIndex) {
        return;
    }

    outputData[verticesIndex] = bezierModifierWeightFromPoint(baseVertices[verticesIndex]);
}`)
// ベジェモディファイアの変形を適応.wgsl
shaders.set('./script/wgsl/compute/ベジェモディファイア/ベジェモディファイアの変形を適応.wgsl',`struct Output {
    position: vec2<f32>,
}

struct AnimationData {
    index: u32,
    t: f32,
}

struct BezierData {
    vertices: vec2<f32>,
    control1: vec2<f32>,
    control2: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<Output>; // 出力
@group(0) @binding(1) var<storage, read> animationDatas: array<AnimationData>; // シェイプキーのデータ
@group(1) @binding(0) var<storage, read> baseBezierData: array<BezierData>; // シェイプキーのデータ
@group(1) @binding(1) var<storage, read> bezierData: array<BezierData>; // シェイプキーのデータ

fn mathBezier(p1: vec2<f32>, c1: vec2<f32>, c2: vec2<f32>, p2: vec2<f32>, t: f32) -> vec2<f32> {
    let u = 1.0 - t;
    return p1 * pow(u, 3.0) + c1 * 3.0 * pow(u, 2.0) * t + c2 * 3.0 * u * pow(t, 2.0) + p2 * pow(t, 3.0);
}

fn getBezierNormal(p1: vec2<f32>, c1: vec2<f32>, c2: vec2<f32>, p2: vec2<f32>, t: f32) -> vec2<f32> {
    let u = 1.0 - t;
    return normalize(3.0 * pow(u, 2.0) * (c1 - p1) + 6.0 * u * t * (c2 - c1) + 3.0 * pow(t, 2.0) * (p2 - c2));
}

fn calculateRotation(n1: vec2<f32>, n2: vec2<f32>) -> f32 {
    // 内積を使ってcosθを計算
    let dotProduct = dot(n1, n2);
    // 外積を使ってsinθを計算
    let crossProduct = n1.x * n2.y - n1.y * n2.x;

    // atan2を使用して角度を求める（ラジアン）
    let angle = atan2(crossProduct, dotProduct);

    return angle; // 回転量（ラジアン）
}

fn rotate2D(point: vec2<f32>, angle: f32) -> vec2<f32> {
    let cosTheta = cos(angle);
    let sinTheta = sin(angle);

    let xPrime = point.x * cosTheta - point.y * sinTheta;
    let yPrime = point.x * sinTheta + point.y * cosTheta;

    return vec2<f32>(xPrime, yPrime);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pointIndex = global_id.x;
    if (arrayLength(&outputData) <= pointIndex) {
        return;
    }

    let index = animationDatas[pointIndex].index;
    let t = animationDatas[pointIndex].t;
    let a1 = baseBezierData[index - 1];
    let a2 = baseBezierData[index];

    let b1 = bezierData[index - 1];
    let b2 = bezierData[index];

    let position1 = mathBezier(a1.vertices, a1.control2, a2.control1, a2.vertices, t);
    let position2 = mathBezier(b1.vertices, b1.control2, b2.control1, b2.vertices, t);

    let normal1 = getBezierNormal(a1.vertices, a1.control2, a2.control1, a2.vertices, t);
    let normal2 = getBezierNormal(b1.vertices, b1.control2, b2.control1, b2.vertices, t);

    let rotatePosition = rotate2D(outputData[pointIndex].position + (position2 - position1) - position2, calculateRotation(normal1, normal2));

    outputData[pointIndex].position = rotatePosition + position2;
}`)
// c.wgsl
shaders.set('./script/wgsl/compute/ウェイトペイント/c.wgsl',`struct Output {
    indexs: vec4<u32>,
    weights: vec4<f32>,
}

struct Config {
    decayType: u32,
    decaySize: f32,
    index: u32,
    weight: f32,
}

@group(0) @binding(0) var<storage, read_write> indexAndWeight: array<Output>;
@group(0) @binding(1) var<storage, read> originalIndexAndWeight: array<Output>;
@group(0) @binding(2) var<storage, read_write> maxWeights: array<f32>;
@group(0) @binding(3) var<storage, read> vertices: array<vec2<f32>>;
@group(1) @binding(0) var<uniform> config: Config;
@group(1) @binding(1) var<uniform> centerPoint: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&vertices) <= index) {
        return;
    }
    let dist = distance(centerPoint, vertices[index]);
    let decay = (config.decaySize - dist) / config.decaySize;
    if (dist < config.decaySize) {
        let weight = config.weight * decay;
        maxWeights[index] = max(maxWeights[index],weight);
    }
    var minIndex = 0u;
    var minWeight = 1.1;
    let data = originalIndexAndWeight[index];
    for (var i = 0u; i < 4u; i ++) {
        if (config.index == data.indexs[i]) {
            minIndex = i;
            minWeight = data.weights[i];
            break ;
        } else if (data.weights[i] < minWeight) {
            minIndex = i;
            minWeight = data.weights[i];
        }
    }
    if (minWeight < maxWeights[index]) {
        indexAndWeight[index].indexs[minIndex] = config.index;
        indexAndWeight[index].weights[minIndex] = maxWeights[index];
        var sumWeight = 0.0;
        for (var i = 0u; i < 4u; i ++) {
            sumWeight += indexAndWeight[index].weights[i];
        }
        indexAndWeight[index].weights /= sumWeight; // 正規化
    }
}`)
// baseTransform.wgsl
shaders.set('./script/wgsl/compute/変形/baseTransform.wgsl',`struct Output {
    position: vec2<f32>,
}

struct ActiveIndex {
    movement: vec2<f32>,
    index: u32,
    padding: f32,
};

@group(0) @binding(0) var<storage, read_write> outputData: array<Output>; // 出力
@group(1) @binding(0) var<storage, read> activeIndexs: array<ActiveIndex>; // 頂点インデックスのデータ

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let threadIndex = global_id.x;
    if (arrayLength(&activeIndexs) <= threadIndex) {
        return;
    }

    let pointIndex = activeIndexs[threadIndex].index;

    outputData[pointIndex].position = activeIndexs[threadIndex].movement + outputData[pointIndex].position * activeIndexs[threadIndex].padding;
}`)
// deleteVertices.wgsl
shaders.set('./script/wgsl/compute/頂点情報の削除/deleteVertices.wgsl',`struct Data {
    index: u32,
    padding: f32,
    movement: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> dataOutput: array<Data>; // 出力
@group(0) @binding(1) var<storage, read> dataInput: array<Data>; // 入力
@group(0) @binding(2) var<storage, read> correspondingIndex: array<u32>; // 入力
@group(0) @binding(3) var<storage, read> deleteIndexs: array<u32>; // 削除されるindex
@group(0) @binding(4) var<uniform> isVertexDeletion: f32; // 削除されるindex

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pointIndex = global_id.x;
    if (arrayLength(&dataOutput) <= pointIndex) {
        return;
    }

    var data = dataInput[correspondingIndex[pointIndex]];
    var count = 0u;
    if (isVertexDeletion == 1.0) {
        for (var i: u32 = 0u; i < arrayLength(&deleteIndexs); i ++) {
            if (data.index > deleteIndexs[i]) {
                data.index --;
            } else {
                break ;
            }
        }
    }
    dataOutput[pointIndex] = data;
}`)
// collisionMesh.wgsl
shaders.set('./script/wgsl/compute/選択/collisionMesh.wgsl',`struct Meshu {
    i1: u32,
    i2: u32,
    i3: u32,
    padding: u32,
}

@group(0) @binding(0) var<storage, read_write> outputData: array<f32>; // 出力
@group(0) @binding(1) var<uniform> point: vec2<f32>; // 距離を計算する座標
@group(1) @binding(0) var<storage, read> vertices: array<vec2<f32>>; // 頂点
@group(1) @binding(1) var<storage, read> mesh: array<Meshu>; // メッシュを構成する頂点インデックス

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
    let meshIndex = global_id.x;
    if (arrayLength(&mesh) <= meshIndex) {
        return;
    }

    let indexs = mesh[meshIndex];
    if (hitTestPointTriangle(vertices[indexs.i1],vertices[indexs.i2],vertices[indexs.i3],point)) {
        outputData[meshIndex] = 100.0;
    } else {
        outputData[meshIndex] = 0.0;
    }
}`)
// f32_加算と減算.wgsl
shaders.set('./script/wgsl/compute/バッファの書き換え/f32_加算と減算.wgsl',`struct Data {
}

@group(0) @binding(0) var<storage, read_write> outputData: array<Data>; // 出力
@group(0) @binding(1) var<storage, read> baseData: array<Data>; // 基準
@group(0) @binding(2) var<storage, read> updateData: array<Data>; // 入力

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let threadIndex = global_id.x;
    if (arrayLength(&updateData) <= threadIndex) {
        return;
    }

    outputData[threadIndex] = updateData[threadIndex] - baseData[threadIndex];
}`)
// 変形回転.wgsl
shaders.set('./script/wgsl/compute/バッファの書き換え/変形/変形回転.wgsl',`@group(0) @binding(0) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> centerPoint: vec2<f32>;
@group(0) @binding(2) var<storage, read> originalVertices: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> weigth: array<f32>;
@group(0) @binding(4) var<uniform> value: vec2<f32>;

fn getAngle(a: vec2<f32>, b: vec2<f32>) -> f32 {
    return atan2(a.y - b.y, a.x - b.x);
}

fn rotate(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(
        p.x * c - p.y * s,
        p.x * s + p.y * c,
    );
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&weigth) <= index) {
        return;
    }
    let sub = rotate(originalVertices[index] - centerPoint, value.x * (weigth[index]));
    output[index] = sub + centerPoint;
}`)
// 重みなどの作成.wgsl
shaders.set('./script/wgsl/compute/バッファの書き換え/変形/重みなどの作成.wgsl',`@group(0) @binding(0) var<storage, read_write> weight: array<f32>;
@group(0) @binding(1) var<storage, read> verticesIndexs: array<u32>;
@group(1) @binding(0) var<uniform> proportionalEditType: u32;
@group(1) @binding(1) var<uniform> proportionalSize: f32;
@group(1) @binding(2) var<uniform> centerPoint: vec2<f32>;
@group(2) @binding(0) var<storage, read> vertices: array<vec2<f32>>;

fn arrayIncludes(value: u32) -> bool {
    for (var i = 0u; i < arrayLength(&verticesIndexs); i = i + 1u) {
        if (verticesIndexs[i] == value) {
            return true;
        }
    }
    return false;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&vertices) <= index) {
        return;
    }
    if (proportionalEditType == 0u) { // 通常
        if (arrayIncludes(index)) {
            weight[index] = 1.0;
        } else {
            weight[index] = 0.0;
        }
    } else if (proportionalEditType == 1u) { // 1次関数
        if (arrayIncludes(index)) {
            weight[index] = 1.0;
        } else {
            let dist = distance(vertices[index], centerPoint);
            if (dist < proportionalSize) {
                weight[index] = 1.0 - dist / proportionalSize;
            } else {
                weight[index] = 0.0;
            }
        }
    } else if (proportionalEditType == 2u) { // 2次関数
        if (arrayIncludes(index)) {
            weight[index] = 1.0;
        } else {
            let dist = distance(vertices[index], centerPoint);
            if (dist < proportionalSize) {
                weight[index] = pow((1.0 - dist / proportionalSize), 2.0);
            } else {
                weight[index] = 0.0;
            }
        }
    }
}`)
// 変形並行移動.wgsl
shaders.set('./script/wgsl/compute/バッファの書き換え/変形/変形並行移動.wgsl',`@group(0) @binding(0) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> originalVertices: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> baseData: array<vec2<f32>>; // 基準
@group(0) @binding(3) var<storage, read> weigth: array<f32>;
@group(0) @binding(4) var<uniform> centerPoint: vec2<f32>;
@group(0) @binding(5) var<uniform> value: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&weigth) <= index) {
        return;
    }
    let sub = (originalVertices[index] - centerPoint) + (value) * (weigth[index]);
    output[index] = sub + centerPoint - baseData[index];
}`)
// 変形拡大縮小.wgsl
shaders.set('./script/wgsl/compute/バッファの書き換え/変形/変形拡大縮小.wgsl',`@group(0) @binding(0) var<storage, read_write> output: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> originalVertices: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> weigth: array<f32>;
@group(0) @binding(3) var<uniform> centerPoint: vec2<f32>;
@group(0) @binding(4) var<uniform> value: vec2<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&weigth) <= index) {
        return;
    }
    let sub = (originalVertices[index] - centerPoint);
    // output[index] = sub * (value) * (weigth[index]) + sub + centerPoint;
    output[index] = ((sub * (value) + centerPoint) * weigth[index]) + (originalVertices[index] * (1.0 - weigth[index]));
}`)
// ボーンアニメーション変形並行移動.wgsl
shaders.set('./script/wgsl/compute/バッファの書き換え/変形/ボーンアニメーション変形並行移動.wgsl',`struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

@group(0) @binding(0) var<storage, read_write> boneAnimation: array<Bone>;
@group(0) @binding(1) var<storage, read> originalBoneAnimation: array<Bone>;
@group(0) @binding(2) var<storage, read> boneMatrix: array<mat3x3>;
@group(0) @binding(3) var<storage, read> parents: array<u32>;
@group(0) @binding(4) var<storage, read> verticesIndexs: array<u32>;
@group(0) @binding(5) var<uniform> value: vec2<f32>;

fn inverseMat3x3(matrix: mat3x3<f32>) -> mat3x3<f32> {
    var inv: mat3x3<f32>;

    let a = matrix[0][0];
    let b = matrix[0][1];
    let c = matrix[0][2];
    let d = matrix[1][0];
    let e = matrix[1][1];
    let f = matrix[1][2];
    let g = matrix[2][0];
    let h = matrix[2][1];
    let i = matrix[2][2];

    let det = a * (e * i - f * h) -
              b * (d * i - f * g) +
              c * (d * h - e * g);

    if (det == 0.0) {
        // 行列が逆行列を持たない場合
        return mat3x3<f32>(0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0);
    }

    let invDet = 1.0 / det;

    inv[0][0] = (e * i - f * h) * invDet;
    inv[0][1] = (c * h - b * i) * invDet;
    inv[0][2] = (b * f - c * e) * invDet;
    inv[1][0] = (f * g - d * i) * invDet;
    inv[1][1] = (a * i - c * g) * invDet;
    inv[1][2] = (c * d - a * f) * invDet;
    inv[2][0] = 0.0;
    inv[2][1] = 0.0;
    inv[2][2] = 1.0;

    return inv;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (arrayLength(&verticesIndexs) <= index) {
        return;
    }
    let boneIndex = verticesIndexs[index];
    if () {
        
    }
    let parentMatrix = inverseMat3x3(boneMatrix[parents[boneIndex]]);
    boneAnimation[boneIndex].position = value * parentMatrix + originalBoneAnimation[boneIndex].position;
}`)
