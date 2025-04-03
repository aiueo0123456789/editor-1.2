import re

# 置換前のJSコード（例）
js_code = """
export const v_renderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/v_render.wgsl'));
export const f_renderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/f_render.wgsl'));
export const v_maskRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/マスク/v.wgsl'));
export const f_maskRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/マスク/f.wgsl'));
export const v_screenAllSquareRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/v_全ての頂点をスクーリン座標に四角として表示.wgsl'));
export const v_allSquareRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/v_全ての頂点を四角として表示.wgsl'));
export const v_partSquareRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/v_限られた頂点を四角として表示.wgsl'));
export const f_squareRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/f_円塗りつぶし.wgsl'));
export const v_lineRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/v_線分.wgsl'));
export const v_modifierMeshRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/モディファイア/v_メッシュ.wgsl'));
export const v_modifierFrameRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/モディファイア/v_枠の表示.wgsl'));
export const v_modifierFrame2RenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/モディファイア/v_枠2の表示 .wgsl'));
export const v_graphicMeshsMeshRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/グラフィックメッシュ/v_メッシュ.wgsl'));
export const f_fillRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/f_単色塗りつぶし.wgsl'));
export const f_strokeRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/f_枠線.wgsl'));
export const v_BBoxRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/v_BBox.wgsl'));
export const v_bezierRenderShaderModule = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/ベジェモディファイア/v_ベジェ.wgsl'));
export const v_cvsDraw = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/テクスチャのcvs表示/v_canvasDraw.wgsl'));
export const f_cvsDraw = GPU.createShaderModule(await loadFile('./script/wgsl/レンダー/テクスチャのcvs表示/f_canvasDraw.wgsl'));

const circleSelectVertices = GPU.createShaderModule(await loadFile('./script/wgsl/compute/頂点の円選択.wgsl'));
const boxSelectVertices = GPU.createShaderModule(await loadFile('./script/wgsl/compute/頂点のボックス選択.wgsl'));
const calculateAllBBox = GPU.createShaderModule(await loadFile('./script/wgsl/compute/全ての頂点からBBoxを計算.wgsl'));
const calculateLimitBBox = GPU.createShaderModule(await loadFile('./script/wgsl/compute/限られた頂点からBBoxを計算.wgsl'));
const calculateLimitedBoneBBox = GPU.createShaderModule(await loadFile('./script/wgsl/compute/限られたボーンからBBoxを計算.wgsl'));
const modifierTransform = GPU.createShaderModule(await loadFile('./script/wgsl/compute/モディファイア/モディファイアの変形を適応.wgsl'));
const rotateModifierTransform = GPU.createShaderModule(await loadFile('./script/wgsl/compute/回転モディファイアの変形を適応.wgsl'));
const bezierModifierTransform = GPU.createShaderModule(await loadFile('./script/wgsl/compute/ベジェモディファイア/ベジェモディファイアの変形を適応.wgsl'));
const adaptAllAnimationToVertices = GPU.createShaderModule(await loadFile('./script/wgsl/compute/全ての頂点にアニメーションを適応.wgsl'));
const setModifierWeightToGraphicMesh = GPU.createShaderModule(await loadFile('./script/wgsl/compute/モディファイア/頂点にモディファイアとの関係を作る.wgsl'));
const setBezierModifierWeightToGraphicMesh = GPU.createShaderModule(await loadFile('./script/wgsl/compute/ベジェモディファイア/頂点にベジェモディファイアとの関係を作る.wgsl'));
const calculateAllAverage = GPU.createShaderModule(await loadFile('./script/wgsl/compute/全ての頂点の平均.wgsl'));
const updateCenterPosition = GPU.createShaderModule(await loadFile('./script/wgsl/compute/中心位置を変更.wgsl'));
"""

# 正規表現で "await loadFile(パス)" を "fetchShader(パス)" に置換
updated_code = re.sub(r'await loadFile\(([^)]+)\)', r'shader.get(\1)', js_code)

# 変換後のコードを出力
print(updated_code)