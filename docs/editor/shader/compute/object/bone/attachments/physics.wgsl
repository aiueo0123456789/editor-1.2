struct Bone {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    length: f32,
}

struct PhysicsAttachmentData {
    translate: vec2<f32>,
    rotate: f32,
    scaleX: f32,
    shearX: f32,

    inertia: f32, // 慣性
    strength: f32, // 復元率
    damping: f32, // 減衰率
    massInverse: f32, // 質量の逆数
    wind: f32, // 風
    gravity: f32, // 重力
    mix: f32, // どれだけ適応するか
    limit: f32, // 最大速度

    reset_: u32, // 初期化済みか

    // runtime
    u: vec2<f32>, // 最終位置
    c: vec2<f32>, // 最終位置
    t: vec2<f32>, // ボーン先端の最終位置
    offset: vec2<f32>,
    velocity: vec2<f32>,
    rotateOffset: f32,
    rotateVelocity: f32,
    scaleOffset: f32,
    scaleVelocity: f32,
}

fn getWorldScaleX(matrix: mat3x3<f32>) -> f32 {
    return sqrt(matrix[0][0] * matrix[0][0] + matrix[0][1] * matrix[0][1]);
}

const PI = 3.14159265359;
const PI2 = PI * 2.0;
const invPI2 = 1.0 / PI2;
const delta = 1.0 / 60.0;
/*
mat3x3(
    a,  b,  0,
    c,  d,  0,
    worldX, worldY, 1
)
*/
@group(0) @binding(0) var<storage, read_write> boneMatrixs: array<mat3x3<f32>>; // 出力
@group(0) @binding(1) var<storage, read_write> baseBone: array<Bone>; // ローカルベースボーン
@group(0) @binding(2) var<storage, read_write> physicsAttachmentDatas: array<PhysicsAttachmentData>; // 物理アタッチメント
@group(1) @binding(0) var<storage, read> boneIndexs: array<u32>; // 親のindexと自分の深度

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&boneIndexs)) {
        return ;
    }
    let boneIndex = boneIndexs[index];
    var attachmentData = physicsAttachmentDatas[boneIndex];
    // attachmentData.inertia = 0.3;
    // attachmentData.damping = 0.95;
    // attachmentData.gravity = 10.0;
    // attachmentData.wind = 0.0;
    // attachmentData.rotate = 1.0;
    // attachmentData.translate = vec2<f32>(0.0,0.0);
    // attachmentData.mix = 1.0;
    // attachmentData.strength = 100.0;
    // attachmentData.massInverse = 1.0 / 1000.0;
    // attachmentData.limit = 100.0;
    let mix = attachmentData.mix;
    if (mix == 0.0) {
        return;
    }

    let x = attachmentData.translate.x > 0.0;
    let y = attachmentData.translate.y > 0.0;
    let rotateOrShearX = attachmentData.rotate > 0.0 || attachmentData.shearX > 0.0;
    let scaleX = attachmentData.scaleX > 0.0;
    let l = baseBone[boneIndex].length;
    var boneMatrix = boneMatrixs[boneIndex];

    let b = boneMatrix[2].xy;
    let i = attachmentData.inertia;
    let f = 1.0;
    var damping = -1.0;
    let qx = attachmentData.limit * delta;
    let qy = qx;

    if (attachmentData.reset_ == 0u) {
        attachmentData.reset_ = 1u;
        attachmentData.u = b;
    } else {
        if (x || y) {
            // 慣性
            if (x) {
                let u = (attachmentData.u.x - b.x) * i;
                if (u > qx) {
                    attachmentData.offset.x += qx;
                } else if (u < -qx) {
                    attachmentData.offset.x += -qx;
                } else {
                    attachmentData.offset.x += u;
                }
                attachmentData.u.x = b.x;
            }
            if (y) {
                let u = (attachmentData.u.y - b.y) * i;
                if (u > qy) {
                    attachmentData.offset.y += qy;
                } else if (u < -qy) {
                    attachmentData.offset.y += -qy;
                } else {
                    attachmentData.offset.y += u;
                }
                attachmentData.u.y = b.y;
            }
            // 重力や風
            damping = pow(attachmentData.damping, 60.0 * delta);
            let m = attachmentData.massInverse * delta;
            let e = attachmentData.strength;
            let w = attachmentData.wind * f;
            let g = attachmentData.gravity * f;
            if (x) {
                attachmentData.velocity.x += w * m; // 風
                attachmentData.velocity.x -= attachmentData.offset.x * e * m; // 復元力
                attachmentData.offset.x += attachmentData.velocity.x * delta;
                attachmentData.velocity.x *= damping;
            }
            if (y) {
                attachmentData.velocity.y += g * m; // 重力
                attachmentData.velocity.y -= attachmentData.offset.y * e * m; // 復元力
                attachmentData.offset.y += attachmentData.velocity.y * delta;
                attachmentData.velocity.y *= damping;
            }
            if (x) {
                boneMatrix[2][0] += attachmentData.offset.x * mix * attachmentData.translate.x;
            }
            if (y) {
                boneMatrix[2][1] += attachmentData.offset.y * mix * attachmentData.translate.y;
            }
        }
        if (rotateOrShearX || scaleX) {
            let ca = atan2(boneMatrix[0][1], boneMatrix[0][0]);
            var c = 0.0;
            var s = 0.0;
            var mr = 0.0;
            var d = attachmentData.c - boneMatrix[2].xy;
            if (d.x > qx) {
                d.x = qx;
            } else if (d.x < -qx) {
                d.x = -qx;
            }
            if (d.y > qy) {
                d.y = qy;
            } else if (d.y < -qy) {
                d.y = -qy;
            }
            if (rotateOrShearX) {
                mr = (attachmentData.rotate + attachmentData.shearX) * mix;
                var r = atan2(d.y + attachmentData.t.y, d.x + attachmentData.t.x) - ca - attachmentData.rotateOffset * mr;
                attachmentData.rotateOffset += (r - ceil(r * invPI2 - 0.5) * PI2) * i;
                r = attachmentData.rotateOffset * mr + ca;
                c = cos(r);
                s = sin(r);
                if (scaleX) {
                    r = l * getWorldScaleX(boneMatrix);
                    if (r > 0.0) {
                        attachmentData.scaleOffset += (d.x * c + d.y * s) * i / r;
                    }
                }
            } else {
                c = cos(ca);
                s = sin(ca);
                let r = l * getWorldScaleX(boneMatrix);
                if (r > 0.0) {
                    attachmentData.scaleOffset += (d.x * c + d.y * s) * i / r;
                }
            }
            if (damping == -1.0) {
                damping = pow(attachmentData.damping, 60.0 * delta);
            }
            let m = attachmentData.massInverse * delta;
            let e = attachmentData.strength;
            let w = attachmentData.wind;
            let g = -attachmentData.gravity;
            let h = l / f;
            if (scaleX) {
                attachmentData.scaleVelocity += (w * c - g * s - attachmentData.scaleOffset * e) * m;
                attachmentData.scaleOffset += attachmentData.scaleVelocity * delta;
                attachmentData.scaleVelocity *= damping;
            }
            if (rotateOrShearX) {
                attachmentData.rotateVelocity -= ((w * s + g * c) * h + attachmentData.rotateOffset * e * h) * m;
                attachmentData.rotateOffset += attachmentData.rotateVelocity * delta;
                attachmentData.rotateVelocity *= damping;
                let r = attachmentData.rotateOffset * mr + ca;
                c = cos(r);
                s = sin(r);
            }
        }
    }

    attachmentData.c = boneMatrix[2].xy;

    if (rotateOrShearX) {
        var o = attachmentData.rotateOffset * mix;
        var s = 0.0;
        var c = 0.0;
        var a = 0.0;
        if (attachmentData.shearX > 0) {
            var r = 0.0;
            if (attachmentData.rotate > 0) {
                r = o * attachmentData.rotate;
                s = sin(r);
                c = cos(r);
                a = boneMatrix[1][0];
                boneMatrix[1][0] = c * a - s * boneMatrix[1][1];
                boneMatrix[1][1] = s * a + c * boneMatrix[1][1];
            }
            r += o * attachmentData.shearX;
            s = sin(r);
            c = cos(r);
            a = boneMatrix[0][0];
            boneMatrix[0][0] = c * a - s * boneMatrix[0][1];
            boneMatrix[0][1] = s * a + c * boneMatrix[0][1];
        } else {
            o *= attachmentData.rotate;
            s = sin(o);
            c = cos(o);
            a = boneMatrix[0][0];
            boneMatrix[0][0] = c * a - s * boneMatrix[0][1];
            boneMatrix[0][1] = s * a + c * boneMatrix[0][1];
            a = boneMatrix[1][0];
            boneMatrix[1][0] = c * a - s * boneMatrix[1][1];
            boneMatrix[1][1] = s * a + c * boneMatrix[1][1];
        }
    }
    if (scaleX) {
        let s = 1.0 + attachmentData.scaleOffset * mix * attachmentData.scaleX;
        boneMatrix[0][0] *= s;
        boneMatrix[0][1] *= s;
    }
    attachmentData.t = vec2<f32>(boneMatrix[0][0],boneMatrix[0][1]) * l;

    physicsAttachmentDatas[boneIndex] = attachmentData;
    boneMatrixs[boneIndex] = boneMatrix;
}