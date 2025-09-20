import { app } from "../../../main.js";
import { ObjectBase } from "../../utils/objects/util.js";
import { createID, managerForDOMs } from "../../utils/ui/util.js";
import { createArrayN, isNumber, IsString } from "../../utils/utility.js";
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
        this.updatePipeline = data.updatePipeline ? data.updatePipeline : app.scene.objects.scripts[0];
    }

    resolvePhase() {
        if (IsString(this.updatePipeline)) {
            this.updatePipeline = app.scene.objects.getObjectFromID(this.updatePipeline);
        }
    }

    getSaveData() {
        return {
            type: this.type,
            id: this.id,
            name: this.name,
            spawnData: this.spawnData,
            duration: this.duration,
            spawnNum: this.spawnNum,
            startDelay: this.startDelay,
            MAX_PARTICLES: this.MAX_PARTICLES,
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