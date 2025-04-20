import { isNumber, loadFile } from '../utility.js';
import { GPU, device, format } from '../webGPU.js';
import { graphicMeshsMeshRenderPipeline, modifierMeshRenderPipeline, renderPipeline,circlesFromAllVerticesRenderPipeline,circlesFromLimitedVerticesRenderPipeline,bezierRenderPipeline,BBoxRenderPipeline,sampler, maskRenderPipeline, LimitedBoneRenderPipeline, rotateModifierRenderPipeline,  modifierFrameRenderPipeline, modifierFrame2RenderPipeline, screenCirclesFromAllVerticesRenderPipeline } from "../GPUObject.js";
import { renderObjectManager, stateMachine, editorParameters, activeView } from '../main.js';
import { app } from '../app.js';

const weigthRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vsr")], `
struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct AnimationData {
    index: vec4<u32>,
    weight: vec4<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesIndexAndWeight: array<AnimationData>;
@group(2) @binding(0) var<storage, read> targetIndex: u32;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) color: vec4<f32>,
}

// バーテックスシェーダー
@vertex
fn main(
    // @builtin(vertex_index) vertexIndex: u32
    @location(0) index: u32,
    ) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f((verticesPosition[index] - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    let data = verticesIndexAndWeight[index];
    let indexs = data.index;
    let weights = data.weight;
    var weight = 0.0;
    for (var i = 0u; i < 4u; i ++) {
        if (indexs[i] == targetIndex) {
            weight = weights[i];
            break ;
        }
    }
    let color0 = vec4<f32>(0.0, 0.0, 1.0, 1.0);
    let color1 = vec4<f32>(0.0, 1.0, 0.0, 1.0);
    let color2 = vec4<f32>(1.0, 0.0, 0.0, 1.0);
    output.color = select(mix(color0, color1, weight * 2.0), mix(color1, color2, (weight - 0.5) * 2.0), weight > 0.5);
    return output;
}
`,`
@group(0) @binding(2) var mySampler: sampler;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
    @location(0) color: vec4<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = color;
    return output;
}
`, [["u"]], "2d", "t");

const BezierModifierWeigthRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vsr")], `
struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct AnimationData {
    index: vec4<u32>,
    weight: vec4<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<vec2<f32>>;
@group(1) @binding(1) var<storage, read> verticesIndexAndWeight: array<AnimationData>;
@group(2) @binding(0) var<storage, read> targetIndex: u32;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) color: vec4<f32>,
}

// バーテックスシェーダー
@vertex
fn main(
    // @builtin(vertex_index) vertexIndex: u32
    @location(0) index: u32,
    ) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f((verticesPosition[index] - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
    let data = verticesIndexAndWeight[index];
    let indexs = data.index;
    let weights = data.weight;
    var weight = 0.0;
    for (var i = 0u; i < 4u; i ++) {
        if (indexs[i] == targetIndex) {
            weight = weights[i];
            break ;
        }
    }
    let color0 = vec4<f32>(0.0, 0.0, 1.0, 1.0);
    let color1 = vec4<f32>(0.0, 1.0, 0.0, 1.0);
    let color2 = vec4<f32>(1.0, 0.0, 0.0, 1.0);
    output.color = select(mix(color0, color1, weight * 2.0), mix(color1, color2, (weight - 0.5) * 2.0), weight > 0.5);
    return output;
}
`,`
@group(0) @binding(2) var mySampler: sampler;

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn main(
    @location(0) color: vec4<f32>,
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = color;
    return output;
}
`, [["u"]], "2d", "t");

const renderGridPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts")], await fetch('./script/wgsl/レンダー/グリッド/v_グリッド.wgsl').then(x => x.text()),await fetch('./script/wgsl/レンダー/グリッド/f_グリッド.wgsl').then(x => x.text()), [], "2d", "s");

const boneRelationshipsRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr")], await fetch('./script/wgsl/レンダー/ボーン/関係/点線.wgsl').then(x => x.text()), [], "2d", "s");
const boneVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Fu")], await fetch('./script/wgsl/レンダー/ボーン/v_ボーン頂点の表示.wgsl').then(x => x.text()), [], "2d", "t");

const edgesFromVerticesAndEdgesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Fu")], await fetch('./script/wgsl/レンダー/グラフィックメッシュ/特定の辺の表示.wgsl').then(x => x.text()), [], "2d", "s");
const weightFromVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Vsr")], await fetch('./script/wgsl/レンダー/ウェイトのレンダリング/頂点/shader.wgsl').then(x => x.text()), [], "2d", "s");

const circleRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"),GPU.getGroupLayout("Vu_VFu_VFu_Fu")], await loadFile("./script/wgsl/レンダー/円枠線/shader.wgsl"), [], "2d", "s");

const oneColorBoneRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Fu")],`
struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;
const size = 0.05;
const ratio = 0.1;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) uv: vec2<f32>,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let index = instanceIndex;
    let position1 = verticesPosition[index].h;
    let position2 = verticesPosition[index].t;
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    let sectionPosition = mix(position1, position2, ratio);

    let vIndex = vertexIndex % 6u;

    let k = (normal * size * length(sub));
    if (vIndex == 0u) {
        offset = sectionPosition - k;
    } else if (vIndex == 1u) {
        offset = sectionPosition + k;
    } else if (vIndex == 2u) {
        offset = position2;
    } else if (vIndex == 3u) {
        offset = sectionPosition - k;
    } else if (vIndex == 4u) {
        offset = sectionPosition + k;
    } else if (vIndex == 5u) {
        offset = position1;
    }

    var output: VertexOutput;
    output.position = worldPosToClipPos(offset);
    output.uv = offset;
    return output;
}

