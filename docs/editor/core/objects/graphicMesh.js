import { createEdgeFromTexture, createMeshFromTexture, cutSilhouetteOutTriangle } from "../../utils/objects/graphicMesh/メッシュの自動生成/画像からメッシュを作る.js";
import { BoundingBox, ObjectBase, ObjectEditorBase, sharedDestroy } from "../../utils/objects/util.js";
import { indexOfSplice, waitUntilFrame } from "../../utils/utility.js";
import { vec2 } from "../../utils/mathVec.js";
import { app } from "../../app/app.js";
import { GPU } from "../../utils/webGPU.js";
import { AnimationBlock, VerticesAnimation } from "./animation.js";
import { isNotTexture } from "../../utils/GPUObject.js";

class Vertex {
    constructor(/** @type {GraphicMesh} */ graphicMesh, data) {
        if (!data.index) {
            data.index = graphicMesh.allVertices.length;
        }
        if (!data.parentWeight) {
            data.parentWeight = {indexs: [0,0,0,0], weights: [1,0,0,0]}
        }
        this.type = "頂点";
        this.index = data.index;
        this.selected = false;
        this.graphicMesh = graphicMesh;
        this.base = [...data.base];
        this.uv = [...data.uv];
        let maxIndex = -1;
        for (let i = 0; i < 4; i ++) {
            if (data.parentWeight.weights[i] > 0.85) {
                maxIndex = i;
            }
        }
        if (maxIndex != -1) {
            for (let i = 0; i < 4; i ++) {
                if (maxIndex == i) {
                    data.parentWeight.weights[i] = 1;
                } else {
                    data.parentWeight.weights[i] = 0;
                }
            }
        }
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
            index: this.index,
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
        this.baseVertices = [];
        this.baseEdges = [];
        this.baseSilhouetteEdges = [];
        this.graphicMesh = graphicMesh;
        this.imageBBox = new BoundingBox();
        this.imageBBoxBuffer = GPU.createUniformBuffer(2 * 4 + 2 * 4, undefined, ["f32"]);

        this.baseSilhouetteEdgesBuffer = GPU.createStorageBuffer(2 * 4, new Uint32Array([0,0]), ["u32"]);
        this.baseEdgesBuffer = GPU.createStorageBuffer(2 * 4, new Uint32Array([0,0]), ["u32"]);
        this.outlineVertices = [];
        this.outlineEdges = [];
        this.layerParent = "";

        this.lastCreateMeshTime = Date.now();
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

    updateEdgeGPU() {
        this.baseSilhouetteEdgesBuffer = GPU.createStorageBuffer(this.baseSilhouetteEdges.length * 2 * 4, new Uint32Array(this.baseSilhouetteEdges.flat()), ["u32", "u32"]);
        if (this.baseEdges.length == 0) {
            this.baseEdgesBuffer = GPU.createStorageBuffer(2 * 4, new Uint32Array([0,0]), ["u32"]);
        } else {
            this.baseEdgesBuffer = GPU.createStorageBuffer(this.baseEdges.length * 2 * 4, new Uint32Array(this.baseEdges.flat()), ["u32", "u32"]);
        }
        this.graphicMesh.objectMeshDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Vsr_Vsr"), [this.graphicMesh.objectMeshData, this.baseSilhouetteEdgesBuffer,  this.baseEdgesBuffer]);
    }

    setSaveData(data) {
        this.baseEdges = [...data.baseEdges];
        // this.baseEdges = [];
        this.baseSilhouetteEdges = [...data.baseSilhouetteEdges];
        this.updateEdgeGPU();
        this.setImageBBox(data.imageBBox);
    }

    setBaseSilhouetteEdges(edges) {
        this.baseSilhouetteEdges = [...edges];
        this.updateEdgeGPU();
    }

    async createEdgeFromTexture(pixelDensity, scale) {
        const result = await createEdgeFromTexture(this.graphicMesh.texture, pixelDensity, scale);
        result.vertices = this.calculateLocalVerticesToWorldVertices(result.vertices);
        this.graphicMesh.allVertices.length = 0;
        for (let i = 0; i < result.vertices.length; i ++) {
            this.graphicMesh.allVertices.push(new Vertex(this.graphicMesh, {base: result.vertices[i], uv: result.uv[i]}));
        }
        app.scene.runtimeData.graphicMeshData.updateBaseData(this.graphicMesh);
        this.setBaseSilhouetteEdges(result.edges);
        this.createMesh(true);
        app.options.assignWeights(this.graphicMesh);
    }

    async createMesh(compulsion = false) {
        if (compulsion || Date.now() - this.lastCreateMeshTime > 0.1 * 1000) { // 処理が重いので
            await waitUntilFrame(() => {return !app.scene.runtimeData.graphicMeshData.write});
            this.lastCreateMeshTime = Date.now();
            const vertices = this.graphicMesh.allVertices.map(vertex => vertex.base);
            const meshData = cutSilhouetteOutTriangle(vertices, createMeshFromTexture(vertices, this.baseEdges.concat(this.baseSilhouetteEdges)), this.baseSilhouetteEdges); // メッシュの作成とシルエットの外の三角形を削除
            // const meshData = createMeshFromTexture(vertices, this.baseEdges); // メッシュの作成とシルエットの外の三角形を削除
            this.graphicMesh.allMeshes.length = 0;
            for (let i = 0; i < meshData.length; i ++) {
                new Mesh(this.graphicMesh,undefined, meshData[i]);
            }
            app.scene.runtimeData.graphicMeshData.updateBaseData(this.graphicMesh);
            this.updateEdgeGPU();
        }
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
        this.updateEdgeGPU();
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
        this.baseEdges.push(edge);
        this.createMesh(true);
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
        this.createMesh(true);
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

    changeTexture(texture) {
        this.graphicMesh.texture = texture;
        this.graphicMesh.textureView = texture.createView();

        this.imageBBox.setWidthAndHeight(texture.width, texture.height);

        this.graphicMesh.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Ft_Ft_Fu"), [this.objectDataBuffer, this.textureView, this.maskTargetTexture.textureView, this.maskTypeBuffer]);
        this.graphicMesh.maskRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Ft"), [this.objectDataBuffer, this.graphicMesh.textureView]);
    }

    createVertex(coordinate) {
        return new Vertex(this.graphicMesh, {base: coordinate, uv: this.calculatWorldPositionToUV(coordinate)});
    }

    appendVertex(vertex) {
        this.graphicMesh.allVertices.push(vertex);
        this.createMesh(true);
        app.scene.runtimeData.graphicMeshData.updateBaseData(this.graphicMesh);
    }

    deleteVertex(vertex) {
        indexOfSplice(this.graphicMesh.allVertices, vertex)
        this.createMesh(true);
        app.scene.runtimeData.graphicMeshData.updateBaseData(this.graphicMesh);
    }
}

export class GraphicMesh extends ObjectBase {
    static VERTEX_LEVEL = 1; // 小オブジェクトごとに何個の頂点を持つか
    constructor(name, id, data) {
        super(name, "グラフィックメッシュ", id);
        this.runtimeData = app.scene.runtimeData.graphicMeshData;

        this.MAX_VERTICES = app.appConfig.MAX_VERTICES_PER_GRAPHICMESH;
        this.MAX_ANIMATIONS = app.appConfig.MAX_ANIMATIONS_PER_GRAPHICMESH;
        this.MAX_MESHES = app.appConfig.MAX_MESHES_PER_GRAPHICMESH;
        this.vertexBufferOffset = 0;
        this.animationBufferOffset = 0;
        this.weightBufferOffset = 0;

        this.baseTransformIsLock = false;
        this.visible = true;
        this.zIndex = 0;
        this.delete = false;

        this.autoWeight = true;

        // バッファの宣言
        this.modifierType = 0;
        this.texture = null;
        this.textureView = null;

        // その他
        this.animationBlock = new AnimationBlock(this, VerticesAnimation);

        this.BBox = {min: [0,0], max: [0,0]};
        this.BBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);
        this.BBoxRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [{item: this.BBoxBuffer, type: 'b'}]);

        this.baseBBox = [0,0,0,0];
        this.baseBBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);

