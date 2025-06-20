
import { app } from '../../app.js';
import { GPU, device, format } from '../../webGPU.js';
import { sampler } from "../../GPUObject.js";
import { boolTo0or1, calculateLocalMousePosition, loadFile } from '../../utility.js';
import { Camera } from '../../カメラ.js';
import { vec2 } from '../../ベクトル計算.js';
import { ConvertCoordinate } from '../../座標の変換.js';
import { CreatorForUI } from '../補助/UIの自動生成.js';
import { resizeObserver } from '../補助/canvasResizeObserver.js';
import { ModalOperator } from '../補助/ModalOperator.js';
import { TranslateModal } from './tools/TranslateTool.js';
import { RotateModal } from './tools/RotateTool.js';
import { ResizeModal } from './tools/ResizeTool.js';
import { ExtrudeMove } from './tools/ExtrudeMove.js';
import { ParentPickModal } from './tools/ParentPick.js';
import { DeleteTool } from './tools/Delete.js';

// const renderGridPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts")], await fetch('./script/wgsl/レンダー/グリッド/v_グリッド.wgsl').then(x => x.text()),await fetch('./script/wgsl/レンダー/グリッド/f_グリッド.wgsl').then(x => x.text()), [], "2d", "s");
const renderGridPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts")], await fetch('./script/js/area/Viewer/shader/grid.wgsl').then(x => x.text()), [], "2d", "s");
const renderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft_Ft_Fu"), GPU.getGroupLayout("Fu")], await loadFile("./script/js/area/Viewer/shader/shader.wgsl"), [["u"]], "2d", "t");
const maskRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft")], await loadFile("./script/js/area/Viewer/shader/maskShader.wgsl"), [["u"]], "mask", "t");

const verticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/graphicMesh/verticesShader.wgsl"), [], "2d", "s");
const graphicMeshsMeshRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/graphicMesh/meshShader.wgsl"), [], "2d", "s");

const boneVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bone/vertices.wgsl"), [], "2d", "t");
const boneBoneRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bone/bone.wgsl"), [], "2d", "t");
const boneRelationshipsRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr_Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bone/relationships.wgsl"), [], "2d", "s");

const bezierRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bezier/bezier.wgsl"), [], "2d", "s");
const bezierVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bezier/vertices.wgsl"), [], "2d", "t");

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
    constructor(/** @type {HTMLElement} */dom) {
        this.pixelDensity = 4;
        this.creatorForUI = new CreatorForUI();

        this.spaceData = new SpaceData();
        this.inputObject = {"h": app.hierarchy, "scene": app.scene, "o": this.spaceData, "areasConfig": app.appConfig.areasConfig["Viewer"]};

        this.struct = {
            DOM: [
                {type: "gridBox", style: "width: 100%; height: 100%;", axis: "r", allocation: "auto 1fr", children: [
                    {type: "option", style: "padding: 5px", class: "sharpBoder", name: "情報", children: [
                        {type: "gridBox", axis: "c", allocation: "auto 1fr auto", children: [
                            {type: "flexBox", interval: "10px", allocation: "auto auto auto auto auto 1fr", children: [
                                // {type: "select", name: "visibleCheck", label: "tool", writeObject: {object: "areasConfig", parameter: "useTool"}, sourceObject: {object: "areasConfig/tozols"}},
                                // {type: "path", sourceObject: {object: "areasConfig/modes", parameter: {object: "scene/state/activeObject", parameter: "type"}}, updateEventTarget: {object: "scene/state/activeObject"}, children: [
                                {type: "path", sourceObject: {object: "areasConfig/modes", parameter: {object: "scene/state/activeObject", parameter: "type"}}, updateEventTarget: "アクティブオブジェクト", children: [
                                    {type: "select", name: "visibleCheck", label: "tool", writeObject: {object: "areasConfig", parameter: "useTool"}, sourceObject: {object: ""}},
                                ]},
        
                                {type: "flexBox", interval: "5px", name: "", children: [
                                    {type: "radios", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                                ]},
        
                                {type: "flexBox", interval: "5px", name: "", children: [
                                    {type: "checks", name: "aa", icon: "test", label: "test", options: {textContent: "test"}, withObject: {object: "o/visibleObjects", customIndex: ["graphicMesh", "armature", "bezierModifier", "grid"]}},
                                ]},
                            ]},
    
                            {type: "padding", size: "10px"},
    
                            {type: "gridBox", axis: "c", allocation: "1fr auto auto auto auto auto 1fr", children: [
                                {type: "padding", size: "10px"},
        
                                {type: "flexBox", interval: "5px", name: "", children: [
                                    {type: "buttons", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                                ]},
        
                                {type: "separator", size: "10px"},
        
                                {type: "flexBox", interval: "5px", name: "", children: [
                                    {type: "select", label: "種類", name: "proportionalEditType", label: "proportionalEditType", writeObject: {object: "areasConfig", parameter: "proportionalEditType"}, sourceObject: [0,1,2]},
                                ]},

                                {type: "separator", size: "10px"},

                                {type: "flexBox", interval: "5px", name: "", children: [
                                    {type: "input", label: "影響範囲", name: "proportionalSize", withObject: {object: "areasConfig", parameter: "proportionalSize"}, options: {type: "number", min: 0}, custom: {visual: "1"}},
                                ]},

                                {type: "padding", size: "10px"},
                            ]},
                        ]}
                    ]},
                    {type: "gridBox", style: "width: 100%; height: 100%;", axis: "c", allocation: "1fr auto", children: [
                        {type: "box", id: "canvasContainer", style: "width: 100%; height: 100%; position: relative;", children: [
                            {type: "canvas", id: "renderingCanvas", style: "width: 100%; height: 100%; position: absolute;"},
                        ]},
                        {type: "div", style: "width: 20px; backgroundColor: rgb(20,20,20);", class: "sharpBoder", children: [

                        ]},
                    ]}
                ]}
            ]
        }

        this.creatorForUI.create(dom, this, {padding: false});

        this.modalOperator = new ModalOperator(this.creatorForUI.getDOMFromID("canvasContainer"), {"g": TranslateModal, "r": RotateModal, "s": ResizeModal, "e": ExtrudeMove, "p": ParentPickModal, "x": DeleteTool});

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

        resizeObserver.push(dom, () => {
            // 要素の新しいサイズを取得
            this.canvasRect = this.canvas.getBoundingClientRect();
            this.canvas.width = this.canvasRect.width * this.pixelDensity;
            this.canvas.height = this.canvasRect.height * this.pixelDensity;
            this.renderer.resizeCVS();
        });

        // this.gridMainTag.addEventListener('contextmenu', (e) => {
        //     e.preventDefault();
        //     updateForContextmenu("ビュー",[e.clientX,e.clientY]);
        // });
    }

    async update() {
        this.renderer.rendering();
    }

    toolsUpdate() {
    }

    async keyInput(inputManager) {
        let consumed = this.modalOperator.keyInput(inputManager); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
        const state = app.scene.state;
        if (state.activeObject) {
            if (state.activeObject.type == "グラフィックメッシュ") {
                if (inputManager.consumeKeys(["Tab"])) {
                    if (state.currentMode == "メッシュ編集") {
                        state.setModeForSelected("オブジェクト");
                    } else if (state.currentMode == "頂点アニメーション編集") {
                        state.setModeForSelected("オブジェクト");
                    } else if (inputManager.consumeKeys(["a"])) {
                        state.setModeForSelected("頂点アニメーション編集");
                    } else {
                        state.setModeForSelected("メッシュ編集");
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
                    const bones = app.scene.runtimeData.armatureData.getSelectBone();
                    bones.forEach(bone => {
                        app.options.keyframeInsert(bone, app.scene.frame_current);
                    })
                }
            } else if (state.activeObject.type == "ベジェモディファイア") {
                if (inputManager.consumeKeys(["Tab"])) {
                    if (state.currentMode == "ベジェ編集") {
                        state.setModeForSelected("オブジェクト");
                    } else {
                        state.setModeForSelected("ベジェ編集");
                    }
                }
            }
        }
    }

    async mousedown(inputManager) {
        const local = this.convertCoordinate.screenPosFromGPUPos(vec2.flipY(calculateLocalMousePosition(this.canvas, inputManager.mousePosition), this.canvas.offsetHeight)); // canvasないのlocal座標へ
        this.inputs.click = true;
        this.inputs.clickPosition = local;
        this.inputs.position = local;

        let consumed = this.modalOperator.mousedown(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;

        const state = app.scene.state;
        if (state.currentMode == "オブジェクト") {
            const objects = await app.scene.selectedForObject([...this.inputs.clickPosition]);
            const frontObject = objects.length ? objects[0] : null;
            state.setSelectedObject(frontObject, inputManager.keysDown["Shift"]);
            state.setActiveObject(frontObject);
        } else if (state.currentMode == "メッシュ編集") {
            for (const graphicMesh of app.scene.state.selectedObject) {
                app.scene.runtimeData.graphicMeshData.selectedForVertices(graphicMesh, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(app.input.keysDown["Shift"])});
            }
        } else if (state.currentMode == "ボーン編集") {
            for (const armature of app.scene.state.selectedObject) {
                app.scene.runtimeData.armatureData.selectedForVertices(armature, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(app.input.keysDown["Shift"])});
            }
        } else if (state.currentMode == "ベジェ編集") {
            for (const bezierModifier of app.scene.state.selectedObject) {
                app.scene.runtimeData.bezierModifierData.selectedForVertices(bezierModifier, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(app.input.keysDown["Shift"])});
            }
        } else if (state.currentMode == "ボーンアニメーション編集") {
            for (const armature of app.scene.state.selectedObject) {
                await app.scene.runtimeData.armatureData.selectedForBone(armature, {circle: [...this.inputs.clickPosition, 100 / this.camera.zoom]}, {add: boolTo0or1(app.input.keysDown["Shift"])});
            }
        }
    }
    mousemove(inputManager) {
        this.inputs.lastPosition = [...this.inputs.position];
        const local = this.convertCoordinate.screenPosFromGPUPos(vec2.flipY(calculateLocalMousePosition(this.canvas, inputManager.mousePosition), this.canvas.offsetHeight)); // canvasないのlocal座標へ
        vec2.sub(this.inputs.movement, local, this.inputs.position);
        this.inputs.position = local;

        let consumed = this.modalOperator.mousemove(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
    }
    mouseup(inputManager) {
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
    constructor(canvas, camera, viewer) {
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
                    maskRenderPass.setVertexBuffer(0, app.scene.runtimeData.graphicMeshData.meshes, graphicMesh.meshBufferOffset * app.scene.runtimeData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.runtimeData.graphicMeshData.meshBlockByteLength);
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
                    renderPass.setVertexBuffer(0, app.scene.runtimeData.graphicMeshData.meshes, graphicMesh.meshBufferOffset * app.scene.runtimeData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.runtimeData.graphicMeshData.meshBlockByteLength);
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
            renderPass.setPipeline(bezierVerticesRenderPipeline);
            for (const bezierModifier of app.scene.objects.bezierModifiers) {
                if (bezierModifier.mode == "ベジェ編集") {
                    renderPass.setBindGroup(2, bezierModifier.objectDataGroup);
                    renderPass.draw(6 * 3, bezierModifier.pointNum, 0, 0);
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