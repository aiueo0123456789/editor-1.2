import { app } from "../../app/app.js";
import { ObjectBase } from "../../utils/objects/util.js";
import { createID, managerForDOMs } from "../../utils/ui/util.js";
import { createArrayN, isNumber } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";

function getValuForVec2(rangeOrValue) {
    try {
        if (Array.isArray(rangeOrValue)) {
            return [...rangeOrValue];
        } else if ("min" in rangeOrValue && "max" in rangeOrValue) {
            if (Array.isArray(rangeOrValue.min) && Array.isArray(rangeOrValue.max)) {
                let subX = rangeOrValue.max[0] - rangeOrValue.min[0];
                let subY = rangeOrValue.max[1] - rangeOrValue.min[1];
                return [Math.random() * subX + rangeOrValue.min[0], Math.random() * subY + rangeOrValue.min[1]];
            } else {
                let sub = rangeOrValue.max - rangeOrValue.min;
                let value = Math.random() * sub + rangeOrValue.min;
                return [value,value];
            }
        }
    } catch (e) {
        // console.error(e);
    }
}

function getValu(rangeOrValue) {
    try {
        if (isNumber(rangeOrValue)) {
            return rangeOrValue;
        } else if ("min" in rangeOrValue && "max" in rangeOrValue) {
            let sub = rangeOrValue.max - rangeOrValue.min;
            return Math.random() * sub + rangeOrValue.min;
        }
    } catch (e) {
        // console.error(e);
    }
}

export class ParticleParameter {
    constructor(/** @type {Particle} */particle, index) {
        this.particle = particle;
        this.index = index;
        // 寿命
        this.lifeTime = 0;
        this.maxLifeTime = getValu(particle.spawnData.maxLifeTime);
        // 座標・大きさ・回転
        this.position = getValuForVec2(particle.spawnData.position);
        this.zIndex = getValu(particle.spawnData.zIndex);
        this.scale = getValuForVec2(particle.spawnData.scale);
        this.angle = getValu(particle.spawnData.angle);
        // 速度
        this.velocity = getValuForVec2(particle.spawnData.velocity);
        this.zIndexVelocity = getValu(particle.spawnData.zIndexVelocity);
        this.scaleVelocity = getValuForVec2(particle.spawnData.scaleVelocity);
        this.angleVelocity = getValu(particle.spawnData.angleVelocity);
        //　加速度
        this.acc = particle.spawnData.acc;
        this.scaleAcc = particle.spawnData.scaleAcc;
        this.angleAcc = particle.spawnData.angleAcc;
        // 風と重力
        this.windAndGravity = [0,-1];
        // 変化のグラフ
        this.graph = 0;
        this.scaleGraph = 0;
        this.angleGraph = 0;
    }

    update() {
        this.lifeTime ++;
        if (this.maxLifeTime < this.lifeTime) {
            this.particle.respawn(this);
        }
    }
}

