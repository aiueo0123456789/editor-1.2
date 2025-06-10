import { app } from "../../../app.js";
import { loadFile } from "../../../utility.js";
import { GPU } from "../../../webGPU.js";

// const pipelines = {
//     graphicMesh: {rotate: },
// };

const createInitDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr"), GPU.getGroupLayout("Cu_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/init.wgsl"));

const updateForUVPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/updateForUV.wgsl"));

const createOriginalPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr")], await loadFile("./script/js/機能/オペレーター/変形/GPU/createOriginal.wgsl"));
const setOriginalPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr")], await loadFile("./script/js/機能/オペレーター/変形/GPU/setOriginal.wgsl"));

const verticesTranslatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/vertices/translate.wgsl"));
const verticesResizePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/vertices/resize.wgsl"));
const verticesRotatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/vertices/rotate.wgsl"));

const boneAnimationTranslatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/boneAnimation/translate.wgsl"));
const boneAnimationRotatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/boneAnimation/rotate.wgsl"));
const boneAnimationResizePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu")], await loadFile("./script/js/機能/オペレーター/変形/GPU/boneAnimation/resize.wgsl"));

class TransformCommand {
    constructor(targets, selectIndexs) {
        this.targets = [];
        this.worldOriginalBuffer = null;
        this.valueBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32"]);
        this.centerPointBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32","f32"]);
        this.proportionalEditTypeBuffer = GPU.createUniformBuffer(4, undefined, ["u32"]);
        this.proportionalSizeBuffer = GPU.createUniformBuffer(4, undefined, ["f32"]);
        this.configGroup = GPU.createGroup(GPU.getGroupLayout("Cu_Cu_Cu"), [{item: this.proportionalEditTypeBuffer, type: "b"}, {item: this.proportionalSizeBuffer, type: "b"}, {item: this.centerPointBuffer, type: "b"}]);

        this.value = [0,0];
        this.proportionalEditType = 0;
        this.proportionalSize = 0;

        this.targets = targets;
        this.type = targets[0].type;
        const source = this.type == "グラフィックメッシュ" ? app.scene.gpuData.graphicMeshData : this.type == "ボーンモディファイア" ? app.scene.gpuData.boneModifierData : app.scene.gpuData.bezierModifierData;
        const groupNum = this.type == "グラフィックメッシュ" ? 1 : this.type == "ボーンモディファイア" ? 2 : 3;
        if (this.type == "ボーンアニメーション") {
            let minDepthIndex = [];
            let minDepth = Infinity;
            for (let index of selectIndexs) {
                const depth = targets.belongObject.editor.getBoneDepthFromIndex(index);
                console.log(depth)
                if (depth < minDepth) {
                    minDepth = depth;
                    minDepthIndex = [index];
                } else if (depth == minDepth) {
                    minDepthIndex.push(index);
                }
            }
            if (minDepthIndex.length) {
                const selectIndexBuffer = GPU.createStorageBuffer(minDepthIndex.length * 4, minDepthIndex, ["u32"]);
                this.selectIndexs = minDepthIndex;
                this.targetBuffer = targets.s_verticesAnimationBuffer;
                this.worldOriginalBuffer = GPU.copyBufferToNewBuffer(targets.s_verticesAnimationBuffer); // ターゲットの頂点のワールド座標を取得
                this.transformGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu"),  [{item: this.targetBuffer, type: "b"}, {item: this.worldOriginalBuffer, type: "b"}, {item: targets.getWorldVerticesMatrixBuffer(), type: "b"}, {item: targets.belongObject.parentsBuffer, type: "b"}, {item: selectIndexBuffer, type: "b"}, {item: this.valueBuffer, type: "b"}]);
                this.workNumX = Math.ceil(this.targets.belongObject.boneNum / 64);
                this.originalBuffer = GPU.copyBufferToNewBuffer(this.targetBuffer); // ターゲットのオリジナル状態を保持
            } else {
                this.workNumX = 0;
            }
        } else {
            const selectIndexBuffer = GPU.createStorageBuffer(selectIndexs.length * 4, selectIndexs, ["u32"]);
            if (this.type == "頂点アニメーション") {
                this.worldOriginalBuffer = targets.getWorldVerticesPositionBuffer(); // ターゲットの頂点のワールド座標を取得
                this.targetBuffer = targets.s_verticesAnimationBuffer;
                this.baseBuffer = targets.belongObject.s_baseVerticesPositionBuffer; // 頂点の基準
                this.workNumX = Math.ceil(this.targets.belongObject.verticesNum / 64);
                this.weightBuffer = GPU.createStorageBuffer(this.targets.belongObject.verticesNum * 4, undefined, ["f32"]);
            } else {
                const subjectIndex = [];
                for (const target of targets) {
                    for (let i = target.vertexBufferOffset * groupNum; i < target.verticesNum + (target.vertexBufferOffset) * groupNum; i ++) {
                        subjectIndex.push(i);
                    }
                }
                this.subjectIndexBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, subjectIndex, ["u32"]);
                this.worldOriginalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットの頂点のワールド座標を取得
                this.workNumX = Math.ceil(subjectIndex.length / 64);
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.worldOriginalBuffer, source.baseVertices, this.subjectIndexBuffer])], this.workNumX);
                this.targetBuffer = source.baseVertices;
                this.baseBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4, undefined, ["f32"]); // 頂点の基準
                this.weightBuffer = GPU.createStorageBuffer(subjectIndex.length * 4, undefined, ["f32"]);
                this.originalBuffer = GPU.createStorageBuffer(subjectIndex.length * 2 * 4); // ターゲットのオリジナル状態を保持(undoで使用する値)
                GPU.runComputeShader(createOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.originalBuffer, source.baseVertices, this.subjectIndexBuffer])], this.workNumX);
            }
            this.weightAndIndexsGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr"),  [{item: this.weightBuffer, type: "b"}, {item: selectIndexBuffer, type: "b"}, {item: this.worldOriginalBuffer, type: "b"}, {item: this.subjectIndexBuffer, type: "b"}]);
            this.transformGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Csr_Csr_Cu_Cu"),  [{item: this.targetBuffer, type: "b"}, {item: this.worldOriginalBuffer, type: "b"}, {item: this.baseBuffer, type: "b"}, {item: this.weightBuffer, type: "b"}, {item: this.subjectIndexBuffer, type: "b"}, {item: this.centerPointBuffer, type: "b"}, {item: this.valueBuffer, type: "b"}]);
        }
    }

    setCenterPoint(centerPoint) {
        GPU.writeBuffer(this.centerPointBuffer, new Float32Array(centerPoint));
    }

    transform(pipeline) {
        GPU.writeBuffer(this.valueBuffer, new Float32Array(this.value));
        if (!this.workNumX) {
            return ;
        }
        if (this.type == "ボーンアニメーション") {
            GPU.runComputeShader(pipeline, [this.transformGroup], this.workNumX);
            this.targets.belongObject.isChange = true;
        } else {
            GPU.writeBuffer(this.proportionalEditTypeBuffer, new Uint32Array([this.proportionalEditType]));
            GPU.writeBuffer(this.proportionalSizeBuffer, new Float32Array([this.proportionalSize]));
            GPU.runComputeShader(createInitDataPipeline,[this.weightAndIndexsGroup, this.configGroup], this.workNumX);

            GPU.runComputeShader(pipeline, [this.transformGroup], this.workNumX);
            if (this.type == "ボーンモディファイア") {
                for (const target of this.targets) {
                    app.scene.gpuData.boneModifierData.calculateBaseBoneData(target);
                }
            } else if (this.type == "グラフィックメッシュ") {
                for (const target of this.targets) {
                    GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.gpuData.graphicMeshData.uv,app.scene.gpuData.graphicMeshData.baseVertices,target.editor.imageBBoxBuffer, target.objectDataBuffer])],this.workNumX);
                    target.editor.createMesh();
                }
            }
            if (this.type == "頂点アニメーション") {
                this.targets.belongObject.isChange = true;
            } else {
                // this.targets.children?.weightReset();
                // setBaseBBox(this.targets);
                // setParentModifierWeight(this.targets);
                this.targets.isChange = true;
            }
        }
    }

    // 変形を取り消し
    cancel() {
        GPU.runComputeShader(setOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.targetBuffer, this.originalBuffer, this.subjectIndexBuffer])], this.workNumX);
        this.targets.isChange = true;
        if (this.type == "ボーンモディファイア") {
            for (const target of this.targets) {
                app.scene.gpuData.boneModifierData.calculateBaseBoneData(target);
            }
        } else if (this.type == "グラフィックメッシュ") {
            for (const target of this.targets) {
                GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.gpuData.graphicMeshData.uv,app.scene.gpuData.graphicMeshData.baseVertices,target.editor.imageBBoxBuffer, target.objectDataBuffer])],this.workNumX);
                target.editor.createMesh(true);
            }
        }
    }

    undo() {
        console.log("巻き戻し")
        GPU.runComputeShader(setOriginalPipeline, [GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr"), [this.targetBuffer, this.originalBuffer, this.subjectIndexBuffer])], this.workNumX);
        this.targets.isChange = true;
        if (this.type == "ボーンモディファイア") {
            for (const target of this.targets) {
                app.scene.gpuData.boneModifierData.calculateBaseBoneData(target);
            }
        } else if (this.type == "グラフィックメッシュ") {
            for (const target of this.targets) {
                GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.gpuData.graphicMeshData.uv,app.scene.gpuData.graphicMeshData.baseVertices,target.editor.imageBBoxBuffer, target.objectDataBuffer])],this.workNumX);
                target.editor.createMesh(true);
            }
        }
    }

    redo() {
        console.log("巻き戻しの取り消し",data)
        const object = data.object;
        GPU.copyBuffer(data.undo, data.target);
        object.isChange = true;
        if (object.type == "ボーンモディファイア") {
            for (const target of this.targets) {
                app.scene.gpuData.boneModifierData.calculateBaseBoneData(target);
            }
        } else if (object.type == "グラフィックメッシュ") {
            for (const target of this.targets) {
                GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.gpuData.graphicMeshData.uv,app.scene.gpuData.graphicMeshData.baseVertices,target.editor.imageBBoxBuffer, target.objectDataBuffer])],this.workNumX);
                target.editor.createMesh(true);
            }
        }
        // GPU.copyBuffer(this.originalBuffer, this.targetBuffer);
        // this.targets.isChange = true;
        // if (this.type == "ボーンモディファイア") {
        //     for (const target of this.targets) {
        //         app.scene.gpuData.boneModifierData.calculateBaseBoneData(target);
        //     }
        // } else if (this.type == "グラフィックメッシュ") {
        //     for (const target of this.targets) {
        //         GPU.runComputeShader(updateForUVPipeline,[GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Cu"), [app.scene.gpuData.graphicMeshData.uv,app.scene.gpuData.graphicMeshData.baseVertices,target.editor.imageBBoxBuffer, target.objectDataBuffer])],this.workNumX);
        //         target.editor.createMesh(true);
        //     }
        // }
    }
}

export class TranslateCommand extends TransformCommand {
    constructor(targets, selectIndexs) {
        super(targets, selectIndexs);
        this.value = [];
        this.proportionalEditType = 0;
        this.proportionalSize = 0;
    }

    update(value, orientType, proportionalEditType, proportionalSize) {
        this.value = [...value];
        this.proportionalEditType = proportionalEditType;
        this.proportionalSize = proportionalSize;
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        if (this.type == "ボーンアニメーション") {
            this.transform(boneAnimationTranslatePipeline);
        } else {
            this.transform(verticesTranslatePipeline);
        }
    }

    execute() {
        if (this.type == "ボーンアニメーション") {
            this.transform(boneAnimationTranslatePipeline);
        } else {
            this.transform(verticesTranslatePipeline);
        }
    }
}

export class ResizeCommand extends TransformCommand {
    constructor(target, selectIndexs) {
        super(target, selectIndexs);
    }

    update(value, orientType, proportionalEditType, proportionalSize) {
        this.value = [...value];
        this.proportionalEditType = proportionalEditType;
        this.proportionalSize = proportionalSize;
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        if (this.type == "ボーンアニメーション") {
            this.transform(boneAnimationResizePipeline);
        } else {
            this.transform(verticesResizePipeline);
        }
    }

    execute() {
        if (this.type == "ボーンアニメーション") {
            this.transform(boneAnimationResizePipeline);
        } else {
            this.transform(verticesResizePipeline);
        }
    }
}

export class RotateCommand extends TransformCommand {
    constructor(target, selectIndexs) {
        super(target, selectIndexs);
    }

    update(value, orientType, proportionalEditType, proportionalSize) {
        this.value[0] = value;
        this.proportionalEditType = proportionalEditType;
        this.proportionalSize = proportionalSize;
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        if (this.type == "ボーンアニメーション") {
            this.transform(boneAnimationRotatePipeline);
        } else {
            this.transform(verticesRotatePipeline);
        }
    }

    execute() {
        if (this.type == "ボーンアニメーション") {
            this.transform(boneAnimationRotatePipeline);
        } else {
            this.transform(verticesRotatePipeline);
        }
    }
}