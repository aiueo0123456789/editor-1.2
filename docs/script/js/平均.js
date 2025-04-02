import { GPU } from "./webGPU.js";
import { calculateAllAveragePipeline } from "./GPUObject.js";

const aaaBuffer = GPU.createStorageBuffer((2) * 4, undefined, ["f32"]);
const aaaGroup = GPU.createGroup(GPU.getGroupLayout("Csrw"), [{item: aaaBuffer, type: "b"}]);
export function calculateAllAverage(group, verticesNum) {
    GPU.runComputeShader(calculateAllAveragePipeline, [group, aaaGroup], Math.ceil(verticesNum / 20 / 64));
}