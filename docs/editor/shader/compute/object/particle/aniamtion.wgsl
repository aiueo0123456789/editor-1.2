struct Allocation {
    particleOffset: u32,
    MAX_PARTICLES: u32,
    padding0: u32,
    padding1: u32,
    padding2: u32,
    padding3: u32, // 親がなければ0
    padding4: u32, // 親がなければ0
    padding5: u32,
}

struct Particle {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    zIndex: f32,
}

const delet = 1.0 / 60.0;

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>; // 元
@group(0) @binding(1) var<storage, read_write> updateDatas: array<Particle>; // アニメーション
@group(0) @binding(2) var<storage, read> allocationArray: array<Allocation>; // 配分

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let objectIndex = global_id.x;
    let instanceIndex = global_id.y;
    if (arrayLength(&allocationArray) <= objectIndex) { // オブジェクト数を超えているか
        return ;
    }
    if (allocationArray[objectIndex].MAX_PARTICLES <= instanceIndex) { // ボーン数を超えているか
        return ;
    }

    let fixVertexIndex = allocationArray[objectIndex].particleOffset + instanceIndex;
    var particle = particles[fixVertexIndex];
    let updateData = updateDatas[fixVertexIndex];
    particle.position += updateData.position * delet;
    particle.scale += updateData.scale * delet;
    particle.angle += updateData.angle * delet;

    particles[fixVertexIndex] = particle;
}