import { loadFile } from "./utility.js";
import { GPU } from "./webGPU.js";

// GPU.setBaseStruct(await loadFile('./script/wgsl/baseStructes.wgsl'));
export const sampler = GPU.createTextureSampler();

export const isNotTexture = await GPU.imageToTexture2D("config/画像データ/ui_icon/画像未設定.png");