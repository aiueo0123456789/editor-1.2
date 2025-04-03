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

export const circleSelectVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Cu"),GPU.getGroupLayout("Csr")], circleSelectVertices);
export const boxSelectVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Cu"),GPU.getGroupLayout("Csr")], boxSelectVertices);
export const calculateAllBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"),GPU.getGroupLayout("Csrw")], calculateAllBBox);
export const calculateLimitBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"),GPU.getGroupLayout("Csr"),GPU.getGroupLayout("Csrw")], calculateLimitBBox);
export const calculateLimitedBoneBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"),GPU.getGroupLayout("Csr"),GPU.getGroupLayout("Csrw")], calculateLimitedBoneBBox);
export const modifierTransformPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Csr_Csr")], modifierTransform);
export const rotateModifierTransformPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"), GPU.getGroupLayout("Cu_Cu")], rotateModifierTransform);
export const bezierModifierTransformPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Csr_Csr")], bezierModifierTransform);
export const adaptAllAnimationToVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"), GPU.getGroupLayout("Csr_Cu")], adaptAllAnimationToVertices);
export const setModifierWeightToGraphicMeshPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Cu_Cu")], setModifierWeightToGraphicMesh);
export const setBezierModifierWeightToGraphicMeshPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Csr")], setBezierModifierWeightToGraphicMesh);
export const calculateAllAveragePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"),GPU.getGroupLayout("Csrw")], calculateAllAverage);
export const MarchingSquaresPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Ct")], GPU.createShaderModule(await loadFile('script/wgsl/compute/MarchingSquares.wgsl')));
export const updateCenterPositionPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Cu")], updateCenterPosition);

// レンダーパイプライン
export const pipelineFortextureToCVS = GPU.createRenderPipeline([GPU.getGroupLayout("Fts_Ft")], v_cvsDraw, f_cvsDraw, [], "cvsCopy");
export const renderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Ft_Ft_Fu")], v_renderShaderModule, f_renderShaderModule, [["u"]], "2d", "t");
export const maskRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr_Ft")], v_maskRenderShaderModule, f_maskRenderShaderModule, [["u"]], "mask", "t");
export const screenCirclesFromAllVerticesRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Vu_Fu")], v_screenAllSquareRenderShaderModule, f_squareRenderShaderModule, [], "2d", "s");
export const circlesFromAllVerticesRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Vu_Fu")], v_allSquareRenderShaderModule, f_squareRenderShaderModule, [], "2d", "s");
export const circlesFromLimitedVerticesRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Vu_Fu"), GPU.getGroupLayout("Vsr")], v_partSquareRenderShaderModule, f_squareRenderShaderModule, [], "2d", "s");
export const BBoxRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Fu")], v_BBoxRenderShaderModule, f_strokeRenderShaderModule, [], "2d", "s");
// export const lineRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Fu")], v_lineRenderShaderModule, f_fillRenderShaderModule, [], "2d", "s");
export const graphicMeshsMeshRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vsr"), GPU.getGroupLayout("Fu")], v_graphicMeshsMeshRenderShaderModule, f_fillRenderShaderModule, [], "2d", "s");
export const modifierMeshRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vu"), GPU.getGroupLayout("Fu")], v_modifierMeshRenderShaderModule, f_fillRenderShaderModule, [], "2d", "s");
export const modifierFrameRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vu"), GPU.getGroupLayout("Fu")], v_modifierFrameRenderShaderModule, f_fillRenderShaderModule, [], "2d", "s");
export const modifierFrame2RenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr_Vu"), GPU.getGroupLayout("Fu")], v_modifierFrame2RenderShaderModule, f_fillRenderShaderModule, [], "2d", "t");
export const bezierRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Fu")], v_bezierRenderShaderModule, f_fillRenderShaderModule, [], "2d", "s");
export const rotateModifierRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vu"), GPU.getGroupLayout("Fu")], await loadFile('script/wgsl/レンダー/回転モディファイア/v_表示.wgsl'), f_fillRenderShaderModule, [], "2d", "t");
export const boneRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Fu")], await loadFile('script/wgsl/レンダー/ボーン/v_ボーンの表示.wgsl'), f_fillRenderShaderModule, [], "2d", "t");
export const LimitedBoneRenderPipeline = GPU.createRenderPipeline([GPU.getGroupLayout("Vu_Vu_Fts"), GPU.getGroupLayout("Vsr"), GPU.getGroupLayout("Fu"), GPU.getGroupLayout("Vsr")], await loadFile('script/wgsl/レンダー/ボーン/v_特定のボーンの表示.wgsl'), f_fillRenderShaderModule, [], "2d", "s");

export const sampler = GPU.createTextureSampler();

export const activeColorBuffer = GPU.createUniformBuffer(4 * 4,[1,1,0,1],["f32"]);
export const referenceCoordinatesColorBuffer = GPU.createUniformBuffer(4 * 4,[1,0,1,1],["f32"]);
export const sizeBuffer = GPU.createUniformBuffer(4,[20],["f32"]);
export const inactiveColorBuffer = GPU.createUniformBuffer(4 * 4,[0,0,1,1],["f32"]);

export const boneSizeBuffer = GPU.createUniformBuffer(4,[0.1],["f32"]);
export const activeBoneRendringColorBuffer = GPU.createUniformBuffer(4 * 4,[0,0,0,1],["f32"]);
export const activeBoneRendringConfigGroup = GPU.createGroup(GPU.getGroupLayout("Fu"),[activeBoneRendringColorBuffer]);
export const inactiveBoneRendringColorBuffer = GPU.createUniformBuffer(4 * 4,[0,0,0,0.2],["f32"]);
export const inactiveBoneRendringConfigGroup = GPU.createGroup(GPU.getGroupLayout("Fu"),[inactiveBoneRendringColorBuffer]);

export const activeColorGroup = GPU.createGroup(GPU.getGroupLayout("Fu"),[activeColorBuffer]);
export const referenceCoordinatesColorGroup = GPU.createGroup(GPU.getGroupLayout("Fu"),[referenceCoordinatesColorBuffer]);
export const inactiveColorGroup = GPU.createGroup(GPU.getGroupLayout("Fu"),[inactiveColorBuffer]);

export const BBoxLineWidthSizeBuffer = GPU.createUniformBuffer(4,[5],["f32"]);
export const inactiveBBoxColorBuffer = GPU.createUniformBuffer(4 * 4,[0,0,0,0.1],["f32"]);
export const inactiveBBoxColorGroup = GPU.createGroup(GPU.getGroupLayout("Fu"),[inactiveBBoxColorBuffer]);
export const activeBBoxColorBuffer = GPU.createUniformBuffer(4 * 4,[0,0,0,1],["f32"]);
export const activeBBoxColorGroup = GPU.createGroup(GPU.getGroupLayout("Fu"),[activeBBoxColorBuffer]);

export const isNotTexture = await GPU.imageToTexture2D("config/画像データ/ui_icon/画像未設定.png");