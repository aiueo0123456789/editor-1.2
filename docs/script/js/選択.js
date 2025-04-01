import { GPU } from "./webGPU.js";
import { c_srw_u,circleSelectVerticesPipeline,boxSelectVerticesPipeline, collisionMeshPipeline, collisionBonePipeline, collisionModifierPipeline, collisionBezierModifierPipeline } from "./GPUObject.js";
import { vec2 } from "./ベクトル計算.js";
import { hitTestPointTriangle } from "./utility.js";

export class Select {
    constructor(convertCoordinate) {
        this.convertCoordinate = convertCoordinate;
    }

    // async selectBone(object, point) {
    //     const resultBuffer = GPU.createStorageBuffer(object.verticesNum * (1) * 4, undefined, ["f32"]);
    //     const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
    //     const collisionVerticesGroup = GPU.createGroup(c_srw_u, [{item: resultBuffer, type: "b"},{item: pointBuffer, type: "b"}]);

    //     GPU.runComputeShader(circleSelectVerticesPipeline, [collisionVerticesGroup, object.collisionVerticesGroup], Math.ceil(object.verticesNum / 64));

    //     const distances = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);
    //     let minIndex = 0;
    //     let minDist = Infinity;
    //     for (let i = 0; i < distances.length; i ++) {
    //         const dist = distances[i];
    //         if (dist < minDist) {
    //             minIndex = i;
    //             minDist = dist;
    //         }
    //     }

    //     return Math.floor(minIndex / 2);
    // }

    async closestSelectVertices(object, point, radius, maxDist = Infinity) {
        radius = this.convertCoordinate.GPUSizeFromCPU(radius);
        const resultBuffer = GPU.createStorageBuffer(object.verticesNum * (1) * 4, undefined, ["f32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
        const collisionGroup = GPU.createGroup(c_srw_u, [{item: resultBuffer, type: "b"},{item: pointBuffer, type: "b"}]);

        GPU.runComputeShader(circleSelectVerticesPipeline, [collisionGroup, object.collisionVerticesGroup], Math.ceil(object.verticesNum / 64));

        const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

        let result = [];
        let minDist = maxDist;
        for (let i = 0; i < collisionResult.length; i ++) {
            const dist = collisionResult[i];
            if (dist < minDist) {
                result = [i];
                minDist = dist;
            }
        }

        return result;
    }

    async circleSelectVertices(object, point, radius) {
        radius = this.convertCoordinate.GPUSizeFromCPU(radius);
        const resultBuffer = GPU.createStorageBuffer(object.verticesNum * (1) * 4, undefined, ["f32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
        const collisionGroup = GPU.createGroup(c_srw_u, [{item: resultBuffer, type: "b"},{item: pointBuffer, type: "b"}]);

        GPU.runComputeShader(circleSelectVerticesPipeline, [collisionGroup, object.collisionVerticesGroup], Math.ceil(object.verticesNum / 64));

        const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

        const result = [];
        for (let i = 0; i < collisionResult.length; i ++) {
            const dist = collisionResult[i];
            if (dist < radius) {
                result.push(i);
            }
        }

        return result;
    }

    async selectBones(object, point) {
        const resultBuffer = GPU.createStorageBuffer(object.boneNum * (1) * 4, undefined, ["f32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
        const collisionGroup = GPU.createGroup(c_srw_u, [resultBuffer, pointBuffer]);

        GPU.runComputeShader(collisionBonePipeline, [collisionGroup, object.collisionBoneGroup], Math.ceil(object.boneNum / 64));

        const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

        const result = [];
        for (let i = 0; i < collisionResult.length; i ++) {
            const dist = collisionResult[i];
            if (dist > 50) {
                result.push(i);
            }
        }
        return result;
    }

    async selectBone(object, point) {
        const resultBuffer = GPU.createStorageBuffer(object.boneNum * (1) * 4, undefined, ["f32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
        const collisionGroup = GPU.createGroup(c_srw_u, [resultBuffer, pointBuffer]);

        GPU.runComputeShader(collisionBonePipeline, [collisionGroup, object.collisionBoneGroup], Math.ceil(object.boneNum / 64));

        const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

        for (let i = 0; i < collisionResult.length; i ++) {
            const dist = collisionResult[i];
            if (dist > 50) {
                return i;
            }
        }
        return -1;
    }

    async selectSilhouette(object, point, errorRange = 50) {
        if (!object.editor.BBox) return false;
        if (object.editor.BBox.min[0] < point[0] + errorRange && object.editor.BBox.min[1] < point[1] + errorRange &&
            object.editor.BBox.max[0] > point[0] - errorRange && object.editor.BBox.max[1] > point[1] - errorRange
        ) {
            if (object.type == "グラフィックメッシュ") {
                const resultBuffer = GPU.createStorageBuffer(object.meshesNum * (1) * 4, undefined, ["f32"]);
                const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
                const collisionGroup = GPU.createGroup(c_srw_u, [resultBuffer, pointBuffer]);

                GPU.runComputeShader(collisionMeshPipeline, [collisionGroup, object.collisionMeshGroup], Math.ceil(object.meshesNum / 64));

                const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

                for (let i = 0; i < collisionResult.length; i ++) {
                    const dist = collisionResult[i];
                    if (dist > 50) {
                        return true;
                    }
                }
            } else if (object.type == "ボーンモディファイア") {
                const resultBuffer = GPU.createStorageBuffer(object.boneNum * (1) * 4, undefined, ["f32"]);
                const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
                const collisionGroup = GPU.createGroup(c_srw_u, [resultBuffer, pointBuffer]);

                GPU.runComputeShader(collisionBonePipeline, [collisionGroup, object.collisionBoneGroup], Math.ceil(object.boneNum / 64));

                const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

                for (let i = 0; i < collisionResult.length; i ++) {
                    const dist = collisionResult[i];
                    if (dist > 50) {
                        return true;
                    }
                }
            } else if (object.type == "モディファイア") {
                const resultBuffer = GPU.createStorageBuffer(4 * (1) * 4, undefined, ["f32"]);
                const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
                const collisionGroup = GPU.createGroup(c_srw_u, [resultBuffer, pointBuffer]);

                GPU.runComputeShader(collisionModifierPipeline, [collisionGroup, object.collisionSilhouetteGroup], Math.ceil(4 / 64));

                const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

                for (let i = 0; i < collisionResult.length; i ++) {
                    const dist = collisionResult[i];
                    if (dist > 50) {
                        return true;
                    }
                }
            } else if (object.type == "回転モディファイア") {
                const size = 5.0;
                const length = 50.0;

                const position = object.rotateData.slice(0,2);
                const scale = object.rotateData[2];
                const angle = object.rotateData[3];

                const a = vec2.addR(vec2.rotate2D([size * scale,0], angle), position);
                const b = vec2.addR(vec2.rotate2D([0,length * scale], angle), position);
                const c = vec2.addR(vec2.rotate2D([-size * scale,0], angle), position);
                return hitTestPointTriangle(a,b,c,point);
            } else if (object.type == "ベジェモディファイア") {
                const resultBuffer = GPU.createStorageBuffer(object.pointNum * 4, undefined, ["f32"]);
                const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
                const collisionGroup = GPU.createGroup(c_srw_u, [resultBuffer, pointBuffer]);

                GPU.runComputeShader(collisionBezierModifierPipeline, [collisionGroup, object.collisionVerticesGroup], Math.ceil(object.pointNum / 64));

                const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

                for (let i = 0; i < collisionResult.length; i ++) {
                    const dist = collisionResult[i];
                    if (dist < 0.5) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    async selectMesh(object, point) {
        const resultBuffer = GPU.createStorageBuffer(object.meshesNum * (1) * 4, undefined, ["f32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
        const collisionGroup = GPU.createGroup(c_srw_u, [resultBuffer, pointBuffer]);

        GPU.runComputeShader(collisionMeshPipeline, [collisionGroup, object.collisionMeshGroup], Math.ceil(object.meshesNum / 64));

        const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

        const result = [];
        for (let i = 0; i < collisionResult.length; i ++) {
            const dist = collisionResult[i];
            if (dist > 50) {
                result.push(i);
            }
        }

        return result;
    }

    async pointToVerticesDistance(object, point) {
        const resultBuffer = GPU.createStorageBuffer(object.verticesNum * (1) * 4, undefined, ["f32"]);
        const pointBuffer = GPU.createUniformBuffer(2 * 4, point, ["f32","f32"]);
        const collisionVerticesGroup = GPU.createGroup(c_srw_u, [{item: resultBuffer, type: "b"},{item: pointBuffer, type: "b"}]);

        GPU.runComputeShader(circleSelectVerticesPipeline, [collisionVerticesGroup, object.collisionVerticesGroup], Math.ceil(object.verticesNum / 64));

        const distances = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

        return distances;
    }

    async boxSelectVertices(object, boundingBox) {
        const resultBuffer = GPU.createStorageBuffer(object.verticesNum * (1) * 4, undefined, ["f32"]);
        const pointBuffer = GPU.createUniformBuffer(4 * 4, boundingBox.max.concat(boundingBox.min), ["f32","f32"]);
        const collisionBoxGroup = GPU.createGroup(c_srw_u, [{item: resultBuffer, type: "b"},{item: pointBuffer, type: "b"}]);

        GPU.runComputeShader(boxSelectVerticesPipeline, [collisionBoxGroup, object.collisionVerticesGroup], Math.ceil(object.verticesNum / 64));

        const collisionResult = await GPU.getF32BufferData(resultBuffer, resultBuffer.size);

        const result = [];
        for (let i = 0; i < collisionResult.length; i ++) {
            const dist = collisionResult[i];
            if (dist > 50) {
                result.push(i);
            }
        }

        return result;
    }

    async BBoxSelect(object, point, radius) {
        radius = this.convertCoordinate.GPUSizeFromCPU(radius);
        if (!object.BBoxBuffer) return ;
        const data = await GPU.getF32BufferData(object.BBoxBuffer);
        if (!data) return false;
        const min = [data[0], data[1]];
        const max = [data[2], data[3]];

        const collisionBBox = () => {
            return vec2.distanceR(max, point) < radius ||
                   vec2.distanceR(min, point) < radius ||
                   vec2.distanceR([max[0], min[1]], point) < radius ||
                   vec2.distanceR([min[0], max[1]], point) < radius;
        }

        return collisionBBox();
    }
}