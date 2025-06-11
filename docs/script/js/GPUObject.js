import { shaders } from "../../shader.js";
import { loadFile } from "./utility.js";
import { GPU } from "./webGPU.js";

GPU.setBaseStruct(await loadFile('./script/wgsl/baseStructes.wgsl'));

export const v_cvsDraw = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/テクスチャのcvs表示/v_canvasDraw.wgsl'));
export const f_cvsDraw = GPU.createShaderModule(shaders.get('./script/wgsl/レンダー/テクスチャのcvs表示/f_canvasDraw.wgsl'));

const calculateAllBBox = GPU.createShaderModule(shaders.get('./script/wgsl/compute/全ての頂点からBBoxを計算.wgsl'));
const setModifierWeightToGraphicMesh = GPU.createShaderModule(shaders.get('./script/wgsl/compute/モディファイア/頂点にモディファイアとの関係を作る.wgsl'));
const setBezierModifierWeightToGraphicMesh = GPU.createShaderModule(shaders.get('./script/wgsl/compute/ベジェモディファイア/頂点にベジェモディファイアとの関係を作る.wgsl'));

export const calculateBoneModifierLocalMatrixPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/適応.wgsl')));
export const calculateBoneModifierMatrixPropagatePipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw"),GPU.getGroupLayout("Csr")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/伝播.wgsl')));
export const calculateBoneModifierWeightToVerticesPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Csr_Cu")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/ウェイト付与.wgsl')));
export const calculateBaseBoneDataPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csrw_Csr_Csr")], GPU.createShaderModule(await loadFile('./script/wgsl/compute/ボーンモディファイア/ベースボーンのデータを作る.wgsl')));

export const calculateAllBBoxPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"),GPU.getGroupLayout("Csrw")], calculateAllBBox);
export const setModifierWeightToGraphicMeshPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Cu_Cu")], setModifierWeightToGraphicMesh);
export const setBezierModifierWeightToGraphicMeshPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr"), GPU.getGroupLayout("Csr")], setBezierModifierWeightToGraphicMesh);

// レンダーパイプライン
export const pipelineFortextureToCVS = GPU.createRenderPipeline([GPU.getGroupLayout("Fts_Ft")], v_cvsDraw, f_cvsDraw, [], "cvsCopy");

export const sampler = GPU.createTextureSampler();

export const isNotTexture = await GPU.imageToTexture2D("config/画像データ/ui_icon/画像未設定.png");