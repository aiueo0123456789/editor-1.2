import { createEdgeFromTexture, createMeshFromTexture, cutSilhouetteOutTriangle } from "../../utils/objects/graphicMesh/createMesh/createMesh.js";
import { BoundingBox, ObjectBase, ObjectEditorBase, sharedDestroy, UnfixedReference } from "../../utils/objects/util.js";
import { arrayToArrayCopy, arrayToPush, changeParameter, indexOfSplice, IsString, waitUntilFrame } from "../../utils/utility.js";
import { vec2 } from "../../utils/mathVec.js";
import { GPU } from "../../utils/webGPU.js";
import { AnimationBlock, VerticesAnimation } from "./animation.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { app } from "../../../main.js";
import { Texture } from "./texture.js";
import { MaskTexture } from "./maskTexture.js";

class Vertex {
    constructor(/** @type {GraphicMesh} */ graphicMesh, data) {
        if (!data.parentWeight) data.parentWeight = {indexs: [0,0,0,0], weights: [1,0,0,0]};
        this.type = "頂点";
        this.selected = false;
        this.graphicMesh = graphicMesh;
        this.base = [...data.base];
        this.uv = [...data.uv];
        this.parentWeight = data.parentWeight;
        this.updated = true;
    }

    get localIndex() {
        return this.graphicMesh.allVertices.indexOf(this);
    }

    get worldIndex() {
        return this.graphicMesh.runtimeOffsetData.vertexOffset + this.localIndex;
    }

    getSaveData() {
        return {
            index: this.localIndex,
            base: this.base,
            uv: this.uv,
            parentWeight: this.parentWeight,
        };
    }
}

class Mesh {
    constructor(/** @type {GraphicMesh} */ graphicMesh, index = graphicMesh.allMeshes.length, indexs) {
        this.type == "メッシュ"
        this.graphicMesh = graphicMesh;
        this.index = index;
        this.indexs = [...indexs];
        graphicMesh.allMeshes.push(this);
    }

    getSaveData() {
        return {
            index: this.index,
            indexs: this.indexs,
        };
    }
}

class Editor extends ObjectEditorBase {
    constructor(graphicMesh) {
        super();
        this.baseEdges = [];
        this.baseSilhouetteEdges = [];
        this.graphicMesh = graphicMesh;
        this.imageBBox = new BoundingBox();
        this.imageBBoxBuffer = GPU.createUniformBuffer(2 * 4 + 2 * 4, undefined, ["f32"]);

        this.baseSilhouetteEdgesBuffer = GPU.createStorageBuffer(2 * 4, new Uint32Array([0,0]), ["u32"]);
        this.baseEdgesBuffer = GPU.createStorageBuffer(2 * 4, new Uint32Array([0,0]), ["u32"]);
        this.outlineVertices = [];
        this.outlineEdges = [];

        this.updateEdgeGPU = () => {
            if (this.baseSilhouetteEdges.length == 0) {
                this.baseSilhouetteEdgesBuffer = GPU.createStorageBuffer(2 * 4, new Uint32Array([0,0]), ["u32"]);
            } else {
                this.baseSilhouetteEdgesBuffer = GPU.createStorageBuffer(this.baseSilhouetteEdges.length * 2 * 4, new Uint32Array(this.baseSilhouetteEdges.flat()), ["u32", "u32"]);
            }
            if (this.baseEdges.length == 0) {
                this.baseEdgesBuffer = GPU.createStorageBuffer(2 * 4, new Uint32Array([0,0]), ["u32"]);
            } else {
                this.baseEdgesBuffer = GPU.createStorageBuffer(this.baseEdges.length * 2 * 4, new Uint32Array(this.baseEdges.flat()), ["u32", "u32"]);
            }
            this.graphicMesh.objectMeshDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Vsr_Vsr"), [this.graphicMesh.objectMeshData, this.baseSilhouetteEdgesBuffer,  this.baseEdgesBuffer]);
        }

        managerForDOMs.set({o: this.baseEdges, i: "&all"}, null, this.updateEdgeGPU);
        managerForDOMs.set({o: this.baseSilhouetteEdges, i: "&all"}, null, this.updateEdgeGPU);
    }