        this.verticesNum = null;
        this.meshesNum = null;

        /** @type {Vertex[]} */
        this.allVertices = [];

        /** @type {Mesh[]} */
        this.allMeshes = [];

        this.parent = "";

        this.renderingTargetTexture = null;
        this.maskTargetTexture = null;
        this.changeMaskTexture(app.scene.searchMaskTextureFromName("base"));
        this.maskTypeBuffer = GPU.createUniformBuffer(4, undefined, ["f32"]);
        GPU.writeBuffer(this.maskTypeBuffer, new Float32Array([0])); // 0　マスク 反転マスク

        this.editor = new Editor(this);
        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectMeshData = GPU.createUniformBuffer(4 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);
        this.objectMeshDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Vsr_Vsr"), [this.objectMeshData, this.editor.baseSilhouetteEdgesBuffer, this.editor.baseEdgesBuffer]);
        this.init(data);
    }

    get animationWorldOffset() {
        return this.animationBufferOffset * GraphicMesh.VERTEX_LEVEL;
    }

    // gc対象にしてメモリ解放
    destroy() {
        sharedDestroy(this);
        this.delete = true;
        if (this.maskTargetTexture) {
            indexOfSplice(this.maskTargetTexture.useObjects, this);
        }
        if (this.renderingTargetTexture) {
            indexOfSplice(this.renderingTargetTexture.renderingObjects, this);
        }
        this.name = null;
        this.type = null;
        this.baseTransformIsLock = null;
        this.visible = null;
        this.zIndex = null;
        // ブッファの宣言
        this.texture = null;
        this.textureView = null;

        // その他
        this.animationBlock = null;

        this.verticesNum = null;
        this.meshesNum = null;

        this.parent = "";
    }

    init(data) {
        this.zIndex = data.zIndex;
        this.verticesNum = data.vertices.length;
        this.meshesNum = data.meshes.length;

        console.log(data)
        for (const vertex of data.vertices) {
            this.allVertices.push(new Vertex(this, vertex));
            for (const weight of vertex.parentWeight.weights) {
                if (weight != 0) {
                    this.autoWeight = false;
                }
            }
        }
        for (const mesh of data.meshes) {
            new Mesh(this, undefined, mesh.indexs);
        }
        // app.scene.runtimeData.graphicMeshData.prepare(this);
        app.scene.runtimeData.append(app.scene.runtimeData.graphicMeshData, this);
        app.scene.runtimeData.graphicMeshData.updateBaseData(this);
        data.animationKeyDatas.forEach((keyData,index) => {
            const animationData = keyData.transformData.transformData;
            app.scene.runtimeData.graphicMeshData.setAnimationData(this, animationData, index);
        })

        if (data.texture instanceof GPUTexture) {
            this.texture = data.texture;
        } else if (data.texture) {
            this.texture = GPU.createTexture2D([data.texture.width, data.texture.height, 1],"rgba8unorm");
            GPU.copyBase64ToTexture(this.texture, data.texture.data);
        } else {
            this.texture = isNotTexture;
        }

        this.animationBlock.setSaveData(data.animationKeyDatas);

        this.textureView = this.texture.createView(); // これを先に処理しようとするとエラーが出る

        if (data.renderingTargetTexture) {
            this.changeRenderingTarget(app.scene.searchMaskTextureFromName(data.renderingTargetTexture));
        }
        this.changeMaskTexture(app.scene.searchMaskTextureFromName(data.maskTargetTexture));

        if (data.editor) {
            this.editor.setSaveData(data.editor);
        }
        this.isInit = true;
        this.isChange = true;
        this.setGroup();
    }

    changeMaskTexture(target) {
        if (this.maskTargetTexture) {
            indexOfSplice(this.maskTargetTexture.useObjects, this);
        }
        this.maskTargetTexture = target;
        this.maskTargetTexture.useObjects.push(this);
        if (this.isInit) {
            this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Ft_Ft_Fu"), [this.objectDataBuffer, this.textureView, this.maskTargetTexture.textureView, this.maskTypeBuffer]);
        }
    }

    changeRenderingTarget(target) {
        if (this.renderingTargetTexture) {
            indexOfSplice(this.renderingTargetTexture.renderingObjects, this);
        }
        this.renderingTargetTexture = target;
        this.renderingTargetTexture.renderingObjects.push(this);
        this.isChange = true;
    }

    setGroup() {
        if (!this.isInit) return ;
        this.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Ft_Ft_Fu"), [this.objectDataBuffer, this.textureView, this.maskTargetTexture.textureView, this.maskTypeBuffer]);
        this.maskRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Ft"), [this.objectDataBuffer, this.textureView]);
    }

    async getSaveData() {
        const animationKeyDatas = await this.animationBlock.getSaveData()
        return {
            name: this.name,
            id: this.id,
            type: this.type,
            parentID: this.parent.id,
            baseTransformIsLock: this.baseTransformIsLock,
            zIndex: this.zIndex,
            vertices: this.allVertices.map(vertex => vertex.getSaveData()),
            meshes: this.allMeshes.map(mesh => mesh.getSaveData()),
            animationKeyDatas: animationKeyDatas,
            texture: await GPU.textureToBase64(this.texture),
            renderingTargetTexture: this.renderingTargetTexture ? this.renderingTargetTexture.name : null,
            maskTargetTexture: this.maskTargetTexture.name,
            editor: this.editor.getSaveData(),
        };
    }
}