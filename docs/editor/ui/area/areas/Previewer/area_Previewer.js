import { ConvertCoordinate } from '../../../../utils/convertCoordinate.js';
import { resizeObserver } from '../../../../utils/ui/resizeObserver.js';
import { device, format, GPU } from "../../../../utils/webGPU.js";
import { loadFile } from '../../../../utils/utility.js';
import { Particle } from '../../../../core/objects/particle.js';
import { PreviewerSpaceData } from './area_PreviewerSpaceData.js';
import { MathVec2 } from '../../../../utils/mathVec.js';
import { managerForDOMs } from '../../../../utils/ui/util.js';
import { app } from '../../../../../main.js';

const renderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Vu_Ft_Ft_Fu"), GPU.getGroupLayout("Fu")], await loadFile("./editor/shader/render/main.wgsl"), [["u"]], "2d", "t", "wl");
// const renderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Vu_Ft_Ft_Fu"), GPU.getGroupLayout("Fu")], await loadFile("./editor/shader/render/main.wgsl"), [["u"]], "2d", "t", "wa");
const renderParticlePipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Vu")], await loadFile("./editor/shader/render/particleVertex.wgsl"), [], "2d", "s", "wl");
const maskRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("VFu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vu_Ft")], await loadFile("./editor/shader/render/mask.wgsl"), [["u"]], "mask", "t");

const alphaBuffers = {
    "0.5": GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [0.5], ["f32"])]),
    "1": GPU.createGroup(GPU.getGroupLayout("Fu"), [GPU.createUniformBuffer(4, [1], ["f32"])]),
};

class SpaceData {
    constructor() {
        this.visibleObjects = {graphicMesh: true, armature: true, bezierModifier: true, grid: true};
    }
}

