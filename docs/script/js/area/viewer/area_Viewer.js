
import { app } from '../../app.js';
import { GPU, device, format } from '../../webGPU.js';
import { sampler } from "../../GPUObject.js";
import { keysDown } from '../../main.js';
import { boolTo0or1, calculateLocalMousePosition, loadFile } from '../../utility.js';
import { Camera } from '../../カメラ.js';
import { vec2 } from '../../ベクトル計算.js';
import { Select } from '../../選択.js';
import { ConvertCoordinate } from '../../座標の変換.js';
import { BBox } from '../../BBox.js';
import { createTag } from '../../UI/制御.js';
import { CreatorForUI } from '../補助/UIの自動生成.js';
import { resizeObserver } from '../補助/canvasResizeObserver.js';

const renderGridPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts")], await fetch('./script/wgsl/レンダー/グリッド/v_グリッド.wgsl').then(x => x.text()),await fetch('./script/wgsl/レンダー/グリッド/f_グリッド.wgsl').then(x => x.text()), [], "2d", "s");
const renderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft_Ft_Fu"), GPU.getGroupLayout("Fu")], await loadFile("./script/js/area/Viewer/shader/shader.wgsl"), [["u"]], "2d", "t");
const maskRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft")], await loadFile("./script/js/area/Viewer/shader/maskShader.wgsl"), [["u"]], "mask", "t");

const verticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/verticesShader.wgsl"), [], "2d", "s");
const graphicMeshsMeshRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Vsr"), GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/meshShader.wgsl"), [], "2d", "s");

const boneVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bone/vertices.wgsl"), [], "2d", "t");
const boneBoneRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bone/bone.wgsl"), [], "2d", "t");
const boneRelationshipsRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_VFsr_Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bone/relationships.wgsl"), [], "2d", "s");

const bezierRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bezier/bezier.wgsl"), [], "2d", "s");
const bezierVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"),GPU.getGroupLayout("Vu")], await loadFile("./script/js/area/Viewer/shader/bezier/vertices.wgsl"), [], "2d", "t");

const alphaBuffers = {
    "0.5": GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [0.5], ["f32"])]),
    "1": GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [1], ["f32"])]),
};

class TranceShelfe {
    constructor(/** @type {HTMLElement} */dom, sourceObject, struct) {
        this.dom = dom;
        this.sourceObject = sourceObject;
        this.struct = struct;
    }
}

class SpaceData {
    constructor() {
        this.visibleObjects = {graphicMesh: true, boneModifier: true, bezierModifier: true, grid: true};
    }
}

export class Area_Viewer {
    constructor(/** @type {HTMLElement} */dom) {
        dom.style.display = "grid";
        dom.style.gridTemplateRows = "auto 1fr";
        // dom.style.gridTemplateRows = "35px 1fr";
        this.pixelDensity = 4;
        this.header = createTag(dom, "div", {style: "height: fit-content"});
        this.headerDiv = createTag(this.header, "div");
        this.creatorForUI = new CreatorForUI();

        this.spaceData = new SpaceData();
        this.inputObject = {"h": app.hierarchy, "scene": app.scene, "o": this.spaceData, "areasConfig": app.appConfig.areasConfig};

        this.struct = {
            DOM: [
                {type: "option", name: "情報", children: [
                    {type: "gridBox", axis: "c", allocation: "auto 1fr auto", children: [
                        {type: "flexBox", interval: "10px", allocation: "auto auto auto auto auto auto 1fr", children: [
                            {type: "input", name: "visibleCheck", withObject: {object: "areasConfig", parameter: "Viewer"}, options: {type: "check", look: "isPlaying"}},
                            {type: "select", name: "visibleCheck", label: "tool", writeObject: {object: "areasConfig/Viewer", parameter: "useTool"}, sourceObject: {object: "areasConfig/Viewer", parameter: "tools"}},
    
                            {type: "flexBox", interval: "5px", name: "", children: [
                                {type: "radios", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                            ]},
    
                            {type: "flexBox", interval: "5px", name: "", children: [
                                {type: "checks", name: "aa", icon: "test", label: "test", options: {textContent: "test"}, withObject: {object: "o/visibleObjects", customIndex: ["graphicMesh", "boneModifier", "bezierModifier", "grid"]}},
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
                                {type: "radios", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                            ]},
    
                            {type: "separator", size: "10px"},
    
                            {type: "flexBox", interval: "5px", name: "", children: [
                                {type: "checks", name: "aa", icon: "test", label: "test", options: {textContent: "test"}, withObject: {object: "o/visibleObjects", customIndex: ["graphicMesh", "boneModifier", "bezierModifier", "grid"]}},
                            ]},
    
                            {type: "padding", size: "10px"},
                        ]},
                    ]}
                ]},
            ]
        }
        this.creatorForUI.create(this.header, this, {heightCN: true});
        this.canvas = document.createElement("canvas");
        this.canvas.className = "renderingTarget";
        this.canvasContainer = createTag(dom, "div", {class: "canvasContainer"});
        this.canvasContainer.append(this.canvas);
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.canvas.width = this.canvasRect.width * this.pixelDensity;
        this.canvas.height = this.canvasRect.height * this.pixelDensity;
        // this.pixelDensity = this.canvas.height / this.canvasRect.height;

        this.camera = new Camera();
        this.renderer = new Renderer(this.canvas, this.camera, this);
        this.convertCoordinate = new ConvertCoordinate(this.canvas,this.camera);
        this.select = new Select(this.convertCoordinate);

        this.mouseState = {client: [0,0], click: false, rightClick: false, hold: false, holdFrameCount: 0, clickPosition: [0,0], clickPositionForGPU:[0,0], position: [0,0], lastPosition: [0,0], positionForGPU: [0,0], lastPositionForGPU: [0,0], movementForGPU: [0,0]};

        this.canvas.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            this.mouseState.rightClick = true;
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
        if (this.mouseState.click) {
            if (app.scene.state.currentMode == "オブジェクト") {
                app.scene.state.setActiveObject(await app.scene.selectedForObject([...this.mouseState.clickPositionForGPU]));
            } else if (app.scene.state.currentMode == "メッシュ編集") {
                for (const graphicMesh of app.scene.state.selectedObject) {
                    if (keysDown["c"]) {
                        app.scene.gpuData.graphicMeshData.selectedForVertices(graphicMesh, {circle: [...this.mouseState.clickPositionForGPU, 100]}, {add: boolTo0or1(keysDown["Shift"])});
                    } else {
                        if (this.mouseState.hold) {
                            app.scene.gpuData.graphicMeshData.selectedForVertices(graphicMesh, {box: BBox([this.mouseState.clickPositionForGPU, this.mouseState.positionForGPU])}, {add: boolTo0or1(keysDown["Shift"])});
                        }
                    }
                }
            }
            this.mouseState.click = false;
        }
        if (keysDown["Tab"]) {
            if (app.scene.state.currentMode == "メッシュ編集") {
                app.scene.state.setModeForSelected("オブジェクト");
            } else {
                app.scene.state.setModeForSelected("メッシュ編集");
            }
            keysDown["Tab"] = false;
        }
        this.renderer.rendering();
    }

    mousedown(inputManager) {
        const local = vec2.flipY(vec2.scaleR(calculateLocalMousePosition(this.canvas, inputManager.mousePosition), this.pixelDensity), this.canvas.height); // canvasないのlocal座標へ
        this.mouseState.clickPosition = local;
        this.mouseState.position = local;
        this.mouseState.clickPositionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
        this.mouseState.positionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
        this.mouseState.hold = true;
        this.mouseState.holdFrameCount = 0;
        this.mouseState.click = true;
        console.log(this.mouseState);
    }
    mousemove(inputManager) {
        const local = vec2.flipY(vec2.scaleR(calculateLocalMousePosition(this.canvas, inputManager.mousePosition), this.pixelDensity), this.canvas.height);
        this.mouseState.position = local;
        this.mouseState.positionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
    }
    mouseup(inputManager) {
        this.mouseState.hold = false;
        this.mouseState.holdFrameCount = 0;
    }

    wheel(inputManager) {
        if (keysDown["Alt"]) {
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
            console.warn("cvsが取得できません")
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
                maskRenderPass.setBindGroup(1, app.scene.gpuData.graphicMeshData.renderGroup);
                for (const graphicMesh of value.renderingObjects) {
                    maskRenderPass.setBindGroup(2, graphicMesh.maskRenderGroup);
                    maskRenderPass.setVertexBuffer(0, app.scene.gpuData.graphicMeshData.meshes, graphicMesh.meshBufferOffset * app.scene.gpuData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.gpuData.graphicMeshData.meshBlockByteLength);
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
        if (app.scene.graphicMeshs.length) {
            renderPass.setPipeline(renderPipeline);
            renderPass.setBindGroup(1, app.scene.gpuData.graphicMeshData.renderGroup);
            for (const graphicMesh of app.scene.renderingOrder) {
                if (graphicMesh.isInit && graphicMesh.visible) {
                    renderPass.setBindGroup(2, graphicMesh.renderGroup);
                    // renderPass.setBindGroup(3, alphaBuffers["0.5"]);
                    renderPass.setBindGroup(3, alphaBuffers["1"]);
                    renderPass.setVertexBuffer(0, app.scene.gpuData.graphicMeshData.meshes, graphicMesh.meshBufferOffset * app.scene.gpuData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.gpuData.graphicMeshData.meshBlockByteLength);
                    renderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);
                }
            }
            renderPass.setBindGroup(1, app.scene.gpuData.graphicMeshData.renderingGizumoGroup);
            for (const graphicMesh of app.scene.renderingOrder) {
                if (graphicMesh.isInit && graphicMesh.visible) {
                    if (graphicMesh.mode == "メッシュ編集") {
                        // メッシュ表示
                        renderPass.setBindGroup(2, graphicMesh.objectMeshDataGroup);
                        renderPass.setPipeline(graphicMeshsMeshRenderPipeline);
                        renderPass.draw(3 * 4, graphicMesh.meshesNum, 0, 0); // (3 * 4) 3つの辺を4つの頂点を持つ四角形で表示する
                        // 頂点描画
                        renderPass.setBindGroup(2, graphicMesh.objectDataGroup);
                        renderPass.setPipeline(verticesRenderPipeline);
                        renderPass.draw(4, graphicMesh.verticesNum, 0, 0);
                    }
                }
            }
        }
        if (this.viewer.spaceData.visibleObjects.boneModifier && app.scene.boneModifiers.length) {
            renderPass.setBindGroup(1, app.scene.gpuData.boneModifierData.renderingGizumoGroup);
            renderPass.setPipeline(boneBoneRenderPipeline);
            for (const armature of app.scene.boneModifiers) {
                renderPass.setBindGroup(2, armature.objectDataGroup);
                renderPass.draw(3 * 2, armature.boneNum, 0, 0);
            }
            renderPass.setPipeline(boneVerticesRenderPipeline);
            for (const armature of app.scene.boneModifiers) {
                renderPass.setBindGroup(2, armature.objectDataGroup);
                renderPass.draw(6 * 2, armature.boneNum, 0, 0);
            }
            renderPass.setPipeline(boneRelationshipsRenderPipeline);
            for (const armature of app.scene.boneModifiers) {
                renderPass.setBindGroup(2, armature.objectDataGroup);
                renderPass.draw(4, armature.boneNum, 0, 0);
            }
        }
        if (this.viewer.spaceData.visibleObjects.bezierModifier && app.scene.bezierModifiers.length) {
            renderPass.setBindGroup(1, app.scene.gpuData.bezierModifierData.renderingGizumoGroup);
            renderPass.setPipeline(bezierRenderPipeline);
            for (const bezierModifier of app.scene.bezierModifiers) {
                renderPass.setBindGroup(2, bezierModifier.objectDataGroup);
                renderPass.draw(2 * 50, bezierModifier.pointNum - 1, 0, 0);
            }
            renderPass.setPipeline(bezierVerticesRenderPipeline);
            for (const bezierModifier of app.scene.bezierModifiers) {
                renderPass.setBindGroup(2, bezierModifier.objectDataGroup);
                renderPass.draw(6 * 3, bezierModifier.pointNum, 0, 0);
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