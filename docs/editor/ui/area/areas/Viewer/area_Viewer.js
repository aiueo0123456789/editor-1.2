import { ConvertCoordinate } from '../../../../utils/convertCoordinate.js';
import { resizeObserver } from '../../../../utils/ui/resizeObserver.js';
import { TranslateModal } from '../../../tools/TranslateTool.js';
import { RotateModal } from '../../../tools/RotateTool.js';
import { ResizeModal } from '../../../tools/ResizeTool.js';
import { ExtrudeMove } from '../../../tools/ExtrudeMove.js';
import { ParentPickModal } from '../../../tools/ParentPick.js';
import { DeleteTool } from '../../../tools/Delete.js';
import { WeightPaintModal } from '../../../tools/WeightPaintTool.js';
import { ToolsBarOperator } from '../../../../operators/toolsBarOperator.js';
import { EdgeJoinTool } from '../../../tools/EdgeJoin.js';
import { AppendVertex } from '../../../tools/appendVertex.js';
import { device, format, GPU } from "../../../../utils/webGPU.js";
import { boolTo0or1, calculateLocalMousePosition, changeParameter, loadFile, range } from '../../../../utils/utility.js';
import { MathVec2 } from '../../../../utils/mathVec.js';
import { Camera } from '../../../../core/objects/camera.js';
import { InputManager } from '../../../../app/inputManager/inputManager.js';
import { ViewerSpaceData } from './area_ViewerSpaceData.js';
import { ToolPanelOperator } from '../../../../operators/toolPanelOperator.js';
import { CreateEdgeTool } from '../../../tools/CreateEdge.js';
import { Particle } from '../../../../core/objects/particle.js';
import { app } from '../../../../../main.js';
import { SelectOnlyVertexCommand } from '../../../../commands/utile/selectVertices.js';
import { managerForDOMs } from '../../../../utils/ui/util.js';
import { BBezier } from '../../../../core/edit/objects/BBezier.js';
import { SelectOnlyBoneCommand } from '../../../../commands/utile/selectBone.js';
import { KeyframeInsertModal } from '../../../tools/keyframeInsert.js';
import { ActiveVertexPanel } from './toolBar/panel/vertex.js';
import { ActiveBonePanel } from './toolBar/panel/bone.js';
import { ActiveMeshPanel } from './toolBar/panel/mesh.js';
import { ActiveEdgePanel } from './toolBar/panel/edge.js';
import { WeightPaintPanel } from './toolBar/panel/weight.js';
import { BBezierWeight } from '../../../../core/edit/objects/BBezierWeight.js';

const selectObjectOutlinePipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft"), GPU.getGroupLayout("Fu")], await loadFile("./editor/shader/render/selectObjectOutline/selectObjectOutlineMeshRenderPipeline.wgsl"), [["u"]], "mask", "t");
const selectObjectOutlineMixPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Fts_Ft_Fu")], await loadFile("./editor/shader/render/selectObjectOutline/mix.wgsl"), [], "2d", "s");

const devMaskTexturePipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Fts_Ft")], await loadFile("./editor/shader/render/devMaskTexture.wgsl"), [], "2d", "s");
const renderGridPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts")], await fetch('./editor/shader/render/grid.wgsl').then(x => x.text()), [], "2d", "s");
const renderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Vu_Ft_Ft_Fu"), GPU.getGroupLayout("Fu")], await loadFile("./editor/shader/render/main.wgsl"), [["u"]], "2d", "t", "wl");
// const renderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Vu_Ft_Ft_Fu"), GPU.getGroupLayout("Fu")], await loadFile("./editor/shader/render/main.wgsl"), [["u"]], "2d", "t", "wa");
const renderParticlePipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/particleVertex.wgsl"), [], "2d", "s", "wl");
const maskRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft")], await loadFile("./editor/shader/render/mask.wgsl"), [["u"]], "mask", "t");

const BMSMainRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/bms/main.wgsl"), [], "2d", "t", "wl");
const BMSMeshsRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/bms/meshs.wgsl"), [], "2d", "s");
const BMSVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/bms/vertices.wgsl"), [], "2d", "s");
const BMWMeshsRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/BMWmeshs.wgsl"), [], "2d", "t", "wl");
const BMWWeightsRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/BMWweights.wgsl"), [], "2d", "s");
const BMeshMainRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/main.wgsl"), [], "2d", "t", "wl");
const BMeshVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/verticesShader.wgsl"), [], "2d", "s");
const BMeshMeshRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/meshShader.wgsl"), [], "2d", "s");
const BMeshEdgeRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/edgeShader.wgsl"), [], "2d", "s");
const BMeshSilhouetteEdgeRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vsr_Vu_Ft")], await loadFile("./editor/shader/render/graphicMesh/silhouetteEdgesShader.wgsl"), [], "2d", "s");
// const graphicMeshsWeightRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu"), GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/graphicMesh/weightShader.wgsl"), [], "2d", "s");

const BAABoneRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr")], await loadFile("./editor/shader/render/bone/BAABone.wgsl"), [], "2d", "s");
const BArmatureVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr")], await loadFile("./editor/shader/render/bone/vertices.wgsl"), [], "2d", "t");
const BArmatureBonesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr")], await loadFile("./editor/shader/render/bone/BABone.wgsl"), [], "2d", "s");
const selectObjectOutlineBoneRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_VFsr"),GPU.getGroupLayout("Vu"), GPU.getGroupLayout("Fu")], await loadFile("./editor/shader/render/selectObjectOutline/selectObjectOutlineBoneRenderPipeline.wgsl"), [], "mask", "t");
const boneBoneRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_VFsr"),GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/bone/bone.wgsl"), [], "2d", "s");
const boneRelationshipsRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/bone/relationships.wgsl"), [], "2d", "s");

const selectObjectOutlineBezierRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr"),GPU.getGroupLayout("Vu"), GPU.getGroupLayout("Fu")], await loadFile("./editor/shader/render/selectObjectOutline/selectObjectOutlineBezierRenderPipeline.wgsl"), [], "mask", "s");
const bezierRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/bezier/bezier.wgsl"), [], "2d", "s");
const BBezierBezierRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr")], await loadFile("./editor/shader/render/bezier/BBezier.wgsl"), [], "2d", "s");
const BBezierVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr")], await loadFile("./editor/shader/render/bezier/vertices.wgsl"), [], "2d", "t");
const BBezierWeightsRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr")], await loadFile("./editor/shader/render/bezier/bbw/weights.wgsl"), [], "2d", "s");

const circleRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vu_VFu_Fu_VFu_Fu_VFu")], await loadFile("./editor/shader/render/util/circle.wgsl"), [], "2d", "s");

const alphaBuffers = {
    "0.5": GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [0.5], ["f32"])]),
    "1": GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [1], ["f32"])]),
};

const useingToolPanelInMode = {
    "メッシュ編集": {"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "x": DeleteTool, "j": EdgeJoinTool, "v": AppendVertex, "m": CreateEdgeTool},
    "ベジェ編集": {"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "x": DeleteTool, "j": EdgeJoinTool, "v": AppendVertex, "m": CreateEdgeTool},
    "ボーン編集": {"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "e": ExtrudeMove, "x": DeleteTool},
    "ボーンアニメーション編集": {"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "i": KeyframeInsertModal},
    "メッシュシェイプキー編集": {"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "i": KeyframeInsertModal},
    "ベジェシェイプキー編集": {"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "i": KeyframeInsertModal},
    "オブジェクト": {"p": ParentPickModal},
};

const useingSideBarPanelInMode = {
    "メッシュ編集": {
        "頂点": ActiveVertexPanel,
        "メッシュ": ActiveMeshPanel,
        "辺": ActiveEdgePanel,
    },
    "ベジェ編集": {
        "頂点": ActiveVertexPanel,
        "辺": ActiveVertexPanel,
    },
    "ボーン編集": {
        "頂点": ActiveVertexPanel,
    },
    "ボーンアニメーション編集": {
        "ボーン": ActiveBonePanel,
    },
    "メッシュウェイト編集": {
        "ウェイトペイント": WeightPaintPanel,
    }
}

class SpaceData {
    constructor() {
        this.visibleObjects = {graphicMesh: true, armature: true, bezierModifier: true, grid: true};
    }
}

export class Area_Viewer {
    constructor(area) {
        this.pixelDensity = 4;
        this.creatorForUI = area.creatorForUI;

        this.spaceData = new SpaceData();
        /** @type {ViewerSpaceData} */
        this.areasConfig = app.appConfig.areasConfig["Viewer"];

        this.areasConfig.areas.push(this);

        this.struct = {
            inputObject: {"context": app.context, "scene": app.scene, "o": this.spaceData, "areasConfig": this.areasConfig},
            DOM: [
                {tagType: "gridBox", style: "width: 100%; height: 100%;", axis: "r", allocation: "auto 1fr", children: [
                    {tagType: "option", name: "情報", children: [
                        {tagType: "gridBox", style: "padding: 2px;", class: "minLimitClear", axis: "c", allocation: "auto 1fr auto", children: [
                            {tagType: "flexBox", interval: "10px", children: [
                                {tagType: "heightCenter", children: [
                                    {tagType: "path", sourceObject: "context/activeObject", updateEventTarget: {path: "context/%activeObject"}, children: [
                                        {tagType: "if", formula: {source: "/type", conditions: "==", value: "グラフィックメッシュ"},
                                            true: [
                                                {tagType: "select", value: (value) => {app.context.setModeForSelected(value)}, sourceObject: ["オブジェクト", "メッシュ編集", "メッシュウェイト編集", "メッシュシェイプキー編集"], options: {initValue: "オブジェクト"}},
                                            ], false: [
                                                {tagType: "if", formula: {source: "/type", conditions: "==", value: "アーマチュア"},
                                                    true: [
                                                        {tagType: "select", value: (value) => {app.context.setModeForSelected(value)}, sourceObject: ["オブジェクト", "ボーン編集", "ボーンアニメーション編集"], options: {initValue: "オブジェクト"}},
                                                    ], false: [
                                                        {tagType: "select", value: (value) => {app.context.setModeForSelected(value)}, sourceObject: ["オブジェクト", "ベジェ編集", "ベジェウェイト編集", "ベジェシェイプキー編集"], options: {initValue: "オブジェクト"}},
                                                    ]
                                                }
                                            ],
                                        }
                                    ], errorChildren: [
                                        {tagType: "select", sourceObject: ["オブジェクト"], options: {initValue: "オブジェクト"}},
                                    ]},
                                ]},
                                {tagType: "heightCenter", children: [
                                    {tagType: "menu", title: "ビュー", struct: [
                                        {label: "カメラ", children: [
                                            {label: "すべてを表示", children: []},
                                        ]},
                                    ]},
                                ]},
                                {tagType: "heightCenter", children: [
                                    {tagType: "menu", title: "選択", struct: [
                                        {label: "すべて選択", children: [], submitFunction: () => {app.context.selectAll()}},
                                        {label: "属性選択", children: [], submitFunction: () => {app.context.selectByAttribute()}},
                                        {label: "選択解除", children: []},
                                        {label: "反転", children: []},
                                        {label: "ランダム選択", children: []},
                                    ]},
                                ]},
                                {tagType: "heightCenter", children: [
                                    {tagType: "menu", title: "追加", struct: [
                                        {label: "メッシュ", children: [
                                            {label: "板"},
                                            {label: "サークル"},
                                        ]},
                                        {label: "ベジェ", children: [
                                            {label: "板"},
                                            {label: "サークル"},
                                        ]},
                                    ]},
                                ]},
                                {tagType: "checks", icon: "test", options: {textContent: "test"}, withObjects: [{text: "graphicMesh", path: "o/visibleObjects/graphicMesh"},{text: "armature", path: "o/visibleObjects/armature"},{text: "bezierModifier", path: "o/visibleObjects/bezierModifier"}]},
                            ]},
                            {tagType: "padding", size: "10px"},
                            {tagType: "path", sourceObject: "context", updateEventTarget: {path: "context/%currentMode"}, children: [
                                {tagType: "if", formula: {source: "/currentMode", conditions: "==", value: "メッシュウェイト編集"},
                                true: [
                                    {tagType: "flexBox", interval: "10px", children: [
                                        {tagType: "heightCenter", children: [
                                            {tagType: "input", label: "値", value: "areasConfig/weightPaintMetaData/weightValue", type: "number", min: 0, max: 1, step: 0.01},
                                        ]},
                                        {tagType: "heightCenter", children: [
                                            {tagType: "input", label: "範囲", value: "areasConfig/weightPaintMetaData/decaySize", type: "number", min: 0, max: 1000, step: 0.01},
                                        ]},
                                        {tagType: "heightCenter", children: [
                                            {tagType: "select", label: "範囲", value: "areasConfig/weightPaintMetaData/decayType", sourceObject: ["ミックス","最大","最小"], options: {initValue: {path: "areasConfig/weightPaintMetaData/decayType"}}},
                                        ]},
                                        {tagType: "heightCenter", children: [
                                            {tagType: "select", label: "種類", value: "areasConfig/weightPaintMetaData/bezierType", sourceObject: [0,1], options: {initValue: "0"}},
                                        ]}
                                    ]},
                                ], false: [
                                    {tagType: "flexBox", interval: "10px", children: [
                                        {tagType: "heightCenter", children: [
                                            {tagType: "input", label: "プロポーショナル編集", type: "checkbox", checked: "areasConfig/proportionalMetaData/use", look: {check: "check", uncheck: "uncheck"}},
                                        ]},
                                        {tagType: "heightCenter", children: [
                                            {tagType: "select", label: "種類", value: "areasConfig/proportionalMetaData/type", sourceObject: ["リニア", "逆二乗", "一定"], options: {initValue: {path: "areasConfig/proportionalMetaData/type"}}},
                                        ]},
                                        {tagType: "heightCenter", children: [
                                            {tagType: "input", label: "半径", value: "areasConfig/proportionalMetaData/size", type: "number", min: 0, max: 10000},
                                        ]}
                                    ]},
                                ]}
                            ]},
                        ]}
                    ]},
                    {tagType: "box", id: "canvasContainer", style: "width: 100%; height: 100%; position: relative;", children: [
                        {tagType: "html", tag: "canvas", id: "renderingCanvas", style: "width: 100%; height: 100%; position: absolute;"},
                    ]},
                ]}
            ]
        }

        this.creatorForUI.create(area.main, this.struct, {padding: false});

        this.sideBarOperator = new ToolsBarOperator(this.creatorForUI.getDOMFromID("canvasContainer").element, {});
        this.toolPanelOperator = new ToolPanelOperator(this.creatorForUI.getDOMFromID("canvasContainer").element, {});

        this.canvas = this.creatorForUI.getDOMFromID("renderingCanvas");
        this.canvasRect = this.canvas.getBoundingClientRect();

        this.camera = new Camera();
        this.renderer = new Renderer(this.canvas, this.camera, this);
        this.convertCoordinate = new ConvertCoordinate(this.canvas,this.camera);

        // this.mouseState = {client: [0,0], click: false, rightClick: false, hold: false, holdFrameCount: 0, clickPosition: [0,0], clickPositionForGPU:[0,0], position: [0,0], lastPosition: [0,0], positionForGPU: [0,0], lastPositionForGPU: [0,0], movementForGPU: [0,0]};
        this.inputs = {click: [0,0], position: [0,0], movement: [0,0], clickPosition: [0,0], lastPosition: [0,0]};

        this.canvas.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        });

        resizeObserver.push(area.main, () => {
            // 要素の新しいサイズを取得
            this.canvasRect = this.canvas.getBoundingClientRect();
            this.canvas.width = this.canvasRect.width * this.pixelDensity;
            this.canvas.height = this.canvasRect.height * this.pixelDensity;
            this.renderer.resizeCVS();
        });

        const modeChangeEvent = () => {
            this.toolPanelOperator.changePanels(useingToolPanelInMode[app.context.currentMode]);
            this.sideBarOperator.changeShelfes(useingSideBarPanelInMode[app.context.currentMode]);
        }
        managerForDOMs.set({o: app.context, i: "currentMode"}, modeChangeEvent)
        modeChangeEvent();
    }

    async update() {
        this.renderer.rendering();
    }

    toolsUpdate() {
    }

    async keyInput(/** @type {InputManager} */ inputManager) {
        this.inputs.keysDown = inputManager.keysDown;
        this.inputs.keysPush = inputManager.keysPush;
        let consumed = await this.toolPanelOperator.keyInput(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
        const context = app.context;
        if (context.activeObject) {
            if (context.activeObject.type == "グラフィックメッシュ") {
                if (inputManager.consumeKeys(["Tab"])) {
                    if (context.currentMode == "オブジェクト") {
                        if (inputManager.consumeKeys(["a"])) {
                            context.setModeForSelected("メッシュシェイプキー編集");
                            // this.modalOperator.changeModals({"g": TranslateModal, "r": RotateModal, "s": ResizeModal});
                        } else if (inputManager.consumeKeys(["w"])) {
                            context.setModeForSelected("メッシュウェイト編集");
                            // this.modalOperator.changeModals({"e": ExtrudeMove,"x": DeleteTool});
                        } else {
                            context.setModeForSelected("メッシュ編集");
                            // this.modalOperator.changeModals({"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "p": ParentPickModal, "x": DeleteTool, "j": EdgeJoinTool, "v": AppendVertex, "m": CreateEdgeTool});
                            // this.modalOperator.changeModals({"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "p": ParentPickModal, "j": EdgeJoinTool, "v": AppendVertex, "m": CreateEdgeTool});
                        }
                    } else {
                        context.setModeForSelected("オブジェクト");
                        // this.modalOperator.changeModals({"p": ParentPickModal});
                    }
                } else if (inputManager.consumeKeys(["f"])) {
                    for (const object of app.context.selectedObjects) {
                        app.scene.editData.getEditObjectByObject(object).appendEdge();
                    }
                }
            } else if (context.activeObject.type == "アーマチュア") {
                if (inputManager.consumeKeys(["Tab"])) {
                    if (context.currentMode == "オブジェクト") {
                        if (inputManager.consumeKeys(["a"])) {
                            context.setModeForSelected("ボーンアニメーション編集");
                        } else {
                            context.setModeForSelected("ボーン編集");
                        }
                    } else {
                        context.setModeForSelected("オブジェクト");
                        this.toolPanelOperator.changePanels({"p": ParentPickModal});
                    }
                }
            } else if (context.activeObject.type == "ベジェモディファイア") {
                if (inputManager.consumeKeys(["Tab"])) {
                    if (context.currentMode == "オブジェクト") {
                        if (inputManager.consumeKeys(["a"])) {
                            context.setModeForSelected("ベジェシェイプキー編集");
                        } else if (inputManager.consumeKeys(["w"])) {
                            context.setModeForSelected("ベジェウェイト編集");
                            this.toolPanelOperator.changePanels({});
                        } else {
                            context.setModeForSelected("ベジェ編集");
                            // this.modalOperator.changeModals({"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "x": DeleteTool, "v": AppendPoint});
                        }
                    } else {
                        context.setModeForSelected("オブジェクト");
                        this.toolPanelOperator.changePanels({"p": ParentPickModal});
                    }
                }
            }
        }
    }

    async mousedown(/** @type {InputManager} */ inputManager) {
        const local = this.convertCoordinate.screenPosFromGPUPos(MathVec2.flipY(calculateLocalMousePosition(this.canvas, inputManager.position), this.canvas.offsetHeight)); // canvasないのlocal座標へ
        this.inputs.click = true;
        this.inputs.clickPosition = local;
        this.inputs.position = local;

        let consumed = await this.toolPanelOperator.mousedown(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;

        const context = app.context;
        if (context.currentMode == "オブジェクト") {
            const objects = await app.scene.rayCast([...this.inputs.clickPosition]);
            const frontObject = objects.length ? objects[0] : null;
            context.setSelectedObject(frontObject, inputManager.keysDown["Shift"]);
            context.setActiveObject(frontObject);
        } else if (context.currentMode == "メッシュ編集") {
            app.operator.appendCommand(new SelectOnlyVertexCommand(this.inputs.position, !inputManager.keysDown["Shift"]));
            app.operator.execute();
        } else if (context.currentMode == "ボーン編集") {
            // for (const armature of app.context.selectedObjects) {
            //     app.scene.runtimeData.armatureData.selectedForVertices(armature, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"]), circle: inputManager.keysDown["c"]});
            // }
            app.operator.appendCommand(new SelectOnlyVertexCommand(this.inputs.position, !inputManager.keysDown["Shift"]));
            app.operator.execute();
        } else if (context.currentMode == "ベジェ編集") {
            // for (const bezierModifier of app.context.selectedObjects) {
            //     app.scene.runtimeData.bezierModifierData.selectedForVertices(bezierModifier, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"])});
            // }
            app.operator.appendCommand(new SelectOnlyVertexCommand(this.inputs.position, !inputManager.keysDown["Shift"]));
            app.operator.execute();
        } else if (context.currentMode == "メッシュシェイプキー編集") {
            app.operator.appendCommand(new SelectOnlyVertexCommand(this.inputs.position, !inputManager.keysDown["Shift"]));
            app.operator.execute();
        } else if (context.currentMode == "ベジェシェイプキー編集") {
            app.operator.appendCommand(new SelectOnlyVertexCommand(this.inputs.position, !inputManager.keysDown["Shift"]));
            app.operator.execute();
        } else if (context.currentMode == "ボーンアニメーション編集") {
            app.operator.appendCommand(new SelectOnlyBoneCommand(this.inputs.position, !inputManager.keysDown["Shift"]));
            app.operator.execute();
        } else if (context.currentMode == "メッシュウェイト編集") {
            // if (inputManager.consumeKeys(["Alt"])) {
            //     await app.scene.runtimeData.armatureData.selectedForBone(app.context.activeObject.parent, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"])});
            //     const bone = app.scene.runtimeData.armatureData.getSelectBones();
            //     changeParameter(this.areasConfig.weightPaintMetaData, "boneIndex", bone[0].index);
            // } else {
            // }
            if (inputManager.consumeKeys(["Shift"])) {
                app.operator.appendCommand(new SelectOnlyBoneCommand(this.inputs.position, false));
                app.operator.execute();
            } else {
                this.toolPanelOperator.setPanel(WeightPaintModal, this.inputs);
            }
        } else if (context.currentMode == "ベジェウェイト編集") {
            if (inputManager.consumeKeys(["Shift"])) {
                app.operator.appendCommand(new SelectOnlyBoneCommand(this.inputs.position, false));
                app.operator.execute();
            } else {
                this.toolPanelOperator.setPanel(WeightPaintModal, this.inputs);
            }
        }
    }
    async mousemove(inputManager) {
        this.inputs.lastPosition = [...this.inputs.position];
        const local = this.convertCoordinate.screenPosFromGPUPos(MathVec2.flipY(calculateLocalMousePosition(this.canvas, inputManager.position), this.canvas.offsetHeight)); // canvasないのlocal座標へ
        MathVec2.sub(this.inputs.movement, local, this.inputs.position);
        this.inputs.position = local;

        let consumed = await this.toolPanelOperator.mousemove(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
    }
    async mouseup(inputManager) {
        let consumed = await this.toolPanelOperator.mouseup(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
    }

    wheel(inputManager) {
        if (app.input.keysDown["Alt"]) {
            this.camera.zoom += inputManager.wheelDelta[1] / 200;
            this.camera.zoom = Math.max(Math.min(this.camera.zoom,this.camera.zoomMax),this.camera.zoomMin);
        } else {
            this.camera.position = MathVec2.addR(this.camera.position, MathVec2.scaleR([inputManager.wheelDelta[0], -inputManager.wheelDelta[1]], 1 / this.camera.zoom));
        }
        this.camera.updateBuffer();
    }
}

export class Renderer {
    constructor(canvas, camera, /** @type {Area_Viewer} */ viewer) {
        console.log("レンダリングターゲット", canvas)
        this.canvas = canvas;
        this.context = canvas.getContext('webgpu');
        this.context.configure({
            device: device,
            format: format,
            // alphaMode: 'premultiplied',
            // size: [this.canvas.width, this.canvas.height]
        });
        this.camera = camera;
        this.viewer = viewer;

        this.canvasAspectBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32"]);
        this.resizeCVS();
        // レンダリングに使う汎用group
        this.staticGroup = GPU.createGroup(GPU.getGroupLayout("VFu_Fts"), [
            camera.cameraDataBuffer,
            GPU.sampler
        ]);
    }

    resizeCVS() {
        // this.context.configure({
        //     device: device,
        //     format: format,
        //     // alphaMode: 'premultiplied',
        //     size: [this.canvas.width, this.canvas.height]
        // });
        // GPU.writeBuffer(this.canvasAspectBuffer, new Float32Array([1 / this.canvas.width, 1 /  this.canvas.height]));
        this.depthTexture = GPU.createDepthTexture2D([this.canvas.width, this.canvas.height]);
        this.depthTextureView = this.depthTexture.createView();

        this.selectObjectMaskTexture = GPU.createTexture2D([this.canvas.width, this.canvas.height],"r8unorm");
        this.selectObjectMaskTextureView = this.selectObjectMaskTexture.createView();

        this.camera.updateCanvasSize([this.canvas.offsetWidth, this.canvas.offsetHeight]);
    }

    rendering() {
        const view = this.context.getCurrentTexture().createView();
        if (!view) {
            console.warn("レンダリング対象が取得できません");
            return ;
        }
        const commandEncoder = device.createCommandEncoder();
        if (app.context.currentMode == "オブジェクト") {
            if (true) { // 選択オブジェクトのアウトライン検出
                const selectObjectOutlineRenderPass = commandEncoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: this.selectObjectMaskTextureView,
                            clearValue: { r: 0, g: 0, b: 0, a: 0 },
                            loadOp: 'clear',
                            storeOp: 'store',
                        },
                    ],
                });
                // オブジェクト表示
                selectObjectOutlineRenderPass.setBindGroup(0, this.staticGroup);
                const selectedObjects = app.context.selectedObjects;
                app.scene.allRenderingOrder.filter(object => selectedObjects.includes(object)).forEach((object, index) => {
                    if (object == app.context.activeObject) {
                        // selectObjectOutlineRenderPass.setBindGroup(3, GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [244 / 255], ["f32"])]));
                        selectObjectOutlineRenderPass.setBindGroup(3, GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [1 / 255], ["f32"])]));
                    } else{
                        selectObjectOutlineRenderPass.setBindGroup(3, GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [(index + 2) / 255], ["f32"])]));
                    }
                    if (object.type == "グラフィックメッシュ") {
                        selectObjectOutlineRenderPass.setBindGroup(1, app.scene.runtimeData.graphicMeshData.renderGroup);
                        selectObjectOutlineRenderPass.setBindGroup(2, object.maskRenderGroup);
                        selectObjectOutlineRenderPass.setVertexBuffer(0, app.scene.runtimeData.graphicMeshData.meshes.buffer, object.runtimeOffsetData.start.meshesOffset * app.scene.runtimeData.graphicMeshData.meshBlockByteLength, object.meshesNum * app.scene.runtimeData.graphicMeshData.meshBlockByteLength);
                        selectObjectOutlineRenderPass.setPipeline(selectObjectOutlinePipeline);
                        selectObjectOutlineRenderPass.draw(object.meshesNum * 3, 1, 0, 0);
                    } else if (object.type == "アーマチュア") {
                        selectObjectOutlineRenderPass.setBindGroup(1, app.scene.runtimeData.armatureData.renderingGizumoGroup);
                        selectObjectOutlineRenderPass.setBindGroup(2, object.objectDataGroup);
                        selectObjectOutlineRenderPass.setPipeline(selectObjectOutlineBoneRenderPipeline);
                        selectObjectOutlineRenderPass.draw(3 * 2, object.bonesNum, 0, 0);
                    } else if (object.type == "ベジェモディファイア") {
                        selectObjectOutlineRenderPass.setBindGroup(1, app.scene.runtimeData.bezierModifierData.renderingGizumoGroup);
                        selectObjectOutlineRenderPass.setBindGroup(2, object.objectDataGroup);
                        selectObjectOutlineRenderPass.setPipeline(selectObjectOutlineBezierRenderPipeline);
                        selectObjectOutlineRenderPass.draw(2 * 50, object.pointsNum - 1, 0, 0);
                    }
                })
                // 処理の終了と送信
                selectObjectOutlineRenderPass.end();
            }
        }
        for (const maskTexture of app.scene.objects.maskTextures) {
            if (maskTexture.renderingObjects.length > 0 && maskTexture.name != "base") {
                const maskRenderPass = commandEncoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: maskTexture.view,
                            clearValue: { r: 0, g: 0, b: 0, a: 0 },
                            loadOp: 'clear',
                            storeOp: 'store',
                        },
                    ],
                });
                // オブジェクト表示
                maskRenderPass.setPipeline(maskRenderPipeline);
                maskRenderPass.setBindGroup(0, this.staticGroup);
                maskRenderPass.setBindGroup(1, app.scene.runtimeData.graphicMeshData.renderGroup);
                for (const graphicMesh of maskTexture.renderingObjects) {
                    maskRenderPass.setBindGroup(2, graphicMesh.maskRenderGroup);
                    maskRenderPass.setVertexBuffer(0, app.scene.runtimeData.graphicMeshData.meshes.buffer, graphicMesh.runtimeOffsetData.start.meshesOffset * app.scene.runtimeData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.runtimeData.graphicMeshData.meshBlockByteLength);
                    maskRenderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);
                }
                // 処理の終了と送信
                maskRenderPass.end();
            }
        }
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: view,
                    clearValue: app.scene.world.color,
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: this.depthTextureView,
                depthLoadOp: 'clear',
                depthClearValue: 1.0,
                depthStoreOp: 'store',
            },
        });
        renderPass.setBindGroup(0, this.staticGroup);
        // グリッド
        if (true) {
            renderPass.setPipeline(renderGridPipeline);
            renderPass.draw(4, 1, 0, 0);
        }
        // メイン表示
        if (app.scene.objects.graphicMeshs.length) {
            renderPass.setPipeline(renderPipeline);
            renderPass.setBindGroup(1, app.scene.runtimeData.graphicMeshData.renderGroup);
            for (const graphicMesh of app.scene.renderingOrder) {
                if (graphicMesh.mode == "オブジェクト" && graphicMesh.visible) {
                    renderPass.setBindGroup(2, graphicMesh.renderGroup);
                    renderPass.setBindGroup(3, alphaBuffers["1"]);
                    renderPass.setVertexBuffer(0, app.scene.runtimeData.graphicMeshData.meshes.buffer, graphicMesh.runtimeOffsetData.start.meshesOffset * app.scene.runtimeData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.runtimeData.graphicMeshData.meshBlockByteLength);
                    renderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);
                } else if (graphicMesh.mode == "メッシュ編集") {
                    const bm = app.scene.editData.getEditObjectByObject(graphicMesh);
                    renderPass.setBindGroup(1, bm.renderingGroup);
                    renderPass.setPipeline(BMeshMainRenderPipeline);
                    renderPass.draw(3 * bm.meshesNum, 1, 0, 0); // 3つの頂点から三角形を表示する * meshNum

                    // パイプラインやグループを元に戻す
                    renderPass.setPipeline(renderPipeline);
                    renderPass.setBindGroup(1, app.scene.runtimeData.graphicMeshData.renderGroup);
                } else if (graphicMesh.mode == "メッシュウェイト編集") {
                    const bmw = app.scene.editData.getEditObjectByObject(graphicMesh);
                    renderPass.setBindGroup(1, bmw.renderingGroup);
                    renderPass.setPipeline(BMWMeshsRenderPipeline);
                    renderPass.draw(3 * bmw.meshesNum, 1, 0, 0); // 3つの頂点から三角形を表示する * meshNum

                    // パイプラインやグループを元に戻す
                    renderPass.setPipeline(renderPipeline);
                    renderPass.setBindGroup(1, app.scene.runtimeData.graphicMeshData.renderGroup);
                } else if (graphicMesh.mode == "メッシュシェイプキー編集") {
                    const bms = app.scene.editData.getEditObjectByObject(graphicMesh);
                    renderPass.setBindGroup(1, bms.renderingGroup);
                    renderPass.setPipeline(BMSMainRenderPipeline);
                    renderPass.draw(3 * bms.meshesNum, 1, 0, 0); // 3つの頂点から三角形を表示する * meshNum

                    // パイプラインやグループを元に戻す
                    renderPass.setPipeline(renderPipeline);
                    renderPass.setBindGroup(1, app.scene.runtimeData.graphicMeshData.renderGroup);
                }
            }
        }
        if (app.scene.objects.particles.length) {
            renderPass.setPipeline(renderParticlePipeline);
            renderPass.setBindGroup(1, app.scene.runtimeData.particle.renderingGroup);
            for (const /** @type {Particle} */ particle of app.scene.objects.particles) {
                renderPass.setBindGroup(2, particle.objectDataGroup);
                renderPass.draw(4, particle.particlesNum, 0, 0);
            }
        }
        // エディット表示
        if (app.scene.objects.graphicMeshs.length) {
            if (this.viewer.spaceData.visibleObjects.graphicMesh) {
                for (const graphicMesh of app.scene.renderingOrder) {
                    if (graphicMesh.visible) {
                        // モード別
                        if (graphicMesh.mode == "メッシュ編集") {
                            const bm = app.scene.editData.getEditObjectByObject(graphicMesh);
                            renderPass.setBindGroup(1, bm.renderingGroup);
                            renderPass.setPipeline(BMeshMeshRenderPipeline);
                            renderPass.draw(3 * 4, bm.meshesNum, 0, 0); // 3つの辺を4つの頂点から四角形で表示する
                            renderPass.setPipeline(BMeshEdgeRenderPipeline);
                            renderPass.draw(4, bm.edgesNum, 0, 0); // 4つの頂点から四角形で表示する
                            renderPass.setPipeline(BMeshSilhouetteEdgeRenderPipeline);
                            renderPass.draw(4, bm.silhouetteEdgesNum, 0, 0); // 4つの頂点から四角形で表示する
                            renderPass.setPipeline(BMeshVerticesRenderPipeline);
                            renderPass.draw(4, bm.verticesNum, 0, 0); // 4つの頂点から四角形を表示
                        } else if (graphicMesh.mode == "メッシュウェイト編集") {
                            const bmw = app.scene.editData.getEditObjectByObject(graphicMesh);
                            renderPass.setBindGroup(1, bmw.renderingGroup);
                            renderPass.setPipeline(BMWWeightsRenderPipeline);
                            renderPass.draw(4, bmw.verticesNum, 0, 0);
                        } else if (graphicMesh.mode == "メッシュシェイプキー編集") {
                            const bms = app.scene.editData.getEditObjectByObject(graphicMesh);
                            renderPass.setBindGroup(1, bms.renderingGroup);
                            renderPass.setPipeline(BMSMeshsRenderPipeline);
                            renderPass.draw(3 * 4, bms.meshesNum, 0, 0); // 3つの頂点から三角形を表示する * meshNum
                            renderPass.setPipeline(BMSVerticesRenderPipeline);
                            renderPass.draw(4, bms.verticesNum, 0, 0); // 3つの頂点から三角形を表示する * meshNum
                        } else if (graphicMesh.mode == "オブジェクト") {
                        }
                    }
                }
            }
        }
        if (this.viewer.spaceData.visibleObjects.armature && app.scene.objects.armatures.length) {
            renderPass.setBindGroup(1, app.scene.runtimeData.armatureData.renderingGizumoGroup);
            renderPass.setPipeline(boneBoneRenderPipeline);
            for (const armature of app.scene.objects.armatures) {
                if (armature.visible) {
                    if (armature.mode == "ボーン編集") {
                        const ba = app.scene.editData.getEditObjectByObject(armature);
                        renderPass.setBindGroup(1, ba.renderingGroup);
                        renderPass.setPipeline(BArmatureBonesRenderPipeline);
                        renderPass.draw(4, ba.bonesNum, 0, 0);
                        renderPass.setPipeline(BArmatureVerticesRenderPipeline);
                        renderPass.draw(6 * 2, ba.bonesNum, 0, 0); // 4つの頂点から四角形で表示する
                        // renderPass.setPipeline(boneRelationshipsRenderPipeline);
                        // renderPass.draw(4, bm.bonesNum, 0, 0); // 4つの頂点から四角形で表示する
    
                        renderPass.setBindGroup(1, app.scene.runtimeData.armatureData.renderingGizumoGroup);
                        renderPass.setPipeline(boneBoneRenderPipeline);
                    } else if (armature.mode == "ボーンアニメーション編集" || armature.mode == "メッシュウェイト編集" || armature.mode == "ベジェウェイト編集") {
                        const baa = app.scene.editData.getEditObjectByObject(armature);
                        renderPass.setBindGroup(1, baa.renderingGroup);
                        renderPass.setPipeline(BAABoneRenderPipeline);
                        renderPass.draw(4, baa.bonesNum, 0, 0);
    
                        renderPass.setBindGroup(1, app.scene.runtimeData.armatureData.renderingGizumoGroup);
                        renderPass.setPipeline(boneBoneRenderPipeline);
                    } else {
                        renderPass.setBindGroup(2, armature.objectDataGroup);
                        renderPass.draw(4, armature.bonesNum, 0, 0);
                    }
                }
            }
        }
        if (this.viewer.spaceData.visibleObjects.bezierModifier && app.scene.objects.bezierModifiers.length) {
            renderPass.setBindGroup(1, app.scene.runtimeData.bezierModifierData.renderingGizumoGroup);
            renderPass.setPipeline(bezierRenderPipeline);
            for (const bezierModifier of app.scene.objects.bezierModifiers) {
                if (bezierModifier.visible) {
                    if (bezierModifier.mode == "ベジェ編集" || bezierModifier.mode == "ベジェシェイプキー編集") {
                        /** @type {BBezier} */
                        const bb = app.scene.editData.getEditObjectByObject(bezierModifier);
                        renderPass.setBindGroup(1, bb.renderingGroup);
                        renderPass.setPipeline(BBezierVerticesRenderPipeline);
                        renderPass.draw(2 * 3 * 3, bb.pointsNum, 0, 0);
                        renderPass.setPipeline(BBezierBezierRenderPipeline);
                        renderPass.draw(2 * 50, bb.pointsNum - 1, 0, 0);

                        renderPass.setBindGroup(1, app.scene.runtimeData.bezierModifierData.renderingGizumoGroup);
                        renderPass.setPipeline(bezierRenderPipeline);
                    } else if (bezierModifier.mode == "ベジェウェイト編集") {
                        /** @type {BBezierWeight} */
                        const bbw = app.scene.editData.getEditObjectByObject(bezierModifier);
                        renderPass.setBindGroup(1, bbw.renderingGroup);
                        renderPass.setPipeline(BBezierWeightsRenderPipeline);
                        renderPass.draw(4, bbw.verticesNum, 0, 0);
                        renderPass.setPipeline(BBezierBezierRenderPipeline);
                        renderPass.draw(2 * 50, bbw.pointsNum - 1, 0, 0);

                        renderPass.setBindGroup(1, app.scene.runtimeData.bezierModifierData.renderingGizumoGroup);
                        renderPass.setPipeline(bezierRenderPipeline);
                    } else {
                        renderPass.setBindGroup(2, bezierModifier.objectDataGroup);
                        renderPass.draw(2 * 50, bezierModifier.pointsNum - 1, 0, 0);
                    }
                }
            }
        }
        // if (true && app.scene.objects.maskTextures.length > 1) {
        //     renderPass.setBindGroup(0, GPU.createGroup(GPU.getGroupLayout("Fts_Ft"), [GPU.sampler, app.scene.objects.maskTextures[1].view]));
        //     renderPass.setPipeline(devMaskTexturePipeline);
        //     renderPass.draw(4, 1, 0, 0);
        // }
        // if (true && app.scene.objects.maskTextures.length > 1) {
        //     renderPass.setBindGroup(0, GPU.createGroup(GPU.getGroupLayout("Fts_Ft"), [GPU.sampler, this.selectObjectMaskTextureView]));
        //     renderPass.setPipeline(devMaskTexturePipeline);
        //     renderPass.draw(4, 1, 0, 0);
        // }
        if (true) { // マウスのポインター
            if (["ベジェウェイト編集", "メッシュウェイト編集"].includes(app.context.currentMode)) {
                renderPass.setBindGroup(1, GPU.createGroup(GPU.getGroupLayout("Vu_VFu_Fu_VFu_Fu_VFu"), [
                    GPU.createUniformBuffer(2 * 4, this.viewer.inputs.position, ["f32", "f32"]),
                    GPU.createUniformBuffer(1 * 4, [app.appConfig.areasConfig["Viewer"].weightPaintMetaData.decaySize], ["f32"]),
                    GPU.createUniformBuffer(4 * 4, [1,0,0,0.1], ["f32", "f32", "f32", "f32"]),
                    GPU.createUniformBuffer(1 * 4, [2], ["f32"]),
                    GPU.createUniformBuffer(4 * 4, [0.7,0.2,0.2,1], ["f32", "f32", "f32", "f32"]),
                    GPU.createUniformBuffer(2 * 4, [1, 0], ["f32", "f32"]), // radius, strokeWidthがカメラのズームに影響を受けるか(1が受ける0が受けない)
                ]));
                renderPass.setPipeline(circleRenderPipeline);
                renderPass.draw(4, 1, 0, 0);
            } else if (["ベジェ編集", "メッシュ編集", "ボーン編集"].includes(app.context.currentMode) && app.appConfig.areasConfig["Viewer"].proportionalMetaData.use) {
                renderPass.setBindGroup(1, GPU.createGroup(GPU.getGroupLayout("Vu_VFu_Fu_VFu_Fu_VFu"), [
                    GPU.createUniformBuffer(2 * 4, this.viewer.inputs.position, ["f32", "f32"]),
                    GPU.createUniformBuffer(1 * 4, [app.appConfig.areasConfig["Viewer"].proportionalMetaData.size], ["f32"]),
                    GPU.createUniformBuffer(4 * 4, [1,0,0,0.1], ["f32", "f32", "f32", "f32"]),
                    GPU.createUniformBuffer(1 * 4, [2], ["f32"]),
                    GPU.createUniformBuffer(4 * 4, [0.7,0.2,0.2,1], ["f32", "f32", "f32", "f32"]),
                    GPU.createUniformBuffer(2 * 4, [1, 0], ["f32", "f32"]), // radius, strokeWidthがカメラのズームに影響を受けるか(1が受ける0が受けない)
                ]));
                renderPass.setPipeline(circleRenderPipeline);
                renderPass.draw(4, 1, 0, 0);
            }
        }
        if (app.context.currentMode == "オブジェクト") {
            renderPass.setBindGroup(0, GPU.createGroup(GPU.getGroupLayout("Fts_Ft_Fu"), [GPU.sampler, this.selectObjectMaskTextureView, GPU.createUniformBuffer(4 * 4, [1, 0.4, 0.2, 1], ["f32", "f32", "f32", "f32"])]));
            renderPass.setPipeline(selectObjectOutlineMixPipeline);
            renderPass.draw(4, 1, 0, 0);
        }
        // 処理の終了と送信
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    }
}