export class Particle extends ObjectBase {
    constructor(data) {
        super(data.name, "パーティクル", data.id)
        this.runtimeData = app.scene.runtimeData.particle;

        this.particles = [];

        this.spawnData = data.spawnData;

        // パーティクルの生成時間
        this.duration = data.duration;
        // パーテイクルの量
        this.spawnNum = data.spawnNum;

        // パーティクルの発生までの待ち時間
        this.startDelay = data.startDelay;

        this.particlesNum = 0;

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);
        this.C_objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [this.objectDataBuffer]);

        this.MAX_PARTICLES = 1000;
        this.emptyIndexs = createArrayN(this.MAX_PARTICLES);

        this.updatePipelineCode = `
// MIT License. © Stefan Gustavson, Munrocket
fn permute4(x: vec4f) -> vec4f { return ((x * 34. + 1.) * x) % vec4f(289.); }
fn fade2(t: vec2f) -> vec2f { return t * t * t * (t * (t * 6. - 15.) + 10.); }
fn perlinNoise2(P: vec2f) -> f32 {
    var Pi: vec4f = floor(P.xyxy) + vec4f(0., 0., 1., 1.);
    let Pf = fract(P.xyxy) - vec4f(0., 0., 1., 1.);
    Pi = Pi % vec4f(289.); // To avoid truncation effects in permutation
    let ix = Pi.xzxz;
    let iy = Pi.yyww;
    let fx = Pf.xzxz;
    let fy = Pf.yyww;
    let i = permute4(permute4(ix) + iy);
    var gx: vec4f = 2. * fract(i * 0.0243902439) - 1.; // 1/41 = 0.024...
    let gy = abs(gx) - 0.5;
    let tx = floor(gx + 0.5);
    gx = gx - tx;
    var g00: vec2f = vec2f(gx.x, gy.x);
    var g10: vec2f = vec2f(gx.y, gy.y);
    var g01: vec2f = vec2f(gx.z, gy.z);
    var g11: vec2f = vec2f(gx.w, gy.w);
    let norm = 1.79284291400159 - 0.85373472095314 *
        vec4f(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
    g00 = g00 * norm.x;
    g01 = g01 * norm.y;
    g10 = g10 * norm.z;
    g11 = g11 * norm.w;
    let n00 = dot(g00, vec2f(fx.x, fy.x));
    let n10 = dot(g10, vec2f(fx.y, fy.y));
    let n01 = dot(g01, vec2f(fx.z, fy.z));
    let n11 = dot(g11, vec2f(fx.w, fy.w));
    let fade_xy = fade2(Pf.xy);
    let n_x = mix(vec2f(n00, n01), vec2f(n10, n11), vec2f(fade_xy.x));
    let n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
}

struct Allocation {
    particleOffset: u32,
    MAX_PARTICLES: u32,
    padding0: u32,
    padding1: u32,
    padding2: u32,
    padding3: u32,
    padding4: u32,
    padding5: u32,
}

struct Particle {
    position: vec2<f32>,
    scale: vec2<f32>,
    angle: f32,
    zIndex: f32,
}

const delet = 1.0 / 60.0;

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> updateDatas: array<Particle>;
@group(1) @binding(0) var<uniform> allocation: Allocation;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let instanceIndex = global_id.y;
    if (allocation.MAX_PARTICLES <= instanceIndex) {
        return ;
    }

    let fixVertexIndex = allocation.particleOffset + instanceIndex;
    var particle = particles[fixVertexIndex];
    var updateData = updateDatas[fixVertexIndex];
    // updateData.position += vec2<f32>(0.5,-0.1);
    updateData.position += vec2<f32>(perlinNoise2(particle.position / 10.0), perlinNoise2(particle.position / 10.0 + 10.0)) * 2.0;
    particle.position += updateData.position * delet;
    particle.scale += updateData.scale * delet;
    particle.angle += updateData.angle * delet;
    updateDatas[fixVertexIndex] = updateData;
    particles[fixVertexIndex] = particle;
}`;
        this.updatePipeline = null;
        const updatePipelineForUpdate = () => {
            this.updatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Cu")], this.updatePipelineCode);
        };
        updatePipelineForUpdate();
        // managerForDOMs.set({o: this, i: "updatePipelineCode"}, null, updatePipelineForUpdate);
    }

    getSaveData() {
        return {
            id: this.id,
            name: this.name,
        };
    }

    spawn(seed) {
        if (this.emptyIndexs.length == 0) {
            console.warn("パーティクル数はすでに最大です")
            return ;
        }
        const newParticle = new ParticleParameter(this, this.emptyIndexs.shift());
        this.particles.push(newParticle);
        this.runtimeData.spawn(this, newParticle);
        this.particlesNum ++;
    }

    respawn(particle) {
        this.emptyIndexs.unshift(particle.index);
        this.particles.splice(this.particles.indexOf(particle), 1);
        this.particlesNum --;
    }

    update() {
        if (Math.random() < this.spawnNum / this.duration) {
            this.spawn();
        }
        for (const particle of this.particles) {
            particle.update();
        }
    }
}