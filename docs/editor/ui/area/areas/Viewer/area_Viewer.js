import { ConvertCoordinate } from '../../../../utils/convertCoordinate.js';
import { resizeObserver } from '../../../../utils/ui/resizeObserver.js';
import { TranslateModal } from './tools/TranslateTool.js';
import { RotateModal } from './tools/RotateTool.js';
import { ResizeModal } from './tools/ResizeTool.js';
import { ExtrudeMove } from './tools/ExtrudeMove.js';
import { ParentPickModal } from './tools/ParentPick.js';
import { DeleteTool } from './tools/Delete.js';
import { WeightPaintModal } from './tools/WeightPaintTool.js';
import { ToolsBarOperator } from '../../../../operators/toolsBarOperator.js';
import { BonePropertyModal } from './toolBar/bone.js';
import { ArmaturePropertyModal } from './toolBar/armature.js';
import { EdgeJoinTool } from './tools/EdgeJoin.js';
import { AppendVertex } from './tools/appendVertex.js';
import { app } from '../../../../app/app.js';
import { device, format, GPU } from "../../../../utils/webGPU.js";
import { sampler } from '../../../../utils/GPUObject.js';
import { boolTo0or1, calculateLocalMousePosition, changeParameter, loadFile } from '../../../../utils/utility.js';
import { vec2 } from '../../../../utils/mathVec.js';
import { Camera } from '../../../../core/objects/camera.js';
import { BoneAttachmentsModal } from './toolBar/Attachments.js';
import { InputManager } from '../../../../app/inputManager/inputManager.js';
import { ViewerSpaceData } from './area_ViewerSpaceData.js';
import { ModalOperator } from '../../../../operators/modalOperator.js';

const renderGridPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts")], await fetch('./editor/shader/render/grid.wgsl').then(x => x.text()), [], "2d", "s");
const renderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft_Ft_Fu"), GPU.getGroupLayout("Fu")], await loadFile("./editor/shader/render/main.wgsl"), [["u"]], "2d", "t");
const maskRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft")], await loadFile("./editor/shader/render/mask.wgsl"), [["u"]], "mask", "t");

const verticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/graphicMesh/verticesShader.wgsl"), [], "2d", "s");
const graphicMeshsMeshRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu_Vsr_Vsr")], await loadFile("./editor/shader/render/graphicMesh/meshShader.wgsl"), [], "2d", "s");
const graphicMeshsEdgeRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu_Vsr_Vsr")], await loadFile("./editor/shader/render/graphicMesh/edgeShader.wgsl"), [], "2d", "s");
const graphicMeshsSilhouetteEdgeRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu_Vsr_Vsr")], await loadFile("./editor/shader/render/graphicMesh/silhouetteEdgesShader.wgsl"), [], "2d", "s");
const graphicMeshsWeightRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu"), GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/graphicMesh/weightShader.wgsl"), [], "2d", "s");

const boneVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/bone/vertices.wgsl"), [], "2d", "t");
const boneBoneRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/bone/bone.wgsl"), [], "2d", "t");
const boneRelationshipsRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/bone/relationships.wgsl"), [], "2d", "s");

const bezierRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/bezier/bezier.wgsl"), [], "2d", "s");
const bezierVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/bezier/vertices.wgsl"), [], "2d", "t");
const bezierWeightRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr"),GPU.getGroupLayout("Vu"),GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/bezier/weight.wgsl"), [], "2d", "s");

