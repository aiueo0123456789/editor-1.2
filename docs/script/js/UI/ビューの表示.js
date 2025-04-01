import { GPU, device, format } from '../webGPU.js';
import { graphicMeshsMeshRenderPipeline, modifierMeshRenderPipeline, renderPipeline,circlesFromAllVerticesRenderPipeline,circlesFromLimitedVerticesRenderPipeline,bezierRenderPipeline,BBoxRenderPipeline,sampler, v_u_u_f_ts, maskRenderPipeline, boneRenderPipeline, LimitedBoneRenderPipeline, rotateModifierRenderPipeline, v_sr_sr, v_sr, modifierFrameRenderPipeline, modifierFrame2RenderPipeline, screenCirclesFromAllVerticesRenderPipeline, f_u } from "../GPUObject.js";
import { hierarchy } from '../ヒエラルキー.js';
import { renderObjectManager, stateMachine, editorParameters } from '../main.js';

const weigthRenderPipeline = GPU.createRenderPipeline([v_u_u_f_ts, v_sr_sr, v_sr], `
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

const renderGridPipeline = GPU.createRenderPipeline([v_u_u_f_ts], await fetch('./script/wgsl/レンダー/グリッド/v_グリッド.wgsl').then(x => x.text()),await fetch('./script/wgsl/レンダー/グリッド/f_グリッド.wgsl').then(x => x.text()), [], "2d", "s");

const boneRelationshipsRenderPipeline = GPU.createRenderPipelineFromOneFile([v_u_u_f_ts, v_sr_sr], await fetch('./script/wgsl/レンダー/ボーン/関係/点線.wgsl').then(x => x.text()), [], "2d", "s");
const boneVerticesRenderPipeline = GPU.createRenderPipelineFromOneFile([v_u_u_f_ts, v_sr, f_u], await fetch('./script/wgsl/レンダー/ボーン/v_ボーン頂点の表示.wgsl').then(x => x.text()), [], "2d", "t");

const edgesFromVerticesAndEdgesRenderPipeline = GPU.createRenderPipelineFromOneFile([v_u_u_f_ts, v_sr_sr, f_u], await fetch('./script/wgsl/レンダー/グラフィックメッシュ/特定の辺の表示.wgsl').then(x => x.text()), [], "2d", "s");

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
        this.staticGroup = GPU.createGroup(v_u_u_f_ts, [{item: this.cvsAspectBuffer, type: 'b'}, {item: camera.cameraDataBuffer, type: 'b'}, {item: sampler, type: 'ts'}]);
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
        for (const graphicMesh of hierarchy.renderingOrder) {
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
            renderPass.setBindGroup(2, boneModifier.editor.boneColor.group);
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

        if (true) {
            if (stateMachine.state.data.hoverObjects) {
                // 回転モディフィア
                renderPass.setPipeline(rotateModifierRenderPipeline);
                for (const modifier of hierarchy.rotateModifiers) {
                    renderingRotateModififer(modifier, "inactive")
                }
                // ボーンモディフィア
                for (const modifier of hierarchy.boneModifiers) {
                    renderingBoneModififer(modifier,"inactive");
                }
                // モディフィア
                for (const modifier of hierarchy.modifiers) {
                    renderingModifier(modifier, "簡易", "inactive");
                }
                // ベジェモディフィア
                for (const modifier of hierarchy.bezierModifiers) {
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
                renderPass.setPipeline(weigthRenderPipeline);
                renderPass.setBindGroup(1, graphicMesh.renderWegihtGroup);
                renderPass.setBindGroup(2, stateMachine.state.data.targetBoneGroup);
                renderPass.setVertexBuffer(0, graphicMesh.v_meshIndexBuffer);
                renderPass.draw(graphicMesh.meshesNum * 3, 1, 0, 0);

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
        }

        renderPass.setPipeline(screenCirclesFromAllVerticesRenderPipeline);
        renderPass.setBindGroup(1, stateMachine.mouseRenderGroup);
        renderPass.setBindGroup(2, editorParameters.circleSelectRenderingConfigGroup.group);
        renderPass.draw(4, 1, 0, 0);

        // 処理の終了と送信
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    }
}