@group(2) @binding(0) var<uniform> color: vec4<f32>; // 距離を計算する座標

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn fmain(
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = color;
    return output;
}`, [], "2d", "t");

const boneRenderPipeline = GPU.createRenderPipelineFromOneFile([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Vsr")], `
struct Camera {
    position: vec2<f32>,
    zoom: f32,
    padding: f32,
}

struct BoneVertices {
    h: vec2<f32>,
    t: vec2<f32>,
}

@group(0) @binding(0) var<uniform> cvsAspect: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> verticesPosition: array<BoneVertices>;
@group(2) @binding(0) var<storage, read> colors: array<vec4<f32>>; // ボーンごとの色
const size = 0.05;
const ratio = 0.1;

struct VertexOutput {
    @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
    @location(0) color: vec4<f32>,
}

fn worldPosToClipPos(position: vec2<f32>) -> vec4<f32> {
    return vec4f((position - camera.position) * camera.zoom * cvsAspect, 0, 1.0);
}

// バーテックスシェーダー
@vertex
fn vmain(
    @builtin(instance_index) instanceIndex: u32, // インスタンスのインデックス
    @builtin(vertex_index) vertexIndex: u32
    ) -> VertexOutput {
    // 頂点データを取得
    let index = instanceIndex;
    let position1 = verticesPosition[index].h;
    let position2 = verticesPosition[index].t;
    let sub = position2 - position1;
    let normal = normalize(vec2<f32>(-sub.y, sub.x)); // 仮の法線
    var offset = vec2<f32>(0.0);
    let sectionPosition = mix(position1, position2, ratio);

    let vIndex = vertexIndex % 6u;

    let k = (normal * size * length(sub));
    if (vIndex == 0u) {
        offset = sectionPosition - k;
    } else if (vIndex == 1u) {
        offset = sectionPosition + k;
    } else if (vIndex == 2u) {
        offset = position2;
    } else if (vIndex == 3u) {
        offset = sectionPosition - k;
    } else if (vIndex == 4u) {
        offset = sectionPosition + k;
    } else if (vIndex == 5u) {
        offset = position1;
    }

    var output: VertexOutput;
    output.position = worldPosToClipPos(offset);
    output.color = colors[index];
    // output.color = vec4<f32>(1,0,0,1);
    return output;
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

@fragment
fn fmain(
    @location(0) color: vec4<f32>
) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = color;
    return output;
}`, [], "2d", "t");

export class Render {
    constructor(cvs, camera, gizmoConfig) {
        this.cvs = cvs;
        this.ctx = cvs.getContext('webgpu');
        this.ctx.configure({
            device: device,
            format: format
        });

        this.cvsAspectBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32"]);
        this.resizeCVS();
        this.camera = camera;
        this.staticGroup = GPU.createGroup(GPU.getGroupLayout("Vu_Vu_Fts"), [{item: this.cvsAspectBuffer, type: 'b'}, {item: camera.cameraDataBuffer, type: 'b'}, {item: sampler, type: 'ts'}]);
        this.gizmoConfig = gizmoConfig;
    }

    resizeCVS() {
        GPU.writeBuffer(this.cvsAspectBuffer, new Float32Array([1 / this.cvs.width, 1 /  this.cvs.height]));
    }

    rendering() {
        const view = this.ctx.getCurrentTexture().createView();
        if (!view) {
            console.warn("cvsが取得できません")
        }
        const commandEncoder = device.createCommandEncoder();
        for (const value of renderObjectManager.maskTextures) {
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
                for (const graphicMesh of value.renderingObjects) {
                    maskRenderPass.setBindGroup(1, graphicMesh.maskRenderGroup);
                    maskRenderPass.setVertexBuffer(0, graphicMesh.v_meshIndexBuffer);
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
                    clearValue: renderObjectManager.backgroundColor,
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
        renderPass.setPipeline(renderPipeline);
        for (const graphicMesh of app.scene.renderingOrder) {
            if (graphicMesh.isInit && graphicMesh.visible) {
                renderPass.setBindGroup(1, graphicMesh.renderGroup);
                renderPass.setVertexBuffer(0, graphicMesh.v_meshIndexBuffer);
                renderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);
            }
        }
        // 処理の終了と送信
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    }

    renderingVirtuality(object, frame, alpha = 1) {
        if (object) {
            if (!Array.isArray(frame)) {
                frame = [frame];
            }
            const commandEncoder = device.createCommandEncoder();
            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: this.ctx.getCurrentTexture().createView(),
                        loadOp: 'load',
                        storeOp: 'store',
                    },
                ],
            });
        } else {
            return ;
        }
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
        if (!this.gizmoConfig.visible) return ;
        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.ctx.getCurrentTexture().createView(),
                    loadOp: 'load',
                    storeOp: 'store',
                },
            ],
        });
        // オブジェクト表示
        renderPass.setBindGroup(0, this.staticGroup);

        const renderingGraphicMesh = (object, option, flags, parts) => {
            if (option == "メッシュ") {
                renderPass.setBindGroup(1, object.GUIMeshRenderGroup);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.graphicMesh[flags].group);
                renderPass.setPipeline(graphicMeshsMeshRenderPipeline);
                renderPass.draw(3 * 4, object.meshesNum, 0, 0); // (3 * 4) 3つの辺を4つの頂点を持つ四角形で表示する
            }
            if (option == "頂点&メッシュ") {
                renderPass.setBindGroup(1, object.GUIMeshRenderGroup);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.graphicMesh["エッジ"].group);
                renderPass.setPipeline(graphicMeshsMeshRenderPipeline);
                renderPass.draw(3 * 4, object.meshesNum, 0, 0); // (3 * 4) 3つの辺を4つの頂点を持つ四角形で表示する

                if (object.editor.baseEdgesRenderGroup) {
                    renderPass.setBindGroup(1, object.editor.baseEdgesRenderGroup);
                    renderPass.setBindGroup(2, editorParameters.gizmoParameters.graphicMesh["ベースエッジ"].group);
                    renderPass.setPipeline(edgesFromVerticesAndEdgesRenderPipeline);
                    renderPass.draw(4, object.editor.baseEdges.length, 0, 0); // (3 * 4) 3つの辺を4つの頂点を持つ四角形で表示する
                }
                if (object.editor.baseSilhouetteEdgesRenderGroup) {
                    renderPass.setBindGroup(1, object.editor.baseSilhouetteEdgesRenderGroup);
                    renderPass.setBindGroup(2, editorParameters.gizmoParameters.graphicMesh["ベースシルエットエッジ"].group);
                    renderPass.setPipeline(edgesFromVerticesAndEdgesRenderPipeline);
                    renderPass.draw(4, object.editor.baseSilhouetteEdges.length, 0, 0); // (3 * 4) 3つの辺を4つの頂点を持つ四角形で表示する
                }

                renderPass.setBindGroup(1, object.GUIVerticesRenderGroup);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.vertices["inactive"].group);
                renderPass.setPipeline(screenCirclesFromAllVerticesRenderPipeline);
                renderPass.draw(4, object.verticesNum, 0, 0);
            }
            if (parts && parts.num) {
                renderPass.setPipeline(circlesFromLimitedVerticesRenderPipeline);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.vertices["active"].group);
                renderPass.setBindGroup(3, parts.group);
                renderPass.draw(4, parts.num, 0, 0);
            }
        }

        const renderingModifier = (modifier, type, flags, parts = null) => {
            if (type == "頂点&メッシュ") {
                renderPass.setBindGroup(1, modifier.GUIMeshRenderGroup);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.modifier[flags].group);
                renderPass.setPipeline(modifierMeshRenderPipeline);
                renderPass.draw(4 * 4, modifier.meshesNum, 0, 0); // (4 * 4) 4つの辺を4つの頂点を持つ四角形で表示する

                renderPass.setBindGroup(1, modifier.GUIVerticesRenderGroup);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.vertices["inactive"].group);
                renderPass.setPipeline(screenCirclesFromAllVerticesRenderPipeline);
                renderPass.draw(4, modifier.verticesNum, 0, 0);
            }
            if (parts && parts.num) {
                renderPass.setPipeline(circlesFromLimitedVerticesRenderPipeline);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.vertices["active"].group);
                renderPass.setBindGroup(3, parts.group);
                renderPass.draw(4, parts.num, 0, 0);
            }
            if (type == "簡易") {
                renderPass.setBindGroup(1, modifier.GUIMeshRenderGroup);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.modifier[flags].group);
                renderPass.setPipeline(modifierFrameRenderPipeline);
                renderPass.draw(4, (modifier.fineness[0] * 2) + (modifier.fineness[1] * 2), 0, 0); // (4 * 4) 4つの辺を4つの頂点を持つ四角形で表示する
                renderPass.setPipeline(modifierFrame2RenderPipeline);
                renderPass.draw(3, 4, 0, 0);
            }
        }

        // ボーンモディフィア
        const renderingBoneModififer = (boneModifier, state, vert = false, parts = null) => {
            renderPass.setPipeline(boneRenderPipeline);
            // renderPass.setBindGroup(2, boneModifier.editor.boneColor.group);
            renderPass.setBindGroup(2, boneModifier.editor.bonesColor.group);
            renderPass.setBindGroup(1, boneModifier.GUIrenderGroup);
            renderPass.draw(3 * 2, boneModifier.boneNum, 0, 0);
            if (parts) {
                if (parts.vert && parts.num) {
                    renderPass.setPipeline(circlesFromLimitedVerticesRenderPipeline);
                    renderPass.setBindGroup(2, editorParameters.gizmoParameters.boneVertices["active"].group);
                    renderPass.setBindGroup(3, parts.group);
                    renderPass.draw(4, parts.num, 0, 0);
                } else if (parts.bone && parts.num) {
                    renderPass.setPipeline(LimitedBoneRenderPipeline);
                    renderPass.setBindGroup(2, editorParameters.gizmoParameters.boneModifier["active"].group);
                    renderPass.setBindGroup(3, parts.group);
                    renderPass.draw(3 * 2, parts.num, 0, 0);
                }
            }
            if (vert) {
                renderPass.setPipeline(boneVerticesRenderPipeline);
                renderPass.setBindGroup(2, boneModifier.editor.boneColor.group);
                renderPass.draw(6 * 2, boneModifier.boneNum, 0, 0);
            }
            renderPass.setPipeline(boneRelationshipsRenderPipeline);
            renderPass.setBindGroup(2, editorParameters.gizmoParameters.boneModifier[state].group);
            renderPass.setBindGroup(1, boneModifier.relationshipRenderGroup);
            renderPass.draw(4, boneModifier.boneNum, 0, 0);
        }

        // ベジェモディフィア
        const renderingLineModififer = (bezierModifier, state, vert = false, parts = null) => {
            renderPass.setPipeline(bezierRenderPipeline);
            renderPass.setBindGroup(2, editorParameters.gizmoParameters.bezierModifier[state].group);
            renderPass.setBindGroup(1, bezierModifier.GUIrenderGroup);
            renderPass.draw(2 * 50, bezierModifier.pointNum - 1, 0, 0);
            if (vert) {
                renderPass.setPipeline(screenCirclesFromAllVerticesRenderPipeline);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.vertices["inactive"].group);
                renderPass.draw(4, bezierModifier.verticesNum, 0, 0);
            }
            if (parts && parts.num) {
                renderPass.setPipeline(circlesFromLimitedVerticesRenderPipeline);
                renderPass.setBindGroup(2, editorParameters.gizmoParameters.vertices["active"].group);
                renderPass.setBindGroup(3, parts.group);
                renderPass.draw(4, parts.num, 0, 0);
            }
        }

        // ベジェモディフィア
        const renderingRotateModififer = (rotateModifier, state) => {
            renderPass.setPipeline(rotateModifierRenderPipeline);
            renderPass.setBindGroup(2, editorParameters.gizmoParameters.rotateModifier[state].group);
            renderPass.setBindGroup(1, rotateModifier.BBoxRenderGroup);
            renderPass.draw(4, 1, 0, 0);
        }

        const utilityLineRender = () => {
        }

        const weightRender = (object) => {
            renderPass.setPipeline(weightFromVerticesRenderPipeline);
            renderPass.setBindGroup(1, object.renderWegihtGroup);
            renderPass.setBindGroup(2, stateMachine.state.data.targetBoneGroup);
            renderPass.draw(4, object.verticesNum, 0, 0);
        }

        if (true) {
            if (stateMachine.state.data.hoverObjects) {
                // 回転モディフィア
                renderPass.setPipeline(rotateModifierRenderPipeline);
                for (const modifier of app.hierarchy.rotateModifiers) {
                    renderingRotateModififer(modifier, "inactive")
                }
                // ボーンモディフィア
                for (const modifier of app.hierarchy.boneModifiers) {
                    renderingBoneModififer(modifier,"inactive");
                }
                // モディフィア
                for (const modifier of app.hierarchy.modifiers) {
                    renderingModifier(modifier, "簡易", "inactive");
                }
                // ベジェモディフィア
                for (const modifier of app.hierarchy.bezierModifiers) {
                    renderingLineModififer(modifier, "inactive");
                }
                if (stateMachine.state.data.hoverObjects) {
                    // ホバー
                    for (const object of stateMachine.state.data.hoverObjects) {
                        if (object.type == "グラフィックメッシュ") {
                            renderingGraphicMesh(object, "メッシュ", "hover");
                        } else if (object.type == "ボーンモディファイア") {
                            renderingBoneModififer(object,"hover");
                        } else if (object.type == "モディファイア") {
                            renderingModifier(object, "簡易", "hover");
                        } else if (object.type == "回転モディファイア") {
                            renderingRotateModififer(object, "hover");
                        } else if (object.type == "ベジェモディファイア") {
                            renderingLineModififer(object, "hover");
                        }
                    }
                }
                if (stateMachine.state.data.selectObjects) {
                    // ホバー
                    for (const object of stateMachine.state.data.selectObjects) {
                        if (object.type == "グラフィックメッシュ") {
                            renderingGraphicMesh(object, "メッシュ", "select");
                        } else if (object.type == "ボーンモディファイア") {
                            renderingBoneModififer(object,"select");
                        } else if (object.type == "モディファイア") {
                            renderingModifier(object, "簡易", "select");
                        } else if (object.type == "回転モディファイア") {
                            renderingRotateModififer(object, "select");
                        } else if (object.type == "ベジェモディファイア") {
                            renderingLineModififer(object, "select");
                        }
                    }
                }
            }
        }

        if (stateMachine.searchStringInNowState("グラフィックメッシュ")) {
            const graphicMesh = stateMachine.state.data.activeObject;
            if (stateMachine.searchStringInNowState("グラフィックメッシュ_メッシュ編集")) {
                renderingGraphicMesh(graphicMesh, "頂点&メッシュ", "active", {num: stateMachine.state.data.selectIndexs.length, group: stateMachine.state.data.selectIndexsGroup});
            } else if (stateMachine.searchStringInNowState("グラフィックメッシュ_ウェイト編集")) {
                // renderPass.setPipeline(weigthRenderPipeline);
                // renderPass.setBindGroup(1, graphicMesh.renderWegihtGroup);
                // renderPass.setBindGroup(2, stateMachine.state.data.targetBoneGroup);
                // renderPass.setVertexBuffer(0, graphicMesh.v_meshIndexBuffer);
                // renderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);

                renderingGraphicMesh(graphicMesh, "メッシュ", "active");

                weightRender(graphicMesh);

                const modifier = graphicMesh.parent;
                renderingBoneModififer(modifier, "active", false, {bone: true, num: 1, group: stateMachine.state.data.targetBoneGroup});
            } else {
                renderingGraphicMesh(graphicMesh, "メッシュ", "active");
            }
        } else if (stateMachine.searchStringInNowState("モディファイア")) {
            const modifier = stateMachine.state.data.activeObject;
            if (stateMachine.searchStringInNowState("モディファイア_メッシュ編集")) {
                renderingModifier(modifier, "頂点&メッシュ", "active", {num: stateMachine.state.data.selectIndexs.length, group: stateMachine.state.data.selectIndexsGroup});
            } else {
                renderingModifier(modifier, "簡易", "active");
            }
        } else if (stateMachine.searchStringInNowState("ベジェモディファイア")) {
            const modifier = stateMachine.state.data.activeObject;
            if (stateMachine.searchStringInNowState("ベジェモディファイア_ベース編集")) {
                renderingLineModififer(modifier, "active", true, {num: stateMachine.state.data.selectIndexs.length, group: stateMachine.state.data.selectIndexsGroup});
            } else if (stateMachine.searchStringInNowState("ベジェモディファイア_ウェイト編集")) {
                weightRender(modifier);

                const Pmodifier = modifier.parent;
                renderingBoneModififer(Pmodifier, "active", false, {bone: true, num: 1, group: stateMachine.state.data.targetBoneGroup});
            } else {
                renderingLineModififer(modifier, "active", true);
            }
        } else if (stateMachine.searchStringInNowState("回転モディファイア")) {
            const modifier = stateMachine.state.data.activeObject;
            if (stateMachine.searchStringInNowState("選択") || stateMachine.searchStringInNowState("並行移動") || stateMachine.searchStringInNowState("リサイズ") || stateMachine.searchStringInNowState("回転") || stateMachine.searchStringInNowState("ウェイトペイント") || stateMachine.searchStringInNowState("関数待機")) {
                renderingRotateModififer(modifier, "active");
            } else {
                renderingRotateModififer(modifier, "active");
            }
        } else if (stateMachine.searchStringInNowState("ボーンモディファイア")) {
            const modifier = stateMachine.state.data.activeObject;
            if (stateMachine.searchStringInNowState("ボーンモディファイア_ボーン編集")) {
                renderingBoneModififer(modifier, "active", true, {vert: true, num: stateMachine.state.data.selectIndexs.length, group: stateMachine.state.data.selectIndexsGroup});
            } else if (stateMachine.searchStringInNowState("ボーンモディファイア_アニメーション編集")) {
                renderingBoneModififer(modifier, "active", true, {bone: true, num: stateMachine.state.data.selectIndexs.length, group: stateMachine.state.data.selectIndexsGroup});
            } else {
                renderingBoneModififer(modifier, "active");
            }
        }

        if ("selectIndexs" in stateMachine.state.data && stateMachine.state.data.selectIndexs.length) {
            renderPass.setPipeline(BBoxRenderPipeline);
            renderPass.setBindGroup(1, stateMachine.state.data.selectBBoxRenderGroup);
            renderPass.setBindGroup(2, editorParameters.gizmoParameters.masterBBox.group);
            renderPass.draw(4, 1, 0, 0);
            renderPass.setPipeline(screenCirclesFromAllVerticesRenderPipeline);
            renderPass.setBindGroup(1, stateMachine.state.data.referenceCoordinatesRenderGroup);
            renderPass.setBindGroup(2, editorParameters.gizmoParameters.masterPoint.group);
            renderPass.draw(4, 1, 0, 0);
            if (editorParameters.smoothType != 0) {
                renderPass.setPipeline(circlesFromAllVerticesRenderPipeline);
                renderPass.setBindGroup(2, editorParameters.smoothRadiusRenderingConfig.group);
                renderPass.draw(4, 1, 0, 0);
            }
            this.renderingCircle(renderPass, {point: activeView.mouseState.positionForGPU, radius: 20, radiusOption: true, width: 10, widthOption: true, color: [1,0,0,1]});
        }

        renderPass.setPipeline(screenCirclesFromAllVerticesRenderPipeline);
        renderPass.setBindGroup(1, stateMachine.mouseRenderGroup);
        renderPass.setBindGroup(2, editorParameters.circleSelectRenderingConfigGroup.group);
        renderPass.draw(4, 1, 0, 0);

        this.renderingCircle(renderPass, {point: [0,0], radius: 100, width: 10, widthOption: true, color: [1,0,0,1]});

        // 処理の終了と送信
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    }
}