export class Area_Previewer {
    constructor(area) {
        this.pixelDensity = 4;
        this.creatorForUI = area.creatorForUI;

        this.spaceData = new SpaceData();
        /** @type {PreviewerSpaceData} */
        this.areasConfig = app.appConfig.areasConfig["Previewer"];

        this.struct = {
            inputObject: {"scene": app.scene, "o": this.spaceData, "areasConfig": this.areasConfig},
            DOM: [
                {tagType: "box", id: "canvasContainer", style: "width: 100%; height: 100%; display: flex; justifyContent: center; alignItems: center; backgroundColor: rgb(55, 55, 55);", children: [
                    {tagType: "html", tag: "canvas", id: "renderingCanvas"},
                ]},
            ]
        }

        this.creatorForUI.create(area.main, this.struct, {padding: false});

        this.box = this.creatorForUI.getDOMFromID("canvasContainer").element;
        this.canvas = this.creatorForUI.getDOMFromID("renderingCanvas");
        this.canvasRect = this.canvas.getBoundingClientRect();

        this.camera = app.scene.objects.renderingCamera;
        this.renderer = new Renderer(this.canvas, this.camera, this);
        this.convertCoordinate = new ConvertCoordinate(this.canvas,this.camera);

        // this.mouseState = {client: [0,0], click: false, rightClick: false, hold: false, holdFrameCount: 0, clickPosition: [0,0], clickPositionForGPU:[0,0], position: [0,0], lastPosition: [0,0], positionForGPU: [0,0], lastPositionForGPU: [0,0], movementForGPU: [0,0]};
        this.canvas.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        });

        const updateDisplayRange = () => {
            const baseWidth = app.scene.objects.renderingCamera.displayRange[0];
            const baseHeight = app.scene.objects.renderingCamera.displayRange[1];
            const ratio = baseWidth / baseHeight;
            const rect = this.box.getBoundingClientRect();
            let targetWidth, targetHeight;

            // 親に合わせてまずは大きさを決定
            if (rect.width / rect.height > ratio) {
                // 親が横に広い → 高さ基準
                targetHeight = rect.height;
                targetWidth = targetHeight * ratio;
            } else {
                // 親が縦に広い → 幅基準
                targetWidth = rect.width;
                targetHeight = targetWidth / ratio;
            }

            // 念のため、少し縮めて確実に収める（1pxマージン）
            if (targetWidth > rect.width) {
                const scale = (rect.width - 1) / targetWidth;
                targetWidth *= scale;
                targetHeight *= scale;
            }
            if (targetHeight > rect.height) {
                const scale = (rect.height - 1) / targetHeight;
                targetWidth *= scale;
                targetHeight *= scale;
            }

            // CSSサイズ（表示サイズ）
            this.canvas.style.width = `${targetWidth}px`;
            this.canvas.style.height = `${targetHeight}px`;

            // 内部描画サイズ（ぼやけ防止）
            this.canvas.width = Math.round(targetWidth) * this.pixelDensity;
            this.canvas.height = Math.round(targetHeight) * this.pixelDensity;
            this.renderer.resizeCVS();
        }

        managerForDOMs.set({o: app.scene.objects.renderingCamera, i: "displayRange"}, updateDisplayRange);
        managerForDOMs.set({o: app.scene.objects.renderingCamera.displayRange, i: "&all"}, updateDisplayRange);
        resizeObserver.push(area.main, updateDisplayRange);
    }

    async update() {
        this.renderer.rendering();
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
    constructor(canvas, camera, /** @type {Area_Previewer} */ viewer) {
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

        this.depthTexture = GPU.createDepthTexture2D([canvas.width, canvas.height]);
        this.depthTextureView = this.depthTexture.createView();

        this.canvasAspectBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32"]);
        this.resizeCVS();
        // レンダリングに使う汎用group
        this.staticGroup = GPU.createGroup(GPU.getGroupLayout("VFu_Fts"), [
            camera.cameraDataBuffer,
            GPU.sampler
        ]);
    }

    resizeCVS() {
        this.depthTexture = GPU.createDepthTexture2D([this.canvas.width, this.canvas.height]);
        this.depthTextureView = this.depthTexture.createView();
        this.camera.updateBuffer();
    }

    rendering() {
        const view = this.context.getCurrentTexture().createView();
        if (!view) {
            console.warn("レンダリング対象が取得できません");
            return ;
        }
        const commandEncoder = device.createCommandEncoder();
        for (const value of app.scene.objects.maskTextures) {
            if (value.renderingObjects.length > 0 && value.name != "base") {
                const maskRenderPass = commandEncoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: value.view,
                            clearValue: { r: 0, g: 0, b: 0, a: 1 },
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
        // オブジェクト表示
        if (app.scene.objects.graphicMeshs.length) {
            renderPass.setPipeline(renderPipeline);
            renderPass.setBindGroup(1, app.scene.runtimeData.graphicMeshData.renderGroup);
            for (const graphicMesh of app.scene.renderingOrder) {
                if (graphicMesh.visible) {
                    renderPass.setBindGroup(2, graphicMesh.renderGroup);
                    renderPass.setBindGroup(3, alphaBuffers["1"]);
                    renderPass.setVertexBuffer(0, app.scene.runtimeData.graphicMeshData.meshes.buffer, graphicMesh.runtimeOffsetData.start.meshesOffset * app.scene.runtimeData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.runtimeData.graphicMeshData.meshBlockByteLength);
                    renderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);
                }
            }
            // for (const graphicMesh of app.scene.objects.graphicMeshs) {
            //     if (graphicMesh.visible) {
            //         renderPass.setBindGroup(2, graphicMesh.renderGroup);
            //         // renderPass.setBindGroup(3, alphaBuffers["0.5"]);
            //         renderPass.setBindGroup(3, alphaBuffers["1"]);
            //         renderPass.setVertexBuffer(0, app.scene.runtimeData.graphicMeshData.meshes.buffer, graphicMesh.runtimeOffsetData.start.meshesOffset * app.scene.runtimeData.graphicMeshData.meshBlockByteLength, graphicMesh.meshesNum * app.scene.runtimeData.graphicMeshData.meshBlockByteLength);
            //         renderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);
            //     }
            // }
        }
        if (app.scene.objects.particles.length) {
            renderPass.setPipeline(renderParticlePipeline);
            renderPass.setBindGroup(1, app.scene.runtimeData.particle.renderingGroup);
            for (const /** @type {Particle} */ particle of app.scene.objects.particles) {
                renderPass.setBindGroup(2, particle.objectDataGroup);
                renderPass.draw(4, particle.particlesNum, 0, 0);
            }
        }
        // 処理の終了と送信
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    }
}