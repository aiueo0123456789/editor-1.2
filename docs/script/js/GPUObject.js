import { shaders } from "../../shader.js";
import { loadFile } from "./utility.js";
import { GPU } from "./webGPU.js";

GPU.setBaseStruct(await loadFile('./script/wgsl/baseStructes.wgsl'));

export const v_renderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/v_render.wgsl'));
export const f_renderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/f_render.wgsl'));
export const v_maskRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/マスク/v.wgsl'));
export const f_maskRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/マスク/f.wgsl'));
export const v_screenAllSquareRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/v_全ての頂点をスクーリン座標に四角として表示.wgsl'));
export const v_allSquareRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/v_全ての頂点を四角として表示.wgsl'));
export const v_partSquareRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/v_限られた頂点を四角として表示.wgsl'));
export const f_squareRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/f_円塗りつぶし.wgsl'));
export const v_lineRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/v_線分.wgsl'));
export const v_modifierMeshRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/モディファイア/v_メッシュ.wgsl'));
export const v_modifierFrameRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/モディファイア/v_枠の表示.wgsl'));
export const v_modifierFrame2RenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/モディファイア/v_枠2の表示 .wgsl'));
export const v_graphicMeshsMeshRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/グラフィックメッシュ/v_メッシュ.wgsl'));
export const f_fillRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/f_単色塗りつぶし.wgsl'));
export const f_strokeRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/f_枠線.wgsl'));
export const v_BBoxRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/v_BBox.wgsl'));
export const v_bezierRenderShaderModule = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/ベジェモディファイア/v_ベジェ.wgsl'));
export const v_cvsDraw = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/テクスチャのcvs表示/v_canvasDraw.wgsl'));
export const f_cvsDraw = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/テクスチャのcvs表示/f_canvasDraw.wgsl'));

const circleSelectVertices = GPU.createShaderModule(shaders.get('./script/wgsl/compute/頂点の円選択.wgsl'));
const boxSelectVertices = GPU.createShaderModule(shaders.get('./script/wgsl/compute/頂点のボックス選択.wgsl'));
const calculateAllBBox = GPU.createShaderModule(shaders.get('./script/wgsl/compute/全ての頂点からBBoxを計算.wgsl'));
const calculateLimitBBox = GPU.createShaderModule(shaders.get('./script/wgsl/compute/限られた頂点からBBoxを計算.wgsl'));
const calculateLimitedBoneBBox = GPU.createShaderModule(shaders.get('./script/wgsl/compute/限られたボーンからBBoxを計算.wgsl'));
const modifierTransform = GPU.createShaderModule(shaders.get('./script/wgsl/compute/モディファイア/モディファイアの変形を適応.wgsl'));
const rotateModifierTransform = GPU.createShaderModule(shaders.get('./script/wgsl/compute/回転モディファイアの変形を適応.wgsl'));
const bezierModifierTransform = GPU.createShaderModule(shaders.get('./script/wgsl/compute/ベジェモディファイア/ベジェモディファイアの変形を適応.wgsl'));
const adaptAllAnimationToVertices = GPU.createShaderModule(shaders.get('./script/wgsl/compute/全ての頂点にアニメーションを適応.wgsl'));
const setModifierWeightToGraphicMesh = GPU.createShaderModule(shaders.get('./script/wgsl/compute/モディファイア/頂点にモディファイアとの関係を作る.wgsl'));
const setBezierModifierWeightToGraphicMesh = GPU.createShaderModule(shaders.get('./script/wgsl/compute/ベジェモディファイア/頂点にベジェモディファイアとの関係を作る.wgsl'));
const calculateAllAverage = GPU.createShaderModule(shaders.get('./script/wgsl/compute/全ての頂点の平均.wgsl'));
const updateCenterPosition = GPU.createShaderModule(shaders.get('./script/wgsl/compute/中心位置を変更.wgsl'));

export const collisionMeshPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Cu"), GPU.getGroupLayout("Csr_Csr")], await loadFile('./script/wgsl/compute/選択/collisionMesh.wgsl'));
export const collisionBonePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Cu"), GPU.getGroupLayout("Csr")], await loadFile('./script/wgsl/compute/ボーンモディファイア/当たり判定.wgsl'));

export const collisionModifierPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Cu"), GPU.getGroupLayout("Csr_Cu")], await loadFile('./script/wgsl/compute/モディファイア/当たり判定.wgsl'));

export const collisionBezierModifierPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Cu"), GPU.getGroupLayout("Csr")], await loadFile('./script/wgsl/compute/ベジェモディファイア/当たり判定.wgsl'));

export const calculateBoneModifierLocalMatrixPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/適応.wgsl')));
export const calculateBoneModifierMatrixPropagatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"),GPU.getGroupLayout("Csr")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/伝播.wgsl')));
export const calculateBoneModifierWeightToVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Csr_Cu")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/ウェイト付与.wgsl')));
export const adaptBoneModifierToVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Csr_Csr")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/子の変形.wgsl')));
export const calculateBaseBoneDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csr_Csr")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/ベースボーンのデータを作る.wgsl')));
export const calculateBoneVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/表示頂点を計算.wgsl')));

export const calculateAllBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"),GPU.getGroupLayout("Csrw")], calculateAllBBox);
export const calculateLimitBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"),GPU.getGroupLayout("Csr"),GPU.getGroupLayout("Csrw")], calculateLimitBBox);
export const calculateLimitedBoneBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"),GPU.getGroupLayout("Csr"),GPU.getGroupLayout("Csrw")], calculateLimitedBoneBBox);
export const adaptAllAnimationToVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"), GPU.getGroupLayout("Csr_Cu")], adaptAllAnimationToVertices);
export const setModifierWeightToGraphicMeshPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Cu_Cu")], setModifierWeightToGraphicMesh);
export const setBezierModifierWeightToGraphicMeshPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Csr")], setBezierModifierWeightToGraphicMesh);
export const calculateAllAveragePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"),GPU.getGroupLayout("Csrw")], calculateAllAverage);
export const MarchingSquaresPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Ct")], GPU.createShaderModule(await loadFile('script/wgsl/compute/MarchingSquares.wgsl')));
export const updateCenterPositionPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Cu")], updateCenterPosition);

// レンダーパイプライン
export const pipelineFortextureToCVS = GPU.createRenderPipeline([GPU.getGroupLayout("Fts_Ft")], v_cvsDraw, f_cvsDraw, [], "cvsCopy");

export const sampler = GPU.createTextureSampler();

export const isNotTexture = await GPU.imageToTexture2D("config/画像データ/ui_icon/画像未設定.png");