const alphaBuffers = {
    "0.5": GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [0.5], ["f32"])]),
    "1": GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [1], ["f32"])]),
};

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

        this.struct = {
            inputObject: {"h": app.hierarchy, "scene": app.scene, "o": this.spaceData, "areasConfig": this.areasConfig},
            DOM: [
                {type: "gridBox", style: "width: 100%; height: 100%;", axis: "r", allocation: "auto 1fr", children: [
                    {type: "option", style: "padding: 5px", class: "sharpBoder", name: "情報", children: [
                        {type: "gridBox", axis: "c", allocation: "auto 1fr auto", children: [
                            {type: "flexBox", interval: "10px", children: [
                                {type: "path", sourceObject: "scene/state/activeObject", updateEventTarget: {path: "scene/state/%activeObject"}, children: [
                                    {type: "if", formula: {source: "/type", conditions: "==", value: "グラフィックメッシュ"},
                                        true: [
                                            {type: "select", label: "tool", writeObject: (value) => {app.scene.state.setModeForSelected(value)}, sourceObject: ["オブジェクト", "メッシュ編集", "メッシュウェイト編集", "メッシュアニメーション編集"], options: {initValue: "オブジェクト"}},
                                        ], false: [
                                            {type: "if", formula: {source: "/type", conditions: "==", value: "アーマチュア"},
                                                true: [
                                                    {type: "select", label: "tool", writeObject: (value) => {app.scene.state.setModeForSelected(value)}, sourceObject: ["オブジェクト", "ボーン編集", "ボーンアニメーション編集"], options: {initValue: "オブジェクト"}},
                                                ], false: [
                                                    {type: "select", label: "tool", writeObject: (value) => {app.scene.state.setModeForSelected(value)}, sourceObject: ["オブジェクト", "ベジェ編集", "ベジェウェイト編集", "ベジェアニメーション編集"], options: {initValue: "オブジェクト"}},
                                                ]
                                            }
                                        ],
                                    }
                                ], errorChildren: [
                                    {type: "select", label: "tool", sourceObject: ["オブジェクト"], options: {initValue: "オブジェクト"}},
                                ]},
                                {type: "flexBox", interval: "5px", name: "", children: [
                                    {type: "radios", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                                ]},
                                {type: "flexBox", interval: "5px", name: "", children: [
                                    {type: "checks", icon: "test", label: "test", options: {textContent: "test"}, withObjects: [{text: "graphicMesh", path: "o/visibleObjects/graphicMesh"},{text: "armature", path: "o/visibleObjects/armature"},{text: "bezierModifier", path: "o/visibleObjects/bezierModifier"}]},
                                ]},
                                {type: "path", sourceObject: "scene/state", updateEventTarget: {path: "scene/state/%currentMode"}, children: [
                                    {type: "if", formula: {source: "/currentMode", conditions: "==", value: "メッシュ編集"},
                                        true: [
                                            {type: "select", label: "tool", writeObject: (value) => {app.scene.state.setModeForSelected(value)}, sourceObject: ["すべて選択", "メッシュ"], options: {initValue: "すべて選択"}},
                                        ], false: [
                                            {type: "if", formula: {source: "/currentMode", conditions: "==", value: "ボーン編集"},
                                            true: [
                                                {type: "select", label: "tool", writeObject: (value) => {app.scene.state.setModeForSelected(value)}, sourceObject: ["すべて選択", "ボーン"], options: {initValue: "すべて選択"}},
                                            ], false: [
                                                    {type: "if", formula: {source: "/currentMode", conditions: "==", value: "ボーン編集"},
                                                    true: [
                                                        {type: "select", label: "tool", writeObject: (value) => {app.scene.state.setModeForSelected(value)}, sourceObject: ["すべて選択", "ベジェ"], options: {initValue: "すべて選択"}},
                                                    ], false: [
                                                        {type: "select", label: "tool", writeObject: (value) => {app.scene.state.setModeForSelected(value)}, sourceObject: ["すべて選択"], options: {initValue: "すべて選択"}},
                                                    ]}
                                                ]
                                            }
                                        ],
                                    }
                                ]},
                            ]},
                            {type: "padding", size: "10px"},
                            {type: "path", sourceObject: "scene/state", updateEventTarget: {path: "scene/state/%currentMode"}, children: [
                                {type: "if", formula: {source: "/currentMode", conditions: "==", value: "メッシュウェイト編集"},
                                true: [
                                    {type: "gridBox", axis: "c", allocation: "1fr auto auto auto auto auto 1fr", children: [
                                        {type: "padding", size: "10px"},
                                        {type: "flexBox", interval: "5px", name: "", children: [
                                            {type: "heightCenter", children: [
                                                {type: "input", label: "値", withObject: "areasConfig/weightPaintMetaData/weightValue", options: {type: "number", min: 0, max: 1, step: 0.01}, custom: {visual: "1"}},
                                            ]}
                                        ]},
                                        {type: "separator", size: "10px"},
                                        {type: "flexBox", interval: "5px", name: "", children: [
                                            {type: "heightCenter", children: [
                                                {type: "select", label: "ベジェの種類", writeObject: "areasConfig/weightPaintMetaData/bezierType", sourceObject: [0,1], options: {initValue: "0"}},
                                            ]}
                                        ]},
                                        {type: "separator", size: "10px"},
                                        {type: "flexBox", interval: "5px", name: "", children: [
                                            {type: "heightCenter", children: [
                                                {type: "input", label: "塗り範囲", withObject: "areasConfig/weightPaintMetaData/paintSize", options: {type: "number", min: 0, max: 1000, step: 0.01}, custom: {visual: "1"}},
                                            ]}
                                        ]},
                                        {type: "padding", size: "10px"},
                                    ]},
                                ], false: [
                                    {type: "gridBox", axis: "c", allocation: "1fr auto auto auto auto auto 1fr", children: [
                                        {type: "padding", size: "10px"},
                                        {type: "flexBox", interval: "5px", name: "", children: [
                                            {type: "buttons", icon: "test", label: "test", options: {textContent: "test"}},
                                        ]},
                                        {type: "separator", size: "10px"},
                                        {type: "flexBox", interval: "5px", name: "", children: [
                                            {type: "heightCenter", children: [
                                                {type: "select", label: "種類", writeObject: "areasConfig/proportionalEditType", sourceObject: "areasConfig/proportionalEditTypes", options: {initValue: "0"}},
                                            ]}
                                        ]},
                                        {type: "separator", size: "10px"},
                                        {type: "flexBox", interval: "5px", name: "", children: [
                                            {type: "heightCenter", children: [
                                                {type: "input", label: "影響範囲", withObject: "areasConfig/proportionalSize", options: {type: "number", min: 0}, custom: {visual: "1"}},
                                            ]}
                                        ]},
                                        {type: "padding", size: "10px"},
                                    ]},
                                ]}
                            ]},
                        ]}
                    ]},
                    {type: "box", id: "canvasContainer", style: "width: 100%; height: 100%; position: relative;", children: [
                        {type: "canvas", id: "renderingCanvas", style: "width: 100%; height: 100%; position: absolute;"},
                    ]},
                ]}
            ]
        }

        this.creatorForUI.create(area.main, this.struct, {padding: false});

        this.sideBarOperator = new ToolsBarOperator(this.creatorForUI.getDOMFromID("canvasContainer"), [ArmaturePropertyModal,BonePropertyModal,BoneAttachmentsModal]);
        this.modalOperator = new ModalOperator(this.creatorForUI.getDOMFromID("canvasContainer"), {"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "e": ExtrudeMove, "p": ParentPickModal, "x": DeleteTool, "j": EdgeJoinTool, "v": AppendVertex});

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
    }

    async update() {
        if (app.scene.state.currentMode == "メッシュ編集") {
            const animatoinBlock = app.scene.state.activeObject.animationBlock;
            for (const animation of animatoinBlock.list) {
                changeParameter(animation, "weight", 0);
            }
        } else if (app.scene.state.currentMode == "ボーン編集") {
            app.scene.state.selectedObject.forEach(object => object.clearAnimatoin());
        } else if (app.scene.state.currentMode == "メッシュ頂点アニメーション編集") {
            const animatoinBlock = app.scene.state.activeObject.animationBlock;
            for (const animation of animatoinBlock.list) {
                changeParameter(animation, "weight", 0);
            }
            changeParameter(animatoinBlock.activeAnimation, "weight", 1);
        } else if (app.scene.state.currentMode == "ベジェ頂点アニメーション編集") {
            const animatoinBlock = app.scene.state.activeObject.animationBlock;
            for (const animation of animatoinBlock.list) {
                changeParameter(animation, "weight", 0);
            }
            changeParameter(animatoinBlock.activeAnimation, "weight", 1);
        }
        this.renderer.rendering();
    }

    toolsUpdate() {
    }

    async keyInput(/** @type {InputManager} */ inputManager) {
        this.inputs.keysDown = inputManager.keysDown;
        this.inputs.keysPush = inputManager.keysPush;
        let consumed = await this.modalOperator.keyInput(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
        const state = app.scene.state;
        if (state.activeObject) {
            if (state.activeObject.type == "グラフィックメッシュ") {
                if (inputManager.consumeKeys(["Tab"])) {
                    if (state.currentMode == "オブジェクト") {
                        if (state.activeObject.animationBlock.activeAnimation && inputManager.consumeKeys(["a"])) {
                            state.setModeForSelected("メッシュ頂点アニメーション編集");
                        } else if (inputManager.consumeKeys(["w"])) {
                            state.setModeForSelected("メッシュウェイト編集");
                        } else {
                            state.setModeForSelected("メッシュ編集");
                        }
                    } else {
                        state.setModeForSelected("オブジェクト");
                    }
                }
            } else if (state.activeObject.type == "アーマチュア") {
                if (inputManager.consumeKeys(["Tab"])) {
                    if (state.currentMode == "オブジェクト") {
                        if (inputManager.consumeKeys(["a"])) {
                            state.setModeForSelected("ボーンアニメーション編集");
                        } else {
                            state.setModeForSelected("ボーン編集");
                        }
                    } else {
                        state.setModeForSelected("オブジェクト");
                    }
                }
                if (inputManager.consumeKeys(["i"])) {
                    const bones = app.scene.state.getSelectBone();
                    bones.forEach(bone => {
                        app.options.keyframeInsert(bone, app.scene.frame_current);
                    })
                }
            } else if (state.activeObject.type == "ベジェモディファイア") {
                if (inputManager.consumeKeys(["Tab"])) {
                    if (state.currentMode == "オブジェクト") {
                        if (state.activeObject.animationBlock.activeAnimation && inputManager.consumeKeys(["a"])) {
                            state.setModeForSelected("ベジェ頂点アニメーション編集");
                        } else if (inputManager.consumeKeys(["w"])) {
                            state.setModeForSelected("ベジェウェイト編集");
                        } else {
                            state.setModeForSelected("ベジェ編集");
                        }
                    } else {
                        state.setModeForSelected("オブジェクト");
                    }
                }
            }
        }
        if (state.activeObject.type == "オブジェクト") {
            if (inputManager.consumeKeys(["a"])) {
                app.scene.state.selectAll();
            }
        }
    }

    async mousedown(/** @type {InputManager} */ inputManager) {
        const local = this.convertCoordinate.screenPosFromGPUPos(vec2.flipY(calculateLocalMousePosition(this.canvas, inputManager.position), this.canvas.offsetHeight)); // canvasないのlocal座標へ
        this.inputs.click = true;
        this.inputs.clickPosition = local;
        this.inputs.position = local;

        let consumed = await this.modalOperator.mousedown(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;

        const state = app.scene.state;
        if (state.currentMode == "オブジェクト") {
            const objects = await app.scene.selectedForObject([...this.inputs.clickPosition]);
            const frontObject = objects.length ? objects[0] : null;
            state.setSelectedObject(frontObject, inputManager.keysDown["Shift"]);
            state.setActiveObject(frontObject);
        } else if (state.currentMode == "メッシュ編集") {
            for (const graphicMesh of app.scene.state.selectedObject) {
                app.scene.runtimeData.graphicMeshData.selectedForVertices(graphicMesh, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"])});
            }
        } else if (state.currentMode == "ボーン編集") {
            for (const armature of app.scene.state.selectedObject) {
                app.scene.runtimeData.armatureData.selectedForVertices(armature, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"]), circle: inputManager.keysDown["c"]});
            }
        } else if (state.currentMode == "ベジェ編集") {
            for (const bezierModifier of app.scene.state.selectedObject) {
                app.scene.runtimeData.bezierModifierData.selectedForVertices(bezierModifier, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"])});
            }
        } else if (state.currentMode == "メッシュ頂点アニメーション編集") {
            app.scene.runtimeData.graphicMeshData.selectedForVertices(app.scene.state.activeObject, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"])});
        } else if (state.currentMode == "ベジェ頂点アニメーション編集") {
            app.scene.runtimeData.bezierModifierData.selectedForVertices(app.scene.state.activeObject, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"])});
        } else if (state.currentMode == "ボーンアニメーション編集") {
            for (const armature of app.scene.state.selectedObject) {
                await app.scene.runtimeData.armatureData.selectedForBone(armature, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"])});
            }
        } else if (state.currentMode == "メッシュウェイト編集") {
            if (inputManager.consumeKeys(["Alt"])) {
                await app.scene.runtimeData.armatureData.selectedForBone(app.scene.state.activeObject.parent, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"])});
                const bone = app.scene.runtimeData.armatureData.getSelectBone();
                changeParameter(this.areasConfig.weightPaintMetaData, "boneIndex", bone[0].index);
            } else {
                this.modalOperator.setModal(WeightPaintModal, this.inputs);
            }
        } else if (state.currentMode == "ベジェウェイト編集") {
            if (inputManager.consumeKeys(["Alt"])) {
                await app.scene.runtimeData.armatureData.selectedForBone(app.scene.state.activeObject.parent, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(inputManager.keysDown["Shift"])});
                const bone = app.scene.runtimeData.armatureData.getSelectBone();
                changeParameter(this.areasConfig.weightPaintMetaData, "boneIndex", bone[0].index);
            } else {
                this.modalOperator.setModal(WeightPaintModal, this.inputs);
            }
        }
    }
    async mousemove(inputManager) {
        this.inputs.lastPosition = [...this.inputs.position];
        const local = this.convertCoordinate.screenPosFromGPUPos(vec2.flipY(calculateLocalMousePosition(this.canvas, inputManager.position), this.canvas.offsetHeight)); // canvasないのlocal座標へ
        vec2.sub(this.inputs.movement, local, this.inputs.position);
        this.inputs.position = local;

        let consumed = await this.modalOperator.mousemove(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
    }
    async mouseup(inputManager) {
        let consumed = await this.modalOperator.mouseup(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
    }

    wheel(inputManager) {
        if (app.input.keysDown["Alt"]) {
            this.camera.zoom += inputManager.wheelDelta[1] / 200;
            this.camera.zoom = Math.max(Math.min(this.camera.zoom,this.camera.zoomMax),this.camera.zoomMin);
        } else {
            this.camera.position = vec2.addR(this.camera.position, vec2.scaleR([inputManager.wheelDelta[0], -inputManager.wheelDelta[1]], 1 / this.camera.zoom));
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
        this.staticGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Vu_Fts"), [
            this.canvasAspectBuffer,
            camera.cameraDataBuffer,
            sampler
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
        GPU.writeBuffer(this.canvasAspectBuffer, new Float32Array([1 / this.canvas.offsetWidth, 1 /  this.canvas.offsetHeight]));
    }

    rendering() {
        const view = this.context.getCurrentTexture().createView();
        if (!view) {
            console.warn("レンダリング対象が取得できません");
            return ;
        }
        const commandEncoder = device.createCommandEncoder();
        for (const value of app.scene.maskTextures) {
            if (value.renderingObjects.length > 0 && value.name != "base") {
                const maskRenderPass = commandEncoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: value.textureView,
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
                for (const graphicMesh of value.renderingObjects) {
                    maskRenderPass.setBindGroup(2, graphicMesh.maskRenderGroup);
                    maskRenderPass.setVertexBuffer(0, app.scene.runtimeData.graphicMeshData.meshes.buffer, graphicMesh.runtimeOffsetData.meshOffset * app.scene.runtimeData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.runtimeData.graphicMeshData.meshBlockByteLength);
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
        });
        renderPass.setBindGroup(0, this.staticGroup);
        // グリッド
        if (true) {
            renderPass.setPipeline(renderGridPipeline);
            renderPass.draw(4, 1, 0, 0);
        }
        // オブジェクト表示
        if (app.scene.objects.graphicMeshs.length) {
            renderPass.setPipeline(renderPipeline);
            renderPass.setBindGroup(1, app.scene.runtimeData.graphicMeshData.renderGroup);
            for (const graphicMesh of app.scene.renderingOrder) {
                if (graphicMesh.isInit && graphicMesh.visible) {
                    renderPass.setBindGroup(2, graphicMesh.renderGroup);
                    // renderPass.setBindGroup(3, alphaBuffers["0.5"]);
                    renderPass.setBindGroup(3, alphaBuffers["1"]);
                    renderPass.setVertexBuffer(0, app.scene.runtimeData.graphicMeshData.meshes.buffer, graphicMesh.runtimeOffsetData.meshOffset * app.scene.runtimeData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.runtimeData.graphicMeshData.meshBlockByteLength);
                    renderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);
                }
            }
            if (this.viewer.spaceData.visibleObjects.graphicMesh) {
                renderPass.setBindGroup(1, app.scene.runtimeData.graphicMeshData.renderingGizumoGroup);
                for (const graphicMesh of app.scene.renderingOrder) {
                    if (graphicMesh.isInit && graphicMesh.visible) {
                        // モード別
                        if (graphicMesh.mode == "メッシュ編集") {
                            // メッシュ表示
                            renderPass.setBindGroup(2, graphicMesh.objectMeshDataGroup);
                            renderPass.setPipeline(graphicMeshsMeshRenderPipeline);
                            renderPass.draw(3 * 4, graphicMesh.meshesNum, 0, 0); // (3 * 4) 3つの辺を4つの頂点を持つ四角形で表示する
                            renderPass.setPipeline(graphicMeshsEdgeRenderPipeline);
                            renderPass.draw(4, graphicMesh.editor.baseEdgesNum, 0, 0); // (4) 辺を4つの頂点を持つ四角形で表示する
                            renderPass.setPipeline(graphicMeshsSilhouetteEdgeRenderPipeline);
                            renderPass.draw(4, graphicMesh.editor.baseSilhouetteEdgesNum, 0, 0); // (4) 辺を4つの頂点を持つ四角形で表示する
                            // 頂点描画
                            renderPass.setBindGroup(2, graphicMesh.objectDataGroup);
                            renderPass.setPipeline(verticesRenderPipeline);
                            renderPass.draw(4, graphicMesh.verticesNum, 0, 0);
                        } else if (graphicMesh.mode == "メッシュウェイト編集") {
                            // メッシュ表示
                            renderPass.setBindGroup(2, graphicMesh.objectMeshDataGroup);
                            renderPass.setPipeline(graphicMeshsMeshRenderPipeline);
                            renderPass.draw(3 * 4, graphicMesh.meshesNum, 0, 0); // (3 * 4) 3つの辺を4つの頂点を持つ四角形で表示する
                            // 頂点描画
                            renderPass.setBindGroup(2, graphicMesh.objectDataGroup);
                            renderPass.setBindGroup(3, this.viewer.areasConfig.targetWeightIndexGroup);
                            renderPass.setPipeline(graphicMeshsWeightRenderPipeline);
                            renderPass.draw(4, graphicMesh.verticesNum, 0, 0);
                        } else if (graphicMesh.mode == "メッシュ頂点アニメーション編集") {
                            // メッシュ表示
                            renderPass.setBindGroup(2, graphicMesh.objectMeshDataGroup);
                            renderPass.setPipeline(graphicMeshsMeshRenderPipeline);
                            renderPass.draw(3 * 4, graphicMesh.meshesNum, 0, 0); // (3 * 4) 3つの辺を4つの頂点を持つ四角形で表示する
                            // 頂点描画
                            renderPass.setBindGroup(2, graphicMesh.objectDataGroup);
                            renderPass.setPipeline(verticesRenderPipeline);
                            renderPass.draw(4, graphicMesh.verticesNum, 0, 0);
                        } else if (graphicMesh.mode == "オブジェクト") {
                            if (graphicMesh.selected) {
                                // メッシュ表示
                                renderPass.setBindGroup(2, graphicMesh.objectMeshDataGroup);
                                renderPass.setPipeline(graphicMeshsMeshRenderPipeline);
                                renderPass.draw(3 * 4, graphicMesh.meshesNum, 0, 0); // (3 * 4) 3つの辺を4つの頂点を持つ四角形で表示する
                            }
                        }
                    }
                }
            }
        }
        if (this.viewer.spaceData.visibleObjects.armature && app.scene.objects.armatures.length) {
            renderPass.setBindGroup(1, app.scene.runtimeData.armatureData.renderingGizumoGroup);
            renderPass.setPipeline(boneBoneRenderPipeline);
            for (const armature of app.scene.objects.armatures) {
                renderPass.setBindGroup(2, armature.objectDataGroup);
                renderPass.draw(3 * 2, armature.boneNum, 0, 0);
            }
            renderPass.setPipeline(boneVerticesRenderPipeline);
            for (const armature of app.scene.objects.armatures) {
                if (armature.mode == "ボーン編集") {
                    renderPass.setBindGroup(2, armature.objectDataGroup);
                    renderPass.draw(6 * 2, armature.boneNum, 0, 0);
                }
            }
            renderPass.setPipeline(boneRelationshipsRenderPipeline);
            for (const armature of app.scene.objects.armatures) {
                if (armature.mode == "ボーン編集" || armature.mode == "ボーンアニメーション編集") {
                    renderPass.setBindGroup(2, armature.objectDataGroup);
                    renderPass.draw(4, armature.boneNum, 0, 0);
                }
            }
        }
        if (this.viewer.spaceData.visibleObjects.bezierModifier && app.scene.objects.bezierModifiers.length) {
            renderPass.setBindGroup(1, app.scene.runtimeData.bezierModifierData.renderingGizumoGroup);
            renderPass.setPipeline(bezierRenderPipeline);
            for (const bezierModifier of app.scene.objects.bezierModifiers) {
                renderPass.setBindGroup(2, bezierModifier.objectDataGroup);
                renderPass.draw(2 * 50, bezierModifier.pointNum - 1, 0, 0);
            }
            for (const bezierModifier of app.scene.objects.bezierModifiers) {
                renderPass.setBindGroup(2, bezierModifier.objectDataGroup);
                if (bezierModifier.mode == "ベジェ編集") {
                    renderPass.setPipeline(bezierVerticesRenderPipeline);
                    renderPass.draw(2 * 3 * 3, bezierModifier.pointNum, 0, 0);
                } else if (bezierModifier.mode == "ベジェウェイト編集") {
                    renderPass.setPipeline(bezierWeightRenderPipeline);
                    renderPass.setBindGroup(3, this.viewer.areasConfig.targetWeightIndexGroup);
                    renderPass.draw(4, bezierModifier.verticesNum, 0, 0);
                } else if (bezierModifier.mode == "ベジェ頂点アニメーション編集") {
                    renderPass.setPipeline(bezierVerticesRenderPipeline);
                    renderPass.draw(2 * 3 * 3, bezierModifier.pointNum, 0, 0);
                }
            }
        }
        // 処理の終了と送信
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    }

    renderingCircle(renderPass, circleData) {
        const pointBuffer = GPU.createUniformBuffer(2 * 4, circleData.point, ["f32"]); // 場所
        const radiusBuffer = GPU.createUniformBuffer(4, [circleData.radius / (circleData.radiusOption ? this.camera.zoom : 1)], ["f32"]); // 半径
        const widthBuffer = GPU.createUniformBuffer(4, [circleData.width / (circleData.widthOption ? this.camera.zoom : 1)], ["f32"]); // 半径
        const colorBuffer = GPU.createUniformBuffer(4 * 4, circleData.color, ["f32","f32","f32","f32"]); // 色
        const group = GPU.createGroup(GPU.getGroupLayout("Vu_VFu_VFu_Fu"), [pointBuffer,radiusBuffer,widthBuffer,colorBuffer]);
        renderPass.setBindGroup(0, this.staticGroup); // 静的

        renderPass.setBindGroup(1, group);
        renderPass.setPipeline(circleRenderPipeline);
        renderPass.draw(4, 1, 0, 0);
    }

    renderGizmo() {
    }
}