import { GPU } from "./webGPU.js";
import { createID, managerForDOMs } from "./UI/制御.js";
import { KeyframeBlockManager } from "./オブジェクト/キーフレームブロック管理.js";

export class AnimationBlock {
    constructor(belongObject,useClass) {
        this.animationBlock = [];
        this.belongObject = belongObject;
        this.useClass = useClass;

        this.activeAnimationIndex = 0;
        this.activeAnimation = null;
    }

    destroy() {
        for (const animation of this.animationBlock) {
            animation.destroy();
        }
        this.animationBlock.length = 0;
        this.belongObject = null;
        this.useClass = null;
    }

    updateAnimationsIndex() {
        for (let i = 0; i < this.animationBlock.length; i ++) {
            this.animationBlock[i].index = i;
        }
    }

    appendAnimation(name = "名称未設定") {
        const animation = new this.useClass(name, this.belongObject);
        this.animationBlock.push(animation);
        managerForDOMs.update(this.animationBlock);
        managerForDOMs.update(this.animationBlock.animationBlock);
        return animation;
    }

    deleteAnimation(animation) {
        let index = this.animationBlock.indexOf(animation);
        if (index != -1) {
            animation.destroy();
            this.animationBlock.splice(index,1);
        }
        managerForDOMs.update(this.animationBlock);
        managerForDOMs.update(this.animationBlock.animationBlock);
    }

    searchAnimation(animationName) {
        for (const animation of this.animationBlock) {
            if (animation.name == animationName) return animation;
        }
        return null;
    }

    setSaveData(data) {
        for (const keyData of data) {
            const animationData = keyData.transformData;
            const animation = new this.useClass(keyData.name, this.belongObject);
            animation.setAnimationData(animationData);
            this.animationBlock.push(animation);
        }
    }

    async getSaveData() {
        const animationsSaveData = [];
        await Promise.all(
            this.animationBlock.map(async (animation) => {
                animationsSaveData.push({name : animation.name,transformData: await animation.getSaveData()});
            })
        );
        return animationsSaveData;
    }
}

class AnimationBase {
    constructor(name, belongObject) {
        this.id = createID();
        this.name = name;
        this.index = belongObject.animationBlock.animationBlock.length;
        this.keyframeBlockManager = new KeyframeBlockManager(this, ["weight"]);

        this.weight = 0;

        this.belongObject = belongObject;
        this.belongAnimationCollector = null;
    }

    // gc対象にしてメモリ解放
    destroy() {
        this.weight = 0;
        this.belongAnimationCollector = null;
        this.belongObject = null;
    }
}

export class VerticesAnimation extends AnimationBase {
    constructor(name, belongObject) {
        super(name, belongObject);
        this.type = "頂点アニメーション";
    }

    async getSaveData() {
        return {
            transformData: [...await GPU.getF32BufferData(this.s_verticesAnimationBuffer)],
        }
    }

    setAnimationData(data) {
        let trueData;
        trueData = [];
        for (const index in data.transformData) {
            trueData.push(data.transformData[index])
        }

        this.isChange = true;
    }

    getWorldVerticesPositionBuffer() {
        const resultBuffer = GPU.copyBufferToNewBuffer(this.belongObject.s_baseVerticesPositionBuffer);
        // GPU.runComputeShader(adaptAllAnimationToVerticesPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw"), [{item: resultBuffer, type: "b"}]), GPU.createGroup(GPU.getGroupLayout("Csr_Cu"), [{item: this.s_verticesAnimationBuffer, type: 'b'}, {item: GPU.createUniformBuffer(4, [1], ["f32"]), type: 'b'}])], Math.ceil(this.belongObject.verticesNum / 64));
        return resultBuffer;
    }
}

export class BoneAnimation extends AnimationBase {
    constructor(name, belongObject) {
        super(name, belongObject);
        this.type = "ボーンアニメーション";
    }

    async getSaveData() {
        return {
            transformData: [...await GPU.getF32BufferData(this.s_verticesAnimationBuffer)],
        }
    }

    setAnimationData(data) {
        let trueData;
        trueData = [];
        for (const index in data.transformData) {
            trueData.push(data.transformData[index]);
        }
        this.s_verticesAnimationBuffer = GPU.createStorageBuffer(trueData.length * 4, trueData, ["f32","f32"]);
    }

    getWorldVerticesMatrixBuffer() {
        return GPU.copyBufferToNewBuffer(this.belongObject.boneMatrixBuffer);
    }
}