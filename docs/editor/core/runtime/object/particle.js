import { Application } from "../../../app/app.js";
import { GPU } from "../../../utils/webGPU.js";
import { Particle, ParticleParameter } from "../../objects/particle.js";
import { BufferManager } from "../bufferManager.js";
import { RuntimeDataBase } from "../runtimeDataBase.js";

export class ParticleData extends RuntimeDataBase {
    constructor(/** @type {Application} */ app) {
        super(app, {"": "allocationOffset", "MAX_PARTICLES": "particleOffset"});
        // this.renderingVertices = GPU.createBuffer(0, ["s"]);
        this.renderingParticles = new BufferManager(this, "renderingParticles", ["f32","f32","f32","f32","f32","f32"], "MAX_PARTICLES");
        this.renderingUpdateDatas = new BufferManager(this, "renderingParticles", ["f32","f32","f32","f32","f32","f32"], "MAX_PARTICLES");
        this.emptyIndexs = new BufferManager(this, "renderingParticles", ["u32"], "MAX_PARTICLES");
        this.allocations = new BufferManager(this, "allocations", ["u32","u32","u32","u32","u32","u32","u32","u32"], "1");

        this.renderingGizumoGroup = null;
        this.animationApplyGroup = null;
        this.animationApplyParentGroup = null;

        this.blockByteLength = 2 * 4 * 3; // データ一塊のバイト数: vec2<f32> * 3
        this.weightBlockByteLength = (4 + 4) * 4 * 3;

        this.offsetCreate();
    }

    async updateCPUDataFromGPUBuffer(/** @type {Particle} */particle, updateContent = {vertex: {weight: true, base: true}}) {
        this.write = true;
        const baseArray = updateContent.vertex.base ? await GPU.getVerticesDataFromGPUBuffer(this.baseVertices.buffer, particle.runtimeOffsetData.pointOffset * 3, particle.verticesNum) : [];
        const weightBlockArray = updateContent.vertex.weight ? await GPU.getStructDataFromGPUBuffer(this.weightBlocks.buffer, ["u32","u32","u32","u32","f32","f32","f32","f32"], particle.runtimeOffsetData.pointOffset * 3, particle.verticesNum) : [];
        for (const point of particle.allPoint) {
            for (let i = 0; i < 3; i ++) {
                let vertex;
                if (i == 0) {
                    vertex = point.basePoint;
                } else if (i == 1) {
                    vertex = point.baseLeftControlPoint;
                } else {
                    vertex = point.baseRightControlPoint;
                }
                if (updateContent.vertex.base) {
                    vertex.co = baseArray[point.index * 3 + i];
                }
                if (updateContent.vertex.weight) {
                    vertex.parentWeight.indexs = weightBlockArray[point.index * 3 + i].slice(0,4);
                    vertex.parentWeight.weights = weightBlockArray[point.index * 3 + i].slice(4,8);
                }
            }
        }
        this.write = false;
    }

    updateBaseData(/** @type {Particle} */particle) {
        this.updateAllocationData(particle);
    }

    spawn(/** @type {Particle} */particle, /** @type {ParticleParameter} */ spawnObject) {
        GPU.writeBuffer(this.renderingParticles.buffer, new Float32Array([...spawnObject.position, ...spawnObject.scale, spawnObject.angle, spawnObject.zIndex]), (particle.runtimeOffsetData.particleOffset + spawnObject.index) * this.renderingParticles.structByteSize);
        GPU.writeBuffer(this.renderingUpdateDatas.buffer, new Float32Array([...spawnObject.velocity, ...spawnObject.scaleVelocity, spawnObject.angleVelocity, spawnObject.zIndexVelocity]), (particle.runtimeOffsetData.particleOffset + spawnObject.index) * this.renderingUpdateDatas.structByteSize);
    }

    updateAllocationData(/** @type {Particle} */particle) {
        // 頂点オフセット, アニメーションオフセット, ウェイトオフセット, 頂点数, 最大アニメーション数, 親の型, 親のインデックス, パディング
        let allocationData = this.getAllocationData(particle);
        GPU.writeBuffer(this.allocations.buffer, allocationData, (particle.runtimeOffsetData.allocationOffset * 8) * 4);
        GPU.writeBuffer(particle.objectDataBuffer, allocationData);
    }

    getAllocationData(/** @type {Particle} */particle) {
        return new Uint32Array([particle.runtimeOffsetData.particleOffset, particle.MAX_PARTICLES, 0, 0, 0, 0, 0, 0]);
    }

    setGroup() {
        this.renderingGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [this.renderingParticles.buffer]); // 表示用
        this.updateGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csrw"), [this.renderingParticles.buffer, this.renderingUpdateDatas.buffer]); // 更新用
    }
}