    get baseEdgesNum() {
        return this.baseEdges.length;
    }

    get baseSilhouetteEdgesNum() {
        return this.baseSilhouetteEdges.length;
    }

    destroy() {
        this.graphicMesh = null;
    }

    setImageBBox(bbox) {
        // this.imageBBox = bbox;
        this.imageBBox.set(bbox);
        GPU.writeBuffer(this.imageBBoxBuffer, new Float32Array([...this.imageBBox.min,...this.imageBBox.max]));
    }

    getSaveData() {
        return {
            baseSilhouetteEdges: this.baseSilhouetteEdges,
            baseEdges: this.baseEdges,
            imageBBox: this.imageBBox,
        };
    }

    setSaveData(data) {
        arrayToArrayCopy(this.baseEdges, data.baseEdges);
        arrayToArrayCopy(this.baseSilhouetteEdges, data.baseSilhouetteEdges);
        this.updateEdgeGPU();
        this.setImageBBox(data.imageBBox);
    }

    setBaseSilhouetteEdges(edges) {
        arrayToArrayCopy(this.baseSilhouetteEdges, edges);
        this.updateEdgeGPU();
    }

    async createEdgeFromTexture(pixelDensity, scale) {
        const result = await createEdgeFromTexture(this.graphicMesh.texture, pixelDensity, scale);
        result.vertices = this.calculateLocalVerticesToWorldVertices(result.vertices);
        this.graphicMesh.allVertices.length = 0;
        for (let i = 0; i < result.vertices.length; i ++) {
            this.graphicMesh.allVertices.push(new Vertex(this.graphicMesh, {base: result.vertices[i], uv: result.uv[i]}));
        }
        this.graphicMesh.runtimeData.updateBaseData(this.graphicMesh);
        this.setBaseSilhouetteEdges(result.edges);
        this.createMesh();
        app.options.assignWeights(this.graphicMesh);
    }

    async createMesh() {
        await waitUntilFrame(() => {return !this.graphicMesh.runtimeData.write});
        const vertices = this.graphicMesh.allVertices.map(vertex => vertex.base);
        const meshData = cutSilhouetteOutTriangle(vertices, createMeshFromTexture(vertices, this.baseEdges.concat(this.baseSilhouetteEdges)), this.baseSilhouetteEdges); // メッシュの作成とシルエットの外の三角形を削除
        // const meshData = createMeshFromTexture(vertices, this.baseEdges); // メッシュの作成とシルエットの外の三角形を削除
        this.graphicMesh.allMeshes.length = 0;
        for (let i = 0; i < meshData.length; i ++) {
            new Mesh(this.graphicMesh,undefined, meshData[i]);
        }
        this.graphicMesh.runtimeData.updateBaseData(this.graphicMesh);
        this.updateEdgeGPU();
    }

    deleteBaseVertices(indexs) {
        for (const index of indexs) {
            for (let i = this.baseEdges.length - 1; i >= 0; i --) {
                if (this.baseEdges[i].includes(index)) {
                    this.baseEdges.splice(i, 1);
                } else {
                    for (let j = 0; j < 2; j ++) {
                        if (this.baseEdges[i][j] > index) this.baseEdges[i][j] --;
                    }
                }
            }
            for (let i = this.baseSilhouetteEdges.length - 1; i >= 0; i --) {
                if (this.baseSilhouetteEdges[i].includes(index)) {
                    this.baseSilhouetteEdges.splice(i, 1);
                } else {
                    for (let j = 0; j < 2; j ++) {
                        if (this.baseSilhouetteEdges[i][j] > index) this.baseSilhouetteEdges[i][j] --;
                    }
                }
            }
        }
        managerForDOMs.update(this.baseSilhouetteEdges);
        // managerForDOMs.update(this.baseEdges);
    }

    hasEdge(edge) {
        for (const edge_ of this.baseEdges) {
            if (
                edge[0] == edge_[0] && edge[1] == edge_[1] ||
                edge[0] == edge_[1] && edge[1] == edge_[0]
            ) {
                return true;
            }
        }
        return false;
    }

