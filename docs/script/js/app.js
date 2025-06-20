import { FaileIOManager } from "./app/FaileIOManager.js";
import { Scene } from "./app/Scene.js";
import { AutoGrid } from "./UI/grid.js";
import { createIcon, createID, createTag, managerForDOMs } from "./UI/制御.js";
import { Hierarchy } from "./app/Hierarchy.js";
import { Operator } from "./機能/オペレーター/オペレーター.js";
import { Area_Viewer } from "./area/Viewer/area_Viewer.js";
import { Area_Hierarchy } from "./area/Hierarchy/area_Hierarchy.js";
import { Area_Inspector } from "./area/Inspector/area_Inspector.js";
import { Area_Preview } from "./area/Preview/area_Preview.js";
import { Area_Timeline } from "./area/Timeline/area_Timeline.js";
import { ViewerSpaceData } from "./area/Viewer/area_ViewerSpaceData.js";
import { TimelineSpaceData } from "./area/Timeline/area_TimelineSpaceData.js";
import { InputManager } from "./app/InputManager.js";
import { changeParameter, createArrayFromHashKeys, indexOfSplice, loadFile } from "./utility.js";
import { SelectTag } from "./area/補助/カスタムタグ.js";
import { ContextmenuOperator } from "./app/ContextmenuOperator.js";
import { HierarchySpaceData } from "./area/Hierarchy/area_HierarchySpaceData.js";
import { Area_Property } from "./area/Property/area_Property.js";
import { GraphicMesh } from "./オブジェクト/グラフィックメッシュ.js";
import { GPU } from "./webGPU.js";

const calculateParentWeightForBone = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Csr_Cu")], await loadFile("./script/js/app/shader/ボーン/重み設定.wgsl"));

class AppOptions {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.primitives = {
            "boneModifer": {
                "normal": {
                    type: "アーマチュア",
                    // boneNum: 1,
                    // relationship: [{
                    //     index: 0,
                    //     children: [],
                    //     baseHead: [0,-100],
                    //     baseTail: [0,100],
                    //     animations: [],
                    // }],
                    boneNum: 3,
                    relationship: [{
                        index: 0,
                        children: [
                            {
                                index: 2,
                                children: [
                                    {
                                        index: 1,
                                        children: [],
                                        baseHead: [0,220],
                                        baseTail: [0,330],
                                        animations: [],
                                    }
                                ],
                                baseHead: [0,110],
                                baseTail: [0,210],
                                animations: [],
                            }
                        ],
                        baseHead: [0,-100],
                        baseTail: [0,100],
                        animations: [],
                    }],
                    editor: {
                        boneColor: [0,0,0,1]
                    }
                },
                "body": {
                    type: "アーマチュア",
                    boneNum: 2,
                    relationship: [{
                        index: 0,
                        children: [
                            {
                                index: 1,
                                children: [],
                                baseHead: [0,110],
                                baseTail: [0,210],
                                animations: [],
                            }
                        ],
                        baseHead: [0,-100],
                        baseTail: [0,100],
                        animations: [],
                    }],
                    editor: {
                        boneColor: [0,0,0,1]
                    }
                }
            },
            "bezierModifier": {
                "normal": {
                    type: "ベジェモディファイア",
                    baseVertices: [-100,0, -150,0, -50,50, 100,0, 50,-50, 150,0],
                    animationKeyDatas: [],
                    modifierEffectData: {data: [0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0], type: "u32*4,f32*4"}
                }
            },
            "graphicMesh": {
                "normal": {
                    zIndex: 0, baseVerticesPosition: [0,0, 500,0, 500,500, 0,500], baseVerticesUV: [0,1, 1,1, 1,0, 0,0], meshIndex: [0,1,2,0, 0,2,3,0], animationKeyDatas: [], modifierEffectData: {data: [
                        0,0,0,0, 0,0,0,0,
                        0,0,0,0, 0,0,0,0,
                        0,0,0,0, 0,0,0,0,
                        0,0,0,0, 0,0,0,0,
                    ], type: "u32*4,f32*4"},
                    renderingTargetTexture: null,
                    maskTargetTexture: "base",
                    editor: {baseSilhouetteEdges: [[0,1],[1,2],[2,3],[3,0]], baseEdges: [], imageBBox: {min: [0,0], max: [500,500], width: 500, height: 500, center: [250,250]}}
                }
            }
        }
    }

    getPrimitiveData(objectType, name) {
        try {
            return this.primitives[objectType][name];
        } catch {
            return null;
        }
    }

    keyframeInsert(object, frame) {
        const datas = object.keyframeBlockManager.blocksMap;
        for (const data in datas) {
            object.keyframeBlockManager.blocksMap[data].insert(frame, object[data]);
        }
    }

    // 自動ウェイトペイント
    async assignWeights(object) {
        if (!object.parent) return ;
        let parentVerticesBuffer;
        let parentAllocationBuffer;
        if (object.parent.type == "アーマチュア") {
            parentVerticesBuffer = this.app.scene.runtimeData.armatureData.baseVertices;
            parentAllocationBuffer = object.parent.objectDataBuffer;
        } else {
            parentVerticesBuffer = this.app.scene.runtimeData.bezierModifierData.baseVertices;
            parentAllocationBuffer = object.parent.objectDataBuffer;
        }
        let objectWeightsBuffer;
        let objectVerticesBuffer;
        let objectAllocationBuffer;
        if (object.type == "グラフィックメッシュ") {
            objectWeightsBuffer = this.app.scene.runtimeData.graphicMeshData.weightBlocks;
            objectVerticesBuffer = this.app.scene.runtimeData.graphicMeshData.baseVertices;
            objectAllocationBuffer = object.objectDataBuffer;
        } else {
            objectWeightsBuffer = this.app.scene.runtimeData.bezierModifierData.weightBlocks;
            objectVerticesBuffer = this.app.scene.runtimeData.bezierModifierData.baseVertices;
            objectAllocationBuffer = object.objectDataBuffer;
        }
        const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Csr_Cu"), [objectWeightsBuffer, objectVerticesBuffer, objectAllocationBuffer, parentVerticesBuffer, parentAllocationBuffer]);
        GPU.runComputeShader(calculateParentWeightForBone, [group], Math.ceil(object.verticesNum / 64));
        const result = await GPU.getStructDataFromGPUBuffer(objectWeightsBuffer, ["u32","u32","u32","u32", "f32","f32","f32","f32"], object.vertexBufferOffset, object.verticesNum);
        console.log(result)
        for (const vertex of object.allVertices) {
            vertex.parentWeight.indexs = result[vertex.index].slice(0,4);
            vertex.parentWeight.weights = result[vertex.index].slice(4,8);
        }
    }
}

// モードごとに使えるツールの管理
class WorkSpaceTool {
    constructor() {
        this.toolRegistry = {
            object: ["move", "scale", "rotate"],
            vertexEdit: ["move", "scale", "rotate"],
        }
    }

    getAvailableTools(mode) {
        return this.toolRegistry[mode] || [];
    }
}

// アプリの設定
class AppConfig {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.projectName = "名称未設定";
        this.workSpaceTool = new WorkSpaceTool();

        this.MASKTEXTURESIZE = [1024,1024];

        this.MAX_GRAPHICMESH = 100; // グラフィックメッシュの最大数
        this.MAX_VERTICES_PER_GRAPHICMESH = 1000; // グラフィックメッシュあたりの最大頂点数
        this.MAX_MESHES_PER_GRAPHICMESH = 2000; // グラフィックメッシュあたりの最大頂メッシュ数
        this.MAX_ANIMATIONS_PER_GRAPHICMESH = 10; // グラフィックメッシュあたりの最大アニメーション数

        this.MAX_BONEMODIFIER = 32; // アーマチュアの最大数
        this.MAX_VERTICES_PER_BONEMODIFIER = 100; // アーマチュアあたりの最大頂点数

        this.MAX_BEZIERMODIFIER = 32; // ベジェモディファイアの最大数
        this.MAX_VERTICES_PER_BEZIERMODIFIER = 10; // ベジェモディファイアあたりの最大頂点数
        this.MAX_ANIMATIONS_PER_BEZIERMODIFIER = 10; // ベジェモディファイアあたりの最大アニメーション数

        this.areasConfig = {};
        for (const keyName in useClassFromAreaType) {
            this.areasConfig[keyName] = new useClassFromAreaType[keyName]["areaConfig"]();
        }

        this.contextmenusItems = {}
    }

    stContextmenuItems() {
        this.contextmenusItems = {
            "Viewer": {
                "オブジェクト": [
                    {label: "オブジェクトを追加", children: [
                        {label: "グラフィックメッシュ", eventFn: this.app.scene.objects.createObject.bind(this.app.scene.objects, {type: "グラフィックメッシュ"})},
                        {label: "ベジェモディファイア", eventFn: this.app.scene.objects.createObject.bind(this.app.scene.objects, {type: "ベジェモディファイア"})},
                        {label: "アーマチュア", eventFn: this.app.scene.objects.createObject.bind(this.app.scene.objects, {type: "アーマチュア"})}
                    ]},
                    {label: "メッシュの生成", eventFn: () => {
                        this.app.scene.state.selectedObject.forEach((/** @type {GraphicMesh} */graphicMesh) => {
                            graphicMesh.editor.createEdgeFromTexture(1, 1);
                        })
                    }},
                    {label: "test"},
                ],
                // "メッシュ編集": [
                //     {label: "test"},
                // ],
            },
            "Hierarchy": {
                "オブジェクト": [
                    {label: "オブジェクトを追加", children: [
                        {label: "グラフィックメッシュ"},
                    ]},
                    {label: "test"},
                ]
            }
        }
    }

    getContextmenuItems(type, mode) {
        return this.contextmenusItems[type][mode];
    }
}

class AreaOperator {
    constructor(app) {
        this.app = app;
        this.areaMap = new Map();
    }

    setArea() {

    }
}

export class Application { // 全てをまとめる
    constructor(/** @type {HTMLElement} **/ dom) {
        this.dom = dom; // エディターが作られるdom
        this.appConfig = new AppConfig(this);
        this.options = new AppOptions(this);

        this.hierarchy = new Hierarchy(this);
        this.scene = new Scene(this);
        this.appConfig.stContextmenuItems();
        this.animationPlayer = new AnimationPlayer(this);

        this.areas = [];
        this.areaMap = new Map();
        this.activeArea = null;
        this.fileIO = new FaileIOManager(this);
        this.input = new InputManager(this);
        this.operator = new Operator(this);

        this.contextmenu = new ContextmenuOperator(this);
    }

    init() {
        this.scene.init();
    }

    async getSaveData() {
        const result = {};
        result.hierarchy = this.hierarchy.getSaveData();
        result.scene = await this.scene.getSaveData();
        return result;
    }

    createArea(axis, target = this.dom) { // エリアの作成
        const area = new AutoGrid(createID(), target, axis, 50);
        this.areaMap.set(area, []);
        return area;
    }

    setAreaType(/** @type {AutoGrid} */grid, index, type) {
        const area_dom = document.createElement("div");
        area_dom.style.width = "100%";
        area_dom.style.height = "100%";
        const area = new Area(type,area_dom);
        area.grid = grid;
        this.areas.push(area);
        this.areaMap.get(grid).push(area);
        grid[`child${index + 1}`].append(area_dom);
    }

    deleteArea(/** @type {Area} */area) {
        area.target.replaceChildren();
        /** @type {AutoGrid} */
        const grid = area.grid;
        const gridInnner = this.areaMap.get(grid);
        indexOfSplice(gridInnner, area);
        console.log(gridInnner)
        console.log(grid.container);
        console.log(grid.target);
        grid.target.replaceChildren();
        if (gridInnner.length) {
            grid.target.append(gridInnner[0].target);
        }
        indexOfSplice(this.areas, area);
        this.areaMap.delete(area);
    }

    update() {
        // 表示順番の再計算
        this.scene.updateRenderingOrder();
        this.scene.updateAnimationCollectors();
        this.scene.update();
        // this.animationPlayer.update(1 / 60);
        this.animationPlayer.update(0.2);
        // ビューの更新
        this.areas.forEach((area) => {
            area.update();
        })
        this.operator.update();
    }
}

const useClassFromAreaType = {
    "Viewer": {area: Area_Viewer, areaConfig: ViewerSpaceData},
    "Hierarchy": {area: Area_Hierarchy, areaConfig: HierarchySpaceData},
    "Inspector": {area: Area_Inspector, areaConfig: ViewerSpaceData},
    "Preview": {area: Area_Preview, areaConfig: ViewerSpaceData},
    "Timeline": {area: Area_Timeline, areaConfig: TimelineSpaceData},
    "Property": {area: Area_Property, areaConfig: TimelineSpaceData},
};

// UIのエリア管理
class Area {
    constructor(type, /** @type {HTMLElement} */ dom) {
        this.target = dom;
        this.target.classList.add("area");

        this.header = document.createElement("div");
        this.header.classList.add("header");
        const select = new SelectTag(this.header, createArrayFromHashKeys(useClassFromAreaType));
        /** @type {HTMLElement} */
        const deleteButton = createTag(this.header, "span", {className: "square_btn"}); // バツボタン
        deleteButton.addEventListener("click", () => {
            app.deleteArea(this);
        })
        createIcon(this.header, "グラフィックメッシュ"); // アイコン
        this.title = createTag(this.header, "div", {textContent: type}); // タイトル

        this.main = document.createElement("div");
        this.main.classList.add("main");
        this.target.append(this.header, this.main);

        this.setType(type);

        select.input.addEventListener("change", () => {
            this.setType(select.input.value);
        })

        this.main.addEventListener("mouseover", () => {
            app.activeArea = this;
        });
    }

    setType(type) {
        this.uiModel?.creator?.remove();
        this.title.textContent = type; // タイトル
        this.type = type;
        if (type in useClassFromAreaType) {
            this.uiModel = new useClassFromAreaType[type]["area"](this.main);
        } else {
            this.uiModel = {type: "エラー"};
            console.warn("設定されていないエリアを表示しようとしました",type)
        }
    }

    update() {
        if (this.type == "Viewer" || this.type == "Preview") {
            this.uiModel.update();
        }
    }
}

// アニメーションのコントローラー
class AnimationPlayer {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.isPlaying = false;
        this.speed = 1.0;
        this.beforeFrame = app.scene.frame_current;
    }

    update(dt) {
        if (this.isPlaying) {
            this.app.scene.frame_current += dt * this.speed;
            managerForDOMs.update("タイムライン-canvas");
        }
        if (this.beforeFrame != this.app.scene.frame_current) {
            this.beforeFrame = this.app.scene.frame_current;
            changeParameter(this.app.scene, "frame_current", this.app.scene.frame_start + (this.app.scene.frame_current - this.app.scene.frame_start) % (this.app.scene.frame_end - this.app.scene.frame_start)); // フレームスタートを下回ったらエンドに戻す
        }
    }
}

export const app = new Application(document.getElementById("app"));

const area1 = app.createArea("w");
const area1_h = app.createArea("h", area1.child1);
const area2 = app.createArea("w", area1.child2);
const area3 = app.createArea("h", area2.child2);
app.setAreaType(area1_h,0,"Viewer");
app.setAreaType(area1_h,1,"Timeline");
app.setAreaType(area2,0,"Hierarchy");
app.setAreaType(area3,0,"Property");
app.setAreaType(area3,1,"Inspector");

app.init();

function appUpdate() {
    try {
        app.update();
    } catch(error) {
        console.error(error)
    }
    requestAnimationFrame(appUpdate);
}

appUpdate();