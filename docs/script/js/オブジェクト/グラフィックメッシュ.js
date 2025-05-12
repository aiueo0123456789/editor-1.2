import { device,GPU } from "../webGPU.js";
import { AnimationBlock, VerticesAnimation } from "../アニメーション.js";
import { isNotTexture } from "../GPUObject.js";
import { BoundingBox, ObjectBase, ObjectEditorBase, setBaseBBox, setParentModifierWeight, sharedDestroy } from "./オブジェクトで共通の処理.js";
import { indexOfSplice } from "../utility.js";
import { vec2 } from "../ベクトル計算.js";
import { createEdgeFromTexture, createMeshFromTexture, cutSilhouetteOutTriangle } from "../機能/メッシュの自動生成/画像からメッシュを作る.js";
import { createBBox } from "../BBox.js";
import { app } from "../app.js";

class Vert {
    constructor() {
        this.index = 0;
        this.select = true;
    }
}

class Mesh {
    constructor() {
        this.vertices = [];
    }

    getVertices() {

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

        this.baseSilhouetteEdgesBuffer = null;
        this.baseSilhouetteEdgesRenderGroup = null;
        this.baseEdgesBuffer = null;
        this.baseEdgesRenderGroup = null;
        this.outlineVertices = [];
        this.outlineEdges = [];
        this.layerParent = "";
    }

    destroy() {
        this.graphicMesh = null;
    }

    setDataForGPU() {
        // if (this.baseSilhouetteEdges.length) {
        //     this.baseSilhouetteEdgesBuffer = GPU.createStorageBuffer(this.baseSilhouetteEdges.length * 2 * 4, this.baseSilhouetteEdges.flat(), ["u32","u32"]);
        //     this.baseSilhouetteEdgesRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.graphicMesh.RVrt_coBuffer, this.baseSilhouetteEdgesBuffer]);
        // }
        // if (this.baseEdges.length) {
        //     this.baseEdgesBuffer = GPU.createStorageBuffer(this.baseEdges.length * 2 * 4, this.baseEdges.flat(), ["u32","u32"]);
        //     this.baseEdgesRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.graphicMesh.RVrt_coBuffer, this.baseEdgesBuffer]);
        // }
    }

    setImageBBox(bbox) {
        this.imageBBox = bbox;
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
        this.baseEdges = [...data.baseEdges];
        this.baseSilhouetteEdges = [...data.baseSilhouetteEdges];
        this.setImageBBox(data.imageBBox);
        this.setDataForGPU();
    }

    setBaseSilhouetteEdges(edges) {
        this.baseEdges = [...edges];
        this.baseSilhouetteEdges = [...edges];
        this.setDataForGPU();
    }

    async createEdgeFromTexture(pixelDensity, scale) {
        const result = await createEdgeFromTexture(this.graphicMesh.texture, pixelDensity, scale);
        result.vertices = this.calculateLocalVerticesToWorldVertices(result.vertices);
        this.baseEdges = [...result.edges];
        this.setVerticesData(result.vertices, result.uv);
        this.setBaseSilhouetteEdges(result.edges)
        this.createMesh();
        this.graphicMesh.weightAuto = true;
        setParentModifierWeight(this.graphicMesh);
    }

    async createMesh() {
        const vertices = await GPU.getBufferVerticesData(this.graphicMesh.s_baseVerticesPositionBuffer);
        const meshData = cutSilhouetteOutTriangle(vertices, createMeshFromTexture(vertices, this.baseEdges), this.baseSilhouetteEdges); // メッシュの作成とシルエットの外の三角形を削除
        // const meshData = createMeshFromTexture(vertices, this.baseEdges);
        this.setMeshData(meshData);
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
        this.setDataForGPU();
    }

    appendBaseEdge(edge) {
        for (const edge_ of this.baseEdges) {
            if (
                edge[0] == edge_[0] && edge[1] == edge_[1] ||
                edge[0] == edge_[1] && edge[1] == edge_[0]
            ) {
                return false;
            }
        }
        this.baseEdges.push(edge);
        this.setDataForGPU();
    }

    deleteBaseEdge(edge) {
        for (let i = 0; i < this.baseEdges.length; i ++) {
            const edge_ = this.baseEdges[i];
            if (
                edge[0] == edge_[0] && edge[1] == edge_[1] ||
                edge[0] == edge_[1] && edge[1] == edge_[0]
            ) {
                this.baseEdges.splice(i, 1);
                this.setDataForGPU();
            }
        }
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

    setVerticesData(vertices, uv) {
        this.graphicMesh.verticesNum = vertices.length;
        this.graphicMesh.s_baseVerticesPositionBuffer = GPU.createStorageBuffer(this.graphicMesh.verticesNum * (2) * 4, vertices.flat(), ['f32','f32']);
        this.graphicMesh.s_baseVerticesUVBuffer = GPU.createStorageBuffer(this.graphicMesh.verticesNum * (2) * 4, uv.flat(), ['f32','f32']);
        this.graphicMesh.RVrt_coBuffer = GPU.createStorageBuffer(this.graphicMesh.verticesNum * (2) * 4, undefined, ['f32']);
        this.graphicMesh.parentWeightBuffer = GPU.createStorageBuffer(4, undefined, ['f32']);

        this.graphicMesh.isChange = true;

        this.graphicMesh.baseTransformIsLock = true;

        this.graphicMesh.setGroup();
        setBaseBBox(this.graphicMesh);
        setParentModifierWeight(this.graphicMesh);
    }

    setMeshData(mesh) {
        this.graphicMesh.meshesNum = mesh.length;
        this.graphicMesh.v_meshIndexBuffer = GPU.createVertexBuffer(this.graphicMesh.meshesNum * 3 * 4, mesh.flat(), ['u32']);
        
        this.graphicMesh.s_meshIndexBuffer = GPU.createStorageBuffer(this.graphicMesh.meshesNum * 4 * 4, mesh.map((x) => x.concat([0])).flat(), ['u32']);
        if (!this.graphicMesh.isInit && this.graphicMesh.texture) {
            this.graphicMesh.isInit = true;
        }
        this.graphicMesh.isChange = true;
        this.graphicMesh.baseTransformIsLock = true;
        this.graphicMesh.setGroup();
        setBaseBBox(this.graphicMesh);
        setParentModifierWeight(this.graphicMesh);
    }

    changeTexture(texture) {
        this.graphicMesh.texture = texture;
        this.graphicMesh.textureView = texture.createView();

        this.imageBBox.setWidthAndHeight(texture.width, texture.height);

        this.graphicMesh.renderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Ft_Ft_Fu"), [this.objectDataBuffer, this.textureView, this.maskTargetTexture.textureView, this.maskTypeBuffer]);
        this.graphicMesh.maskRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Ft"), [this.objectDataBuffer, this.graphicMesh.textureView]);
    }
}

export class GraphicMesh extends ObjectBase {
    constructor(name, id) {
        super(name, "グラフィックメッシュ", id);

        this.MAX_VERTICES = app.appConfig.MAX_VERTICES_PER_GRAPHICMESH;
        this.MAX_ANIMATIONS = app.appConfig.MAX_ANIMATIONS_PER_GRAPHICMESH;
        this.MAX_MESHES = app.appConfig.MAX_MESHES_PER_GRAPHICMESH;
        this.vertexBufferOffset = 0;
        this.animationBufferOffset = 0;
        this.weightBufferOffset = 0;
        this.allocationIndex = 0;

        this.baseTransformIsLock = false;
        this.visible = true;
        this.zIndex = 0;
        this.delete = false;

        // バッファの宣言
        this.s_baseVerticesPositionBuffer = null;
        this.s_baseVerticesUVBuffer = null;
        this.RVrt_coBuffer = null;
        this.v_meshIndexBuffer = null;
        this.s_meshIndexBuffer = null;
        this.parentWeightBuffer = null;
        this.modifierType = 0;
        this.texture = null;
        this.textureView = null;

        // グループの宣言
        this.adaptAnimationGroup1 = null;
        this.renderGroup = null;
        this.modifierTransformGroup = null;
        this.collisionVerticesGroup = null;
        this.collisionMeshGroup = null;
        this.collisionMeshResultBuffer = null;

        // その他
        this.animationBlock = new AnimationBlock(this, VerticesAnimation);

        this.BBox = {min: [0,0], max: [0,0]};
        this.BBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);
        this.BBoxRenderGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [{item: this.BBoxBuffer, type: 'b'}]);

        this.baseBBox = [0,0,0,0];
        this.baseBBoxBuffer = GPU.createStorageBuffer(4 * 4, undefined, ["f32"]);

        this.verticesNum = null;
        this.meshesNum = null;

        this.parent = "";

        this.renderingTargetTexture = null;
        this.maskTargetTexture = null;
        this.changeMaskTexture(app.scene.searchMaskTextureFromName("base"));
        this.maskTypeBuffer = GPU.createUniformBuffer(4, undefined, ["f32"]);
        GPU.writeBuffer(this.maskTypeBuffer, new Float32Array([0])); // 0　マスク 反転マスク

        this.objectDataBuffer = GPU.createUniformBuffer(8 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectMeshData = GPU.createUniformBuffer(4 * 4, undefined, ["u32"]); // GPUでオブジェクトを識別するためのデータを持ったbuffer
        this.objectDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectDataBuffer]);
        this.objectMeshDataGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.objectMeshData]);
        this.editor = new Editor(this);
        // this.init();
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
        this.s_baseVerticesPositionBuffer = null;
        this.s_baseVerticesUVBuffer = null;
        this.RVrt_coBuffer = null;
        this.v_meshIndexBuffer = null;
        this.s_meshIndexBuffer = null;
        this.parentWeightBuffer = null;
        this.texture = null;
        this.textureView = null;

        // グループの宣言
        this.adaptAnimationGroup1 = null;
        this.renderGroup = null;
        this.modifierTransformGroup = null;
        this.collisionVerticesGroup = null;
        this.collisionMeshGroup = null;
        this.collisionMeshResultBuffer = null;

        // その他
        this.animationBlock = null;

        this.verticesNum = null;
        this.meshesNum = null;

        this.parent = "";
        this.weightAuto = false;
    }

    init(data) {
        if (data.ps) {
            this.texture = data.texture;

            this.editor.setImageBBox(createBBox(data.coordinates));

            this.zIndex = data.zIndex;
            this.verticesNum = 4;
            this.meshesNum = 2;
            this.s_baseVerticesPositionBuffer = GPU.createStorageBuffer(this.verticesNum * (2) * 4, [
                data.coordinates.left, -data.coordinates.bottom,
                data.coordinates.right, -data.coordinates.bottom,
                data.coordinates.left, -data.coordinates.top,
                data.coordinates.right, -data.coordinates.top
            ], ['f32','f32']);
            this.s_baseVerticesUVBuffer = GPU.createStorageBuffer(this.verticesNum * (2) * 4, [0,1, 1,1, 0,0, 1,0], ['f32','f32']);
            this.RVrt_coBuffer = GPU.createStorageBuffer(this.verticesNum * (2) * 4, undefined, ['f32']);
            this.parentWeightBuffer = GPU.createStorageBuffer(4, undefined, ['f32']);

            this.v_meshIndexBuffer = GPU.createVertexBuffer(this.meshesNum * 3 * 4, [0,1,2, 2,3,1], ['u32']); // [i0,i1,i2,padding,...] -> [i0,i1,i2,...]
            
            this.s_meshIndexBuffer = GPU.createStorageBuffer(this.meshesNum * 4 * 4, [0,1,2,0, 2,3,1,0], ['u32']);

            this.editor.setBaseSilhouetteEdges([[0,1],[0,2],[1,3],[2,3]]);

            this.animationBlock.setSaveData([]);

            this.textureView = this.texture.createView(); // これを先に処理しようとするとエラーが出る

            this.changeMaskTexture(app.scene.searchMaskTextureFromName("base"));

            this.isInit = true;
            this.isChange = true;
            this.setGroup();
            setBaseBBox(this);
        } else {
            let weightGroupData = [];
            if (data.modifierEffectData) {
                if (data.modifierEffectData.type == "u32*4,f32*4") {
                    weightGroupData = data.modifierEffectData.data;
                } else if (data.modifierEffectData.type == "u32,f32") {
                    for (let i = 0; i < data.modifierEffectData.data.length; i += 2) {
                        weightGroupData.push(
                            data.modifierEffectData.data[i],0,0,0,
                            data.modifierEffectData.data[i + 1],0,0,0
                        );
                    }
                }
            }
            app.scene.gpuData.graphicMeshData.prepare(this);
            app.scene.gpuData.graphicMeshData.setBase(this, data.baseVerticesPosition, data.baseVerticesUV, weightGroupData, data.meshIndex.filter((x,i) => (i + 1) % 4 != 0));
            data.animationKeyDatas.forEach((keyData,index) => {
                const animationData = keyData.transformData.transformData;
                app.scene.gpuData.graphicMeshData.setAnimationData(this, animationData, index);
            })

            if (data.texture) {
                this.texture = GPU.createTexture2D([data.texture.width, data.texture.height, 1],"rgba8unorm");
                GPU.copyBase64ToTexture(this.texture, data.texture.data);
            } else {
                this.textureView = isNotTexture;
            }

            this.zIndex = data.zIndex;
            this.verticesNum = data.baseVerticesPosition.length / 2;
            this.meshesNum = data.meshIndex.length / 4;

            this.v_meshIndexBuffer = GPU.createVertexBuffer(this.meshesNum * 3 * 4, data.meshIndex.filter((x,i) => (i + 1) % 4 != 0), ['u32']); // [i0,i1,i2,padding,...] -> [i0,i1,i2,...]

            this.s_meshIndexBuffer = GPU.createStorageBuffer(this.meshesNum * 4 * 4, data.meshIndex, ['u32']);

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
            // setBaseBBox(this);
        }
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
        let modifierEffectData = null;
        if (this.parent) {
            if (this.parent.type == "モディファイア") {
                modifierEffectData = {type: "u32*4,f32*4", data: await GPU.getBufferDataAsStruct(this.parentWeightBuffer, this.verticesNum * (4 + 4) * 4, ["u32","u32","u32","u32","f32","f32","f32","f32"])};
            } else if (this.parent.type == "ベジェモディファイア") {
                modifierEffectData = {type: "u32,f32", data: await GPU.getBufferDataAsStruct(this.parentWeightBuffer, this.verticesNum * (1 + 1) * 4, ["u32","f32"])};
            } else if (this.parent.type == "ボーンモディファイア") {
                modifierEffectData = {type: "u32*4,f32*4", data: await GPU.getBufferDataAsStruct(this.parentWeightBuffer, this.verticesNum * (4 + 4) * 4, ["u32","u32","u32","u32","f32","f32","f32","f32"])};
            }
        }

        return {
            name: this.name,
            id: this.id,
            type: this.type,
            baseTransformIsLock: this.baseTransformIsLock,
            zIndex: this.zIndex,
            baseVerticesPosition: [...await GPU.getF32BufferData(this.s_baseVerticesPositionBuffer)],
            baseVerticesUV: [...await GPU.getF32BufferData(this.s_baseVerticesUVBuffer)],
            meshIndex: [...await GPU.getU32BufferData(this.s_meshIndexBuffer)],
            animationKeyDatas: animationKeyDatas,
            modifierEffectData: modifierEffectData,
            texture: await GPU.textureToBase64(this.texture),
            renderingTargetTexture: this.renderingTargetTexture ? this.renderingTargetTexture.name : null,
            maskTargetTexture: this.maskTargetTexture.name,
            editor: this.editor.getSaveData(),
        };
    }
}