    appendBaseEdge(edge) {
        if (this.hasEdge(edge)) return ;
        arrayToPush(this.baseEdges, edge);
        this.createMesh();
    }

    deleteBaseEdge(edge) {
        for (let i = 0; i < this.baseEdges.length; i ++) {
            const edge_ = this.baseEdges[i];
            if (
                edge[0] == edge_[0] && edge[1] == edge_[1] ||
                edge[0] == edge_[1] && edge[1] == edge_[0]
            ) {
                this.baseEdges.splice(i, 1);
            }
        }
        this.createMesh();
        managerForDOMs.update(this.baseEdges);
    }

    // 頂点たちからUV
    calculateVerticesToUV(vertices, axisType = "world") {
        if (axisType == "world") {
            return vertices.map((position) => this.calculatWorldPositionToUV(position));
        } else {
            return vertices.map((position) => this.calculatLocalPositionToUV(position));
        }
    }
    // ローカルポジションからUV
    calculatLocalPositionToUV(position) {
        const a = vec2.mulR(vec2.addR(position, [this.imageBBox.width / 2, this.imageBBox.height / 2]), [1 / this.imageBBox.width, 1 / this.imageBBox.height]);
        return [a[0], 1 - a[1]];
    }
    // ワールドポジションからUV
    calculatWorldPositionToUV(position) {
        const a = vec2.mulR(vec2.subR(position, this.imageBBox.min), [1 / this.imageBBox.width, 1 / this.imageBBox.height]);
        return [a[0], 1 - a[1]];
    }

    // ローカルポジションの頂点たちからワールドポジション
    calculateLocalVerticesToWorldVertices(vertices) {
        return vertices.map((vertex) => this.calculateLocalPositionToWorldPosition(vertex));
    }
    // ローカルポジションからワールドポジション
    calculateLocalPositionToWorldPosition(position) {
        // return vec2.addR(position, this.BBox.center);
        return vec2.addR(position, this.imageBBox.center);
    }

    createVertex(coordinate) {
        return new Vertex(this.graphicMesh, {base: coordinate, uv: this.calculatWorldPositionToUV(coordinate), parentWeight: {indexs: [0,0,0,0], weights: [1,0,0,0]}});
    }

    appendVertex(vertex) {
        this.graphicMesh.allVertices.push(vertex);
        this.createMesh();
        this.graphicMesh.runtimeData.updateBaseData(this.graphicMesh);
    }

    deleteVertex(vertex) {
        indexOfSplice(this.graphicMesh.allVertices, vertex)
        this.createMesh();
        this.graphicMesh.runtimeData.updateBaseData(this.graphicMesh);
    }
}

export class GraphicMesh extends ObjectBase {
    static VERTEX_LEVEL = 1; // 小オブジェクトごとに何個の頂点を持つか
    constructor(data) {
        super(data.name, "グラフィックメッシュ", data.id);
        this.runtimeData = app.scene.runtimeData.graphicMeshData;

        this.MAX_VERTICES = app.appConfig.MAX_VERTICES_PER_GRAPHICMESH;
        this.MAX_ANIMATIONS = app.appConfig.MAX_ANIMATIONS_PER_GRAPHICMESH;
        this.MAX_MESHES = app.appConfig.MAX_MESHES_PER_GRAPHICMESH;

        this.baseTransformIsLock = false;
        this.visible = true;
        this.zIndex = 0;
        this.zIndexBuffer = GPU.createUniformBuffer(4, [this.zIndex], ["f32"]);
        this.delete = false;

        this.autoWeight = true;

        this.editRock = false;

        // バッファの宣言
        this.modifierType = 0;

        /** @type {Texture} */
        this.texture = null;

        // その他
        this.animationBlock = new AnimationBlock(this, VerticesAnimation);

        /** @type {Vertex[]} */
        this.allVertices = [];

        /** @type {Mesh[]} */
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

        this.editor = new Editor(this);
        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectMeshData = GPU.createUniformBuffer(4 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);
        this.objectMeshDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Vsr_Vsr"), [this.objectMeshData, this.editor.baseSilhouetteEdgesBuffer, this.editor.baseEdgesBuffer]);
        this.init(data);

        managerForDOMs.set({o: this, i: "zIndex"}, null, () => {
            GPU.writeBuffer(this.zIndexBuffer, new Float32Array([1 / (this.zIndex + 1)]));
        })
    }

    get hasAllData() {
        return this.texture instanceof Texture && this.objectDataBuffer instanceof GPUBuffer && this.zIndexBuffer instanceof GPUBuffer && this.maskTypeBuffer instanceof GPUBuffer && this.maskTypeBuffer instanceof MaskTexture;
    }

    resolvePhase() {
        if (this.parent instanceof UnfixedReference) {
            this.changeParent(this.parent.getObject());
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

    get animationWorldOffset() {
        return this.animationBufferOffset * GraphicMesh.VERTEX_LEVEL;
    }

    get verticesNum() {
        return this.allVertices.length;
    }
    get meshesNum() {
        return this.allMeshes.length;
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

        // その他
        this.animationBlock = null;

        this.parent = "";
    }

    init(data) {
        this.changeParent(app.scene.objects.getObjectFromID(data.parent));
        this.zIndex = data.zIndex;
        GPU.writeBuffer(this.zIndexBuffer, new Float32Array([1 / (this.zIndex + 1)]));
        this.autoWeight = data.autoWeight ? data.autoWeight : true;

        for (const vertex of data.vertices) {
            this.allVertices.push(new Vertex(this, vertex));
        }
        for (const mesh of data.meshes) {
            new Mesh(this, undefined, mesh.indexs);
        }
        if (data.animationKeyDatas) {
            data.animationKeyDatas.forEach((keyData,index) => {
                const animationData = keyData.transformData.transformData;
                this.runtimeData.setAnimationData(this, animationData, index);
            })
            this.animationBlock.setSaveData(data.animationKeyDatas);
        }
        this.changeTexture(app.scene.objects.getObjectFromID(data.texture));

        if (data.renderingTarget) {
            this.changeRenderingTarget(app.scene.objects.getObjectFromID(data.renderingTarget));
        }
        if (data.clippingMask) {
            this.changeClippingMask(app.scene.objects.getObjectFromID(data.clippingMask));
        } else {
            this.changeClippingMask(app.scene.objects.getObjectFromID("baseMaskTexture"));
        }

        if (data.editor) {
            this.editor.setSaveData(data.editor);
        }
        this.isInit = true;
        this.isChange = true;
        this.setGroup();
    }

    changeTexture(texture) {
        if (this.texture instanceof Texture) this.texture.deleteReferenc(this);
        changeParameter(this, "texture", texture);
        this.texture.appendReferenc(this);
        this.setGroup();
    }

    changeClippingMask(target) {
        if (this.clippingMask) {
            managerForDOMs.deleteDataBlockFromObjectAndID(this.clippingMask, "view", this.managerForDOMs_clippingMask_view_dataBlock);
        }
        this.clippingMask = target;
        const updateGroup = () => {
            // this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Vu_Ft_Ft_Fu"), [this.objectDataBuffer, this.zIndexBuffer, this.texture.view, this.clippingMask.view, this.maskTypeBuffer]);
            this.setGroup();
        }
        updateGroup();
        this.managerForDOMs_clippingMask_view_dataBlock = managerForDOMs.set({o: this.clippingMask, i: "view"}, null, updateGroup);
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
        const animationKeyDatas = await this.animationBlock.getSaveData()
        return {
            name: this.name,
            id: this.id,
            type: this.type,
            parent: this.parent ? this.parent.id : null,
            autoWeight: this.autoWeight,
            baseTransformIsLock: this.baseTransformIsLock,
            zIndex: this.zIndex,
            vertices: this.allVertices.map(vertex => vertex.getSaveData()),
            meshes: this.allMeshes.map(mesh => mesh.getSaveData()),
            animationKeyDatas: animationKeyDatas,
            // texture: await GPU.textureToBase64(this.texture),
            texture: this.texture.id,
            renderingTarget: this.renderingTarget ? this.renderingTarget.id : null,
            clippingMask: this.clippingMask.id,
            editor: this.editor.getSaveData(),
        };
    }
}