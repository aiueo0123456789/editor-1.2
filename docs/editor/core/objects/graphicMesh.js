import { ObjectBase, sharedDestroy, UnfixedReference } from "../../utils/objects/util.js";
import { changeParameter, copyToArray, range } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { app } from "../../../main.js";
import { Texture } from "./texture.js";
import { MaskTexture } from "./maskTexture.js";
import { ShapeKeyMetaData } from "./blendShape.js";

export class GraphicMesh extends ObjectBase {
    createShapeKeyMetaData(name, index, id = undefined) {
        return new ShapeKeyMetaData({name: name, index: index, object: this, id: id});
    }
    constructor(data) {
        super(data.name, "グラフィックメッシュ", data.id);
        this.runtimeData = app.scene.runtimeData.graphicMeshData;

        this.baseTransformIsLock = false;
        this.visible = true;
        this.zIndex = 0;
        this.zIndexBuffer = GPU.createUniformBuffer(4, [this.zIndex], ["f32"]);
        this.delete = false;

        this.editRock = false;

        // バッファの宣言
        this.modifierType = 0;

        /** @type {Texture} */
        this.texture = null;

        /** @type {ShapeKeyMetaData[]} */
        this.shapeKeyMetaDatas = [];

        this.allVertices = [];
        this.allShapeKeys = []; // 変形データ
        this.allShapeKeyWeights = []; // 重み
        this.allUVs = [];
        this.allWeightBlocks = [];
        this.allMeshes = [];

        this.baseEdges = [];
        this.baseSilhouetteEdges = [];

        /** @type {MaskTexture} */
        this.renderingTarget = null;
        /** @type {MaskTexture} */
        this.clippingMask = null;
        // this.changeClippingMask(app.scene.searchMaskTextureFromName("base"));
        this.maskTypeBuffer = GPU.createUniformBuffer(4, undefined, ["f32"]);
        GPU.writeBuffer(this.maskTypeBuffer, new Float32Array([0])); // 0　マスク 反転マスク

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectMeshData = GPU.createUniformBuffer(4 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);

        this.autoWeight = "autoWeight" in data ? data.autoWeight : true;
        this.changeParent(app.scene.objects.getObjectFromID(data.parent));
        this.zIndex = data.zIndex;
        GPU.writeBuffer(this.zIndexBuffer, new Float32Array([1 / (this.zIndex + 1)]));
        copyToArray(this.allVertices, data.vertices.flat());
        copyToArray(this.allUVs, data.uv.flat());
        copyToArray(this.allMeshes, data.meshes.flat());
        copyToArray(this.allWeightBlocks, data.weightBlocks.flat());
        copyToArray(this.shapeKeyMetaDatas, data.shapeKeyMetaDatas.map(shapeKeyMetaData => this.createShapeKeyMetaData(shapeKeyMetaData.name, shapeKeyMetaData.index, shapeKeyMetaData.id)));
        copyToArray(this.allShapeKeys, data.shapeKeys.flat());
        this.changeTexture(app.scene.objects.getObjectFromID(data.texture));
        if (data.renderingTarget) {
            this.changeRenderingTarget(app.scene.objects.getObjectFromID(data.renderingTarget));
        }
        if (data.clippingMask) {
            this.changeClippingMask(app.scene.objects.getObjectFromID(data.clippingMask));
        } else {
            this.changeClippingMask(app.scene.objects.getObjectFromID("baseMaskTexture"));
        }
        this.setGroup();

        managerForDOMs.set({o: this, i: "zIndex"}, () => {
            GPU.writeBuffer(this.zIndexBuffer, new Float32Array([1 / (this.zIndex + 1)]));
        })
    }

    update() {
        this.blendShapes.forEach(blendShape => {
            blendShape.update();
        })
    }

    get shapeKeysNum() {
        return this.shapeKeyMetaDatas.length;
    }

    get hasAllData() {
        return this.texture instanceof Texture && this.objectDataBuffer instanceof GPUBuffer && this.zIndexBuffer instanceof GPUBuffer && this.maskTypeBuffer instanceof GPUBuffer && this.clippingMask instanceof MaskTexture;
    }

    resolvePhase() {
        if (this.parent instanceof UnfixedReference) {
            this.changeParent(this.parent.getObject());
            this.setGroup();
        }
        if (this.texture instanceof UnfixedReference) {
            this.changeTexture(this.texture.getObject());
        }
        if (this.renderingTarget instanceof UnfixedReference) {
            this.changeRenderingTarget(this.renderingTarget.getObject());
        }
        if (this.clippingMask instanceof UnfixedReference) {
            this.changeClippingMask(this.clippingMask.getObject());
        }
    }

    // 頂点のworldIndexs
    get VWs() {
        return range(this.runtimeOffsetData.start.verticesOffset, this.runtimeOffsetData.end.verticesOffset);
    }

    get verticesNum() {
        return this.allVertices.length / 2;
    }
    get meshesNum() {
        return this.allMeshes.length / 3;
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
        this.delete = true;
        this.name = null;
        this.type = null;
        this.baseTransformIsLock = null;
        this.visible = null;
        this.zIndex = null;
        // ブッファの宣言
        this.texture = null;

        this.parent = "";
    }

    init(data) {
    }

    changeTexture(texture) {
        if (this.texture instanceof Texture) this.texture.deleteReferenc(this);
        changeParameter(this, "texture", texture);
        this.texture.appendReferenc(this);
        this.setGroup();
    }

    changeClippingMask(target) {
        if (this.clippingMask) {
            // managerForDOMs.deleteData(this.clippingMask, "view", this.managerForDOMs_clippingMask_view_dataBlock);
            managerForDOMs.deleteDataBlock(this.managerForDOMs_clippingMask_view_dataBlock);
        }
        this.clippingMask = target;
        const updateGroup = () => {
            // this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Vu_Ft_Ft_Fu"), [this.objectDataBuffer, this.zIndexBuffer, this.texture.view, this.clippingMask.view, this.maskTypeBuffer]);
            this.setGroup();
        }
        updateGroup();
        this.managerForDOMs_clippingMask_view_dataBlock = managerForDOMs.set({o: this.clippingMask, i: "view"}, updateGroup);
    }

    changeRenderingTarget(target) {
        this.renderingTarget = target;
    }

    setGroup() {
        if (!this.hasAllData) return ;
        this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Vu_Ft_Ft_Fu"), [this.objectDataBuffer, this.zIndexBuffer, this.texture.view, this.clippingMask.view, this.maskTypeBuffer]);
        this.maskRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Ft"), [this.objectDataBuffer, this.texture.view]);
    }

    async getSaveData() {
        return {
            name: this.name,
            id: this.id,
            parent: this.parent ? this.parent.id : null,
            type: this.type,
            autoWeight: this.autoWeight,
            baseTransformIsLock: this.baseTransformIsLock,
            zIndex: this.zIndex,
            vertices: await this.runtimeData.baseVertices.getObjectData(this),
            uv: await this.runtimeData.uv.getObjectData(this),
            weightBlocks: await this.runtimeData.weightBlocks.getObjectData(this),
            meshes: await this.runtimeData.meshes.getObjectData(this),
            shapeKeys: await this.runtimeData.shapeKeys.getObjectData(this),
            shapeKeyMetaDatas: this.shapeKeyMetaDatas.map(shapeKeyMetaData => shapeKeyMetaData.getSaveData()),
            texture: this.texture.id,
            renderingTarget: this.renderingTarget ? this.renderingTarget.id : null,
            clippingMask: this.clippingMask.id,
        };
    }
}