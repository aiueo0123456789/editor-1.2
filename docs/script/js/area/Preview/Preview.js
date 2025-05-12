
/** @type {Application} */
import { app, Application } from '../../app.js';
import { GPU, device, format } from '../../webGPU.js';
import { sampler } from "../../GPUObject.js";
import { keysDown } from '../../main.js';
import { loadFile } from '../../utility.js';
import { Camera } from '../../カメラ.js';
import { vec2 } from '../../ベクトル計算.js';
import { Select } from '../../選択.js';
import { ConvertCoordinate } from '../../座標の変換.js';
import { resizeObserver } from '../補助/canvasResizeObserver.js';

const renderGridPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts")], await fetch('./script/wgsl/レンダー/グリッド/v_グリッド.wgsl').then(x => x.text()),await fetch('./script/wgsl/レンダー/グリッド/f_グリッド.wgsl').then(x => x.text()), [], "2d", "s");
const renderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft_Ft_Fu")], await loadFile("./script/js/area/Preview/shader/shader.wgsl"), [["u"]], "2d", "t");
const maskRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft")], await loadFile("./script/js/area/Preview/shader/maskShader.wgsl"), [["u"]], "mask", "t");

export class Area_Preview {
    constructor(/** @type {HTMLElement} */dom) {
        this.pixelDensity = 3;
        this.canvas = document.createElement("canvas");
        this.canvas.className = "renderingTarget";
        dom.append(this.canvas);
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.canvas.width = this.canvasRect.width * this.pixelDensity;
        this.canvas.height = this.canvasRect.height * this.pixelDensity;
        // this.pixelDensity = this.canvas.height / this.canvasRect.height;

        this.camera = new Camera();
        this.renderer = new Renderer(this.canvas, this.camera);
        this.convertCoordinate = new ConvertCoordinate(this.canvas,this.camera);
        this.select = new Select(this.convertCoordinate);

        this.mouseState = {client: [0,0], click: false, rightClick: false, hold: false, holdFrameCount: 0, clickPosition: [0,0], clickPositionForGPU:[0,0], position: [0,0], lastPosition: [0,0], positionForGPU: [0,0], lastPositionForGPU: [0,0], movementForGPU: [0,0]};

        // ホイール操作
        this.canvas.addEventListener('wheel', (event) => {
            if (keysDown["Alt"]) {
                this.camera.zoom += event.deltaY / 200;
                this.camera.zoom = Math.max(Math.min(this.camera.zoom,this.camera.zoomMax),this.camera.zoomMin);
            } else {
                this.camera.position = vec2.addR(this.camera.position, vec2.scaleR([-event.deltaX, event.deltaY], 1 / this.camera.zoom));
            }
            this.camera.updateBuffer();
            event.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('mousemove', (event) => {
            const mouseX = (event.clientX - this.canvasRect.left) * this.pixelDensity; // Calculate mouse X relative to canvas
            const mouseY = this.canvas.height - ((event.clientY - this.canvasRect.top) * this.pixelDensity); // Calculate mouse Y relative to canvas
            this.mouseState.client = [event.clientX,event.clientY];
            this.mouseState.position = [mouseX,mouseY];
            this.mouseState.positionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
        });

        this.canvas.addEventListener('mousedown', (event) => {
            if (event.button == 0) {
                // activeViewUpdate(this);
                const mouseX = (event.clientX - this.canvasRect.left) * this.pixelDensity; // Calculate mouse X relative to canvas
                const mouseY = this.canvas.height - ((event.clientY - this.canvasRect.top) * this.pixelDensity); // Calculate mouse Y relative to
                this.mouseState.client = [event.clientX,event.clientY];
                this.mouseState.clickPosition = [mouseX,mouseY];
                this.mouseState.clickPositionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
                this.mouseState.position = [mouseX,mouseY];
                this.mouseState.positionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
                this.mouseState.hold = true;
                this.mouseState.holdFrameCount = 0;
                this.mouseState.click = true;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mouseState.hold = false;
            this.mouseState.holdFrameCount = 0;
        });

        this.canvas.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            this.mouseState.rightClick = true;
        });

        resizeObserver.push(this.canvas, () => {
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

    update() {
        this.renderer.rendering();
    }
}

export class Renderer {
    constructor(canvas, camera, scene) {
        console.log("レンダリングターゲット", canvas)
        this.canvas = canvas;
        this.context = canvas.getContext('webgpu');
        this.context.configure({
            device: device,
            format: format,
            // alphaMode: 'premultiplied',
            size: [this.canvas.width, this.canvas.height]
        });
        this.camera = camera;
        this.scene = scene;

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
        this.context.configure({
            device: device,
            format: format,
            // alphaMode: 'premultiplied',
            size: [this.canvas.width, this.canvas.height]
        });
        GPU.writeBuffer(this.canvasAspectBuffer, new Float32Array([1 / this.canvas.width, 1 /  this.canvas.height]));
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
                    // maskRenderPass.setVertexBuffer(0, graphicMesh.v_meshIndexBuffer);
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
                if (graphicMesh.isInit) {
                    renderPass.setBindGroup(2, graphicMesh.renderGroup);
                    // renderPass.setVertexBuffer(0, graphicMesh.v_meshIndexBuffer);
                    renderPass.setVertexBuffer(0, app.scene.gpuData.graphicMeshData.meshes, graphicMesh.meshBufferOffset * app.scene.gpuData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.gpuData.graphicMeshData.meshBlockByteLength);
                    renderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);
                }
            }
        }
        // 処理の終了と送信
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    }
}