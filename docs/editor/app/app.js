import { FaileIOManager } from "./faileIOManager/faileIOManager.js";
import { Scene } from "./scene/scene.js";
import { AutoGrid } from "../utils/ui/grid.js";
import { createID } from "../utils/ui/util.js";
import { Operator } from "../operators/commandOperator.js";
import { Area_Viewer } from "../ui/area/areas/Viewer/area_Viewer.js";
import { Area_Outliner } from "../ui/area/areas/Outliner/area_Outliner.js";
import { Area_Inspector } from "../ui/area/areas/Inspector/area_Inspector.js";
import { Area_Timeline } from "../ui/area/areas/Timeline/area_Timeline.js";
import { ViewerSpaceData } from "../ui/area/areas/Viewer/area_ViewerSpaceData.js";
import { TimelineSpaceData } from "../ui/area/areas/Timeline/area_TimelineSpaceData.js";
import { InputManager } from "./inputManager/inputManager.js";
import { changeParameter, indexOfSplice, loadFile } from "../utils/utility.js";
import { ContextmenuOperator } from "../operators/contextmenuOperator.js";
import { OutlinerSpaceData } from "../ui/area/areas/Outliner/area_OutlinerSpaceData.js";
import { Area_Property } from "../ui/area/areas/Property/area_Property.js";
import { GPU } from "../utils/webGPU.js";
import { CreateObjectCommand, DeleteObjectCommand } from "../commands/object/object.js";
import { Area } from "../ui/area/Area.js";
import { CreateEdgeTool } from "../ui/tools/CreateEdge.js";
import { NodeEditorSpaceData } from "../ui/area/areas/NodeEditor/area_NodeEditorSpaceData.js";
import { Area_NodeEditor } from "../ui/area/areas/nodeEditor/area_NodeEditor.js";
import { Area_Previewer } from "../ui/area/areas/Previewer/area_Previewer.js";
import { PreviewerSpaceData } from "../ui/area/areas/Previewer/area_PreviewerSpaceData.js";
import { WorkSpaces } from "./workSpaces/workSpaces.js";
import { Area_Timeline2 } from "../ui/area/areas/Timeline2/area_Timeline2.js";
import { UI } from "./ui/ui.js";

const allLanguageData = await loadFile("./config/language/language.json");
const calculateParentWeightForBone = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Csr_Cu")], await loadFile("./editor/shader/compute/objectUtil/setWeight/bone.wgsl"));
const calculateParentWeightForBezier = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Cu_Csr_Cu")], await loadFile("./editor/shader/compute/objectUtil/setWeight/bezier.wgsl"));

export const useClassFromAreaType = {
    "Viewer": {area: Area_Viewer, areaConfig: ViewerSpaceData},
    "Outliner": {area: Area_Outliner, areaConfig: OutlinerSpaceData},
    "Inspector": {area: Area_Inspector, areaConfig: ViewerSpaceData},
    "Timeline": {area: Area_Timeline, areaConfig: TimelineSpaceData},
    "Timeline2": {area: Area_Timeline2, areaConfig: TimelineSpaceData},
    "Property": {area: Area_Property, areaConfig: TimelineSpaceData},
    "NodeEditor": {area: Area_NodeEditor, areaConfig: NodeEditorSpaceData},
    "Previewer": {area: Area_Previewer, areaConfig: PreviewerSpaceData},
};

class AppOptions {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.primitives = {
            "アーマチュア": {
                "normal": {
                    type: "アーマチュア",
                    boneNum: 1,
                    bones: [{
                        index: 0,
                        childrenBone: [],
                        baseHead: {co: [0,0]},
                        baseTail: {co: [0,100]},
                        animations: {blocks: []},
                        attachments: {
                            type: "アタッチメント",
                            list: [
                                {
                                    type: "物理アタッチメント",
                                    x: 0,
                                    y: 0,
                                    rotate: 0,
                                    shearX: 0,
                                    scaleX: 0,
                                    inertia: 0,
                                    strength: 0,
                                    damping: 0,
                                    mass: 0,
                                    wind: 0,
                                    gravity: 0,
                                    mix: 0,
                                    limit: 0,
                                }
                            ]
                        }
                    }],
                    editor: {
                        boneColor: [0,0,0,1]
                    }
                },
                "body": {
                    type: "アーマチュア",
                    boneNum: 2,
                    bones: [{
                        index: 0,
                        childrenBone: [
                            {
                                index: 1,
                                childrenBone: [],
                                baseHead: [0,110],
                                baseTail: [0,210],
                                animations: [],
                                attachments: {
                                    type: "アタッチメント",
                                    list: [
                                        {
                                            type: "物理アタッチメント",
                                            x: 0,
                                            y: 0,
                                            rotate: 0,
                                            shearX: 0,
                                            scaleX: 0,
                                            inertia: 0,
                                            strength: 0,
                                            damping: 0,
                                            mass: 0,
                                            wind: 0,
                                            gravity: 0,
                                            mix: 0,
                                            limit: 0,
                                        }
                                    ]
                                }
                            }
                        ],
                        baseHead: [0,-100],
                        baseTail: [0,100],
                        animations: {blocks: []},
                        attachments: {
                            type: "アタッチメント",
                            list: [
                                {
                                    type: "物理アタッチメント",
                                    x: 0,
                                    y: 0,
                                    rotate: 0,
                                    shearX: 0,
                                    scaleX: 0,
                                    inertia: 0,
                                    strength: 0,
                                    damping: 0,
                                    mass: 0,
                                    wind: 0,
                                    gravity: 0,
                                    mix: 0,
                                    limit: 0,
                                }
                            ]
                        }
                    }],
                    editor: {
                        boneColor: [0,0,0,1]
                    }
                }
            },
            "ベジェモディファイア": {
                "normal": {
                    type: "ベジェモディファイア",
                    points: [
                        {point: {co: [-100,0], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}}, leftControlPoint: {co: [-150,0], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}}, rightControlPoint: {co: [-50,0], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}}},
                        {point: {co: [100,0], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}}, leftControlPoint: {co: [50,0], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}}, rightControlPoint: {co: [150,0], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}}},
                    ],
                    animationKeyDatas: [],
                }
            },
            "グラフィックメッシュ": {
                "normal": {
                    type: "グラフィックメッシュ",
                    zIndex: 0,
                    imageBBox: {
                        min: [0, 0],
                        max: [100, 100]
                    },
                    vertices: [
                        {base: [0,0], uv: [0,1], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}},
                        {base: [100,0], uv: [1,1], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}},
                        {base: [100,100], uv: [1,0], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}},
                        {base: [0,100], uv: [0,0], parentWeight: {indexs: [0,0,0,0], weights: [0,0,0,0]}},
                    ],
                    meshes: [
                        {indexs: [0,1,2]},
                        {indexs: [2,3,0]},
                    ],
                    renderingTargetTexture: null,
                    maskTargetTexture: "base",
                    editor: {
                        baseSilhouetteEdges: [[0,1],[1,2],[2,3],[3,0]],
                        baseEdges: [[0,1],[1,2],[2,3],[3,0]],
                        imageBBox: {
                            min: [
                                0,
                                0
                            ],
                            max: [
                                100,
                                100
                            ],
                            width: 100,
                            height: 100,
                            center: [
                                (100 + 0) / 2,
                                (100 + 0) / 2,
                            ]
                        }
                    },
                    animationKeyDatas: [],
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
        if (object.parent.isRoot) return ;
        let parentVerticesBuffer;
        let parentAllocationBuffer;
        if (object.parent.type == "アーマチュア") {
            parentVerticesBuffer = this.app.scene.runtimeData.armatureData.baseVertices.buffer;
            parentAllocationBuffer = object.parent.objectDataBuffer;
        } else {
            parentVerticesBuffer = this.app.scene.runtimeData.bezierModifierData.baseVertices.buffer;
            parentAllocationBuffer = object.parent.objectDataBuffer;
        }
        let objectWeightsBuffer;
        let objectVerticesBuffer;
        let objectAllocationBuffer;
        let runtimeObject;
        if (object.type == "グラフィックメッシュ") {
            objectWeightsBuffer = this.app.scene.runtimeData.graphicMeshData.weightBlocks.buffer;
            objectVerticesBuffer = this.app.scene.runtimeData.graphicMeshData.baseVertices.buffer;
            objectAllocationBuffer = object.objectDataBuffer;
            runtimeObject = this.app.scene.runtimeData.graphicMeshData;
        } else {
            objectWeightsBuffer = this.app.scene.runtimeData.bezierModifierData.weightBlocks.buffer;
            objectVerticesBuffer = this.app.scene.runtimeData.bezierModifierData.baseVertices.buffer;
            objectAllocationBuffer = object.objectDataBuffer;
            runtimeObject = this.app.scene.runtimeData.bezierModifierData;
        }
        const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Cu_Csr_Cu"), [objectWeightsBuffer, objectVerticesBuffer, objectAllocationBuffer, parentVerticesBuffer, parentAllocationBuffer]);
        if (object.parent.type == "アーマチュア") {
            GPU.runComputeShader(calculateParentWeightForBone, [group], Math.ceil(object.verticesNum / 64));
        } else {
            GPU.runComputeShader(calculateParentWeightForBezier, [group], Math.ceil(object.verticesNum / 64));
        }
        runtimeObject.updateCPUDataFromGPUBuffer(object, {vertex: {weight: true}});
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

        this.language = allLanguageData["日本語"];

        this.MASKTEXTURESIZE = [1024,1024];

        this.MAX_GRAPHICMESH = 200; // グラフィックメッシュの最大数
        this.MAX_VERTICES_PER_GRAPHICMESH = 1000; // グラフィックメッシュあたりの最大頂点数
        this.MAX_MESHES_PER_GRAPHICMESH = 2000; // グラフィックメッシュあたりの最大頂メッシュ数
        this.MAX_ANIMATIONS_PER_GRAPHICMESH = 10; // グラフィックメッシュあたりの最大アニメーション数

        this.MAX_BONEMODIFIER = 32; // アーマチュアの最大数
        this.MAX_BONES_PER_ARMATURE = 500; // アーマチュアあたりの最大ボーン数

        this.MAX_BEZIERMODIFIER = 32; // ベジェモディファイアの最大数
        this.MAX_POINTS_PER_BEZIERMODIFIER = 50; // ベジェモディファイアあたりの最大頂点数
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
                        {label: "グラフィックメッシュ", children: [
                            {label: "normal", eventFn: () => {
                                const command = new CreateObjectCommand(this.app.options.getPrimitiveData("グラフィックメッシュ", "normal"));
                                this.app.operator.appendCommand(command);
                                this.app.operator.execute();
                            }},
                            {label: "body", eventFn: () => {
                                const command = new CreateObjectCommand(this.app.options.getPrimitiveData("グラフィックメッシュ", "body"));
                                this.app.operator.appendCommand(command);
                                this.app.operator.execute();
                            }},
                        ]},
                        {label: "ベジェモディファイア", children: [
                            {label: "normal", eventFn: () => {
                                const command = new CreateObjectCommand(this.app.options.getPrimitiveData("ベジェモディファイア", "normal"));
                                this.app.operator.appendCommand(command);
                                this.app.operator.execute();
                            }},
                            {label: "body", eventFn: () => {
                                const command = new CreateObjectCommand(this.app.options.getPrimitiveData("ベジェモディファイア", "body"));
                                this.app.operator.appendCommand(command);
                                this.app.operator.execute();
                            }},
                        ]},
                        {label: "アーマチュア", children: [
                            {label: "normal", eventFn: () => {
                                const command = new CreateObjectCommand(this.app.options.getPrimitiveData("アーマチュア", "normal"));
                                this.app.operator.appendCommand(command);
                                this.app.operator.execute();
                            }},
                            {label: "body", eventFn: () => {
                                const command = new CreateObjectCommand(this.app.options.getPrimitiveData("アーマチュア", "body"));
                                this.app.operator.appendCommand(command);
                                this.app.operator.execute();
                            }},
                        ]},
                    ]},
                    {label: "メッシュの生成", eventFn: async () => {
                        this.app.activeArea.uiModel.modalOperator.setModal(CreateEdgeTool, this.app.activeArea.uiModel.inputs);
                    }},
                    {label: "削除", children: [
                        {label: "選択物", eventFn: () => {
                            const command = new DeleteObjectCommand(this.app.scene.state.selectedObject);
                            this.app.operator.appendCommand(command);
                            this.app.operator.execute();
                        }},
                    ]},
                ],
                // "メッシュ編集": [
                //     {label: "test"},
                // ],
            },
            "Outliner": {
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

class AppPerformance {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.jsHeapMByteSizeLimit = 0;　// 使用可能なメモリ(MB)
        this.jsHeapByteSizeLimit = 0;　// 使用可能なメモリ(B)
        this.totalJSHeapMByteSize = 0; // 割り当てられた(MB)
        this.totalJSHeapByteSize = 0; // 割り当てられた(B)
        this.usedJSHeapMByteSize = 0; // 使用中のメモリ(MB)
        this.usedJSHeapByteSize = 0; // 使用中のメモリ(B)
    }

    update() {
        changeParameter(this, "jsHeapMByteSizeLimit", performance.memory.jsHeapSizeLimit / 1024 / 1024);
        changeParameter(this, "jsHeapByteSizeLimit", performance.memory.jsHeapSizeLimit);
        changeParameter(this, "totalJSHeapMByteSize", performance.memory.totalJSHeapSize / 1024 / 1024);
        changeParameter(this, "totalJSHeapByteSize", performance.memory.totalJSHeapSize);
        changeParameter(this, "usedJSHeapMByteSize", performance.memory.usedJSHeapSize / 1024 / 1024);
        changeParameter(this, "usedJSHeapByteSize", performance.memory.usedJSHeapSize);
    }
}

export class Application { // 全てをまとめる
    constructor(/** @type {HTMLElement} **/ dom) {
        this.dom = dom; // エディターが作られるdom
        this.appPerformance = new AppPerformance(this);
        this.appConfig = new AppConfig(this);
        this.options = new AppOptions(this);
        this.ui = new UI(this);
        this.scene = new Scene(this);
        this.appConfig.stContextmenuItems();

        this.areas = [];
        this.areaMap = new Map();
        this.activeArea = null;
        this.workSpaces = new WorkSpaces(this);
        this.fileIO = new FaileIOManager(this);
        this.input = new InputManager(this);
        this.operator = new Operator(this);

        this.contextmenu = new ContextmenuOperator(this);

    }

    init() {
        this.scene.init();
        this.workSpaces.init();
        console.log(this)
    }

    async getSaveData() {
        const result = {};
        // result.outliner = this.outliner.getSaveData();
        result.scene = await this.scene.getSaveData();
        return result;
    }

    update() {
        // パフォーマンスの更新
        this.appPerformance.update();
        // 表示順番の再計算
        this.scene.updateRenderingOrder();
        this.scene.updateAnimationCollectors();
        // 単位: 秒
        this.scene.frameUpdate(1 / 60);
        this.scene.update();
        // ビューの更新
        this.areas.forEach((area) => {
            area.update();
        });
    }
}

export function appUpdate(app) {
    try {
        app.update();
    } catch (error) {
        console.error(error);
    }
    requestAnimationFrame(() => appUpdate(app));
}