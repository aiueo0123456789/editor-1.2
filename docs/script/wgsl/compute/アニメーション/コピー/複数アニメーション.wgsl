@group(0) @binding(0) var<storage, read_write> outputData: array<f32>; // 出力
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
}