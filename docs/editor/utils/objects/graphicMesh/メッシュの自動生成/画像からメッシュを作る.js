import { modClamp } from "../../../../editor/utils/utility.js";
import { device, GPU } from "../../../../editor/utils/webGPU.js";
import { vec2 } from "../../ベクトル計算.js";
import { cdt } from "./cdt.js";

export const MarchingSquaresPipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Ct")], GPU.createShaderModule(`
fn binary4ToU32Direct(b0: u32, b1: u32, b2: u32, b3: u32) -> u32 {
    return (b0 << 3u) | (b1 << 2u) | (b2 << 1u) | b3;
}

@group(0) @binding(0) var<storage, read_write> outputData: array<u32>; // 出力
@group(0) @binding(1) var inputTexture: texture_2d<f32>;

const threshold = 0.05;

fn sampleValue(samplePoint: vec2<i32>, dimensions: vec2<i32>) -> u32 {
    if (samplePoint.x >= dimensions.x || samplePoint.x < 0 ||
        samplePoint.y >= dimensions.y || samplePoint.y < 0) {
        return 0u;
    }
    return select(0u,1u,textureLoad(inputTexture, samplePoint, 0).a > threshold);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let samplePoint = vec2i(id.xy) + vec2i(-1,-1);
    let dimensions = vec2i(textureDimensions(inputTexture).xy);
    if (dimensions.x <= samplePoint.x || dimensions.y <= samplePoint.y) {
        return ;
    }
    var b0 = sampleValue(samplePoint + vec2<i32>(0, 1), dimensions);
    var b1 = sampleValue(samplePoint + vec2<i32>(1, 1), dimensions);
    var b2 = sampleValue(samplePoint + vec2<i32>(1, 0), dimensions);
    var b3 = sampleValue(samplePoint + vec2<i32>(0, 0), dimensions);

    outputData[id.x + id.y * u32(dimensions.x + 1)] = binary4ToU32Direct(b0,b1,b2,b3);
}`));
const worker = new Worker('script/js/機能/メッシュの自動生成/画像からメッシュを作るサブスレッド.js');

export function cutSilhouetteOutTriangle(vertices, meshes, edges) {
    // 点がポリゴン内にあるかを判定する関数
    const isPointInsidePolygon = (point) => {
        let vecCross3ings = 0;
        const x = point[0];
        const y = point[1];
        // ポリゴンの頂点を順番に処理
        for (let i = 0; i < edges.length; i++) {
            const p0 = vertices[edges[i][0]];
            const p1 = vertices[edges[i][1]];
            // 点が辺の水平線と交差するかチェック
            if (y > Math.min(p1[1], p0[1]) && y <= Math.max(p1[1], p0[1])) {
                // 交差する線分がある場合
                const xIntersect = (y - p1[1]) * (p0[0] - p1[0]) / (p0[1] - p1[1]) + p1[0];

                // 点が交差線より左にある場合に交差カウント
                if (xIntersect > x) {
                    vecCross3ings++;
                }
            }
        }
        // 交差回数が奇数なら内部、偶数なら外部
        return vecCross3ings % 2 === 1;
    }

    const result = [];
    for (const mesh of meshes) {
        const centerPoint = vec2.averageR([vertices[mesh[0]],vertices[mesh[1]],vertices[mesh[2]]]);
        if (isPointInsidePolygon(centerPoint)) {
            result.push(mesh);
        }
    }
    return result;
}

function fixSelfIntersectingPolygon(vertices) {
    function getIntersection(p1, p2, q1, q2) {
        const det = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);
        if (Math.abs(det) < 1e-10) return null; // 平行なら交差なし

        const t = ((q1[0] - p1[0]) * (q2[1] - q1[1]) - (q1[1] - p1[1]) * (q2[0] - q1[0])) / det;
        const u = ((q1[0] - p1[0]) * (p2[1] - p1[1]) - (q1[1] - p1[1]) * (p2[0] - p1[0])) / det;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return [
                p1[0] + t * (p2[0] - p1[0]),
                p1[1] + t * (p2[1] - p1[1])
            ];
        }
        return null;
    }

    let newVertices = [...vertices];
    let intersections = [];

    // 交差検出
    for (let i = 0; i < newVertices.length; i++) {
        let p1 = newVertices[i];
        let p2 = newVertices[(i + 1) % newVertices.length];

        for (let j = i + 2; j < newVertices.length; j++) {
            let q1 = newVertices[j];
            let q2 = newVertices[(j + 1) % newVertices.length];

            if (i === 0 && j === newVertices.length - 1) continue; // 最初と最後の辺はチェック不要

            let intersection = getIntersection(p1, p2, q1, q2);
            if (intersection) {
                intersections.push({ index1: i, index2: j, point: intersection });
            }
        }
    }

    // 交点を追加して辺を分割
    intersections.sort((a, b) => Math.min(a.index1, a.index2) - Math.min(b.index1, b.index2));

    let fixedVertices = [];
    let insertMap = new Map();

    for (let { index1, index2, point } of intersections) {
        if (!insertMap.has(index1)) insertMap.set(index1, []);
        if (!insertMap.has(index2)) insertMap.set(index2, []);
        insertMap.get(index1).push(point);
        insertMap.get(index2).push(point);
    }

    for (let i = 0; i < newVertices.length; i++) {
        fixedVertices.push(newVertices[i]);
        if (insertMap.has(i)) {
            insertMap.get(i).forEach(p => fixedVertices.push(p));
        }
    }

    return fixedVertices;
}

// export async function createEdgeFromTexture(texture, pixelDensity, padding, simplEpsilon = Math.max(texture.width, texture.height) / 50, option = "center") {
export async function createEdgeFromTexture(texture, pixelDensity, padding, simplEpsilon = 5.0, option = "center") {
    const imageSize = [texture.width, texture.height];
    const imageBufferSize = vec2.addR(imageSize, [1,1]);
    const validImageSize = vec2.reverseScaleR(imageSize, pixelDensity);
    const createUVAndFixVertices = (data) => {
        const newData = {vertices: [], uv: []};
        if (option == "center") {
            newData.vertices = data.map(x => {
                return vec2.subR(x, vec2.scaleR(validImageSize, 0.5));
            });
        } else if (option == "bottomLeft") {
            newData.vertices = data.map(x => {
                const validPosition = vec2.mulR(vec2.mulR(x, [1 / imageSize[0], 1 / imageSize[1]]), validImageSize);
                return [validPosition[0], validImageSize[1] - validPosition[1]];
            });
        }
        newData.uv = data.map(x => {
            const a = vec2.mulR(x, [1 / validImageSize[0], 1 / validImageSize[1]]);
            return [a[0], 1 - a[1]];
        });
        return newData;
    }

    function simplifyPolygon(points, epsilon, minInterval = 0.2) {
        function pointToLineDistance(point, lineStart, lineEnd) {
            const [x, y] = point;
            const [x1, y1] = lineStart
            const [x2, y2] = lineEnd;
            // 始点と終点が同じ場合は距離を 0 にする
            if (x1 === x2 && y1 === y2) {
                console.warn("Line start and end points are identical:", lineStart, lineEnd);
                return 0;
            }
            const num = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
            const den = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
            return num / den;
        }

        function filterByInterval(originalPoints, simplifiedPoints, minInterval) {
            const result = [simplifiedPoints[0]];
            for (let i = 1; i < originalPoints.length; i++) {
                const [x1, y1] = result[result.length - 1];
                const [x2, y2] = originalPoints[i];
                const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                if (dist >= minInterval) {
                    result.push([x2, y2]);
                }
            }
            // 終点を追加
            const lastPoint = simplifiedPoints[simplifiedPoints.length - 1];
            if (!vec2.same(result[result.length - 1],lastPoint)) {
                result.push(lastPoint);
            }

            return result;
        }

        // 始点と終点が同じ場合、終点を削除
        if (points[0][0] === points[points.length - 1][0] &&
            points[0][1] === points[points.length - 1][1]) {
            points.pop();
        }
        const dmax = points.reduce((max, p, i) => {
            if (i === 0 || i === points.length - 1) return max; // スキップ
            // 距離を計算
            const d = pointToLineDistance(p, points[0], points[points.length - 1]);
            // 最大距離を更新
            return Math.max(max, d);
        }, 0);
        if (dmax > epsilon) {
            // 最大距離の点を特定
            const index = points.findIndex((p, i) => {
                if (i === 0 || i === points.length - 1) return false; // スキップ
                return pointToLineDistance(p, points[0], points[points.length - 1]) === dmax;
            });
            // 再帰的に分割
            const firstHalf = simplifyPolygon(points.slice(0, index + 1), epsilon, minInterval);
            const secondHalf = simplifyPolygon(points.slice(index), epsilon, minInterval);
            // 結果を結合して返す
            return firstHalf.slice(0, -1).concat(secondHalf);
        } else {
            // 始点と終点をそのまま返す
            const simplified = [points[0], points[points.length - 1]];
            // 最小間隔を保つためにフィルタリング
            return filterByInterval(points, simplified, minInterval);
        }
    }

    // 並び替え
    function connectLines(lines) {
        const connectedLines = [];
        while (lines.length != 0) {
            // まだ処理されていない線分を探す
            const currentChain = [];
            let currentLine = lines[0];
            lines.splice(0, 1);
            // 連続する線分をつなげる
            currentChain.push(currentLine[0]);
            currentChain.push(currentLine[1]);
            let lastPosition = currentLine[1];
            // 前方向につなげる
            while (true) {
                let isFind = true;
                for (let i = 0; i < lines.length; i ++) {
                    const line = lines[i];
                    if (isPointsEqual(line[0], lastPosition)) {
                        currentChain.push(line[1]);
                        lastPosition = line[1];
                        lines.splice(i, 1);
                        isFind = false;
                        break ;
                    } else if (isPointsEqual(line[1], lastPosition)) {
                        currentChain.push(line[0]);
                        lastPosition = line[0];
                        lines.splice(i, 1);
                        isFind = false;
                        break ;
                    }
                }
                if (isFind) break; // 次が見つからなければ終了
            }
            // 後方向につなげる
            lastPosition = currentChain[0];
            while (true) {
                let isFind = true;
                for (let i = 0; i < lines.length; i ++) {
                    const line = lines[i];
                    if (isPointsEqual(line[0], lastPosition)) {
                        currentChain.unshift(line[1]);
                        lastPosition = line[1];
                        lines.splice(i, 1);
                        isFind = false;
                        break ;
                    } else if (isPointsEqual(line[1], lastPosition)) {
                        currentChain.unshift(line[0]);
                        lastPosition = line[0];
                        lines.splice(i, 1);
                        isFind = false;
                        break ;
                    }
                }
                if (isFind) break; // 次が見つからなければ終了
            }
            connectedLines.push(currentChain);
        }

        return connectedLines;
    }

    function isPointsEqual(p1, p2) {
        if (p1[0] != p2[0]) {
            return false;
        }
        if (p1[1] != p2[1]) {
            return false;
        }
        return true;
    }

    // マーチングスクウェア
    const resultbuffer = GPU.createStorageBuffer(imageBufferSize[0] * imageBufferSize[1] * 4, undefined, ["u32"]);

    const group = GPU.createGroup(GPU.getGroupLayout("Csrw_Ct"), [{item: resultbuffer, type: "b"}, {item: texture.createView(), type: "t"}]);
    const computeCommandEncoder = device.createCommandEncoder();
    const computePassEncoder = computeCommandEncoder.beginComputePass();
    computePassEncoder.setBindGroup(0, group);
    computePassEncoder.setPipeline(MarchingSquaresPipeline);
    computePassEncoder.dispatchWorkgroups(Math.ceil(imageBufferSize[0] / 16), Math.ceil(imageBufferSize[1] / 16), 1); // ワークグループ数をディスパッチ
    computePassEncoder.end();
    device.queue.submit([computeCommandEncoder.finish()]);

    // GPUの結果
    const result = await GPU.getU32BufferData(resultbuffer, resultbuffer.size);

    // 辺データ
    let collectedLines = [];

    const threadIsComplete = []; // スレッドの処理が終わったか
    const threadProcessingNum = 50000; // 一つのスレッドが処理する数
    // スレッドの起動
    for (let i = 0; i < result.length; i += threadProcessingNum) {
        threadIsComplete.push(false);
        worker.postMessage({result: result.slice(i, i + threadProcessingNum), imageBufferSize: imageBufferSize, threadedIndex: i / threadProcessingNum, startIndex: i, endIndex: i + threadProcessingNum, pixelDensity: pixelDensity});
    }

    // スレッドの返信を元にデータを組み立てる
    worker.onmessage = function(event) {
        const e = event.data;
        collectedLines = collectedLines.concat(e.collectedLines); // 65ミリ秒
        threadIsComplete[e.threadedIndex] = true;
    };

    async function checkThreadIsComplete() {
        return new Promise((resolve) => {
            function loop() {
                if (threadIsComplete.some(x => x === false)) {
                    requestAnimationFrame(loop); // 再帰的に呼び出す
                } else {
                    resolve(); // すべての要素がtrueになったらPromiseを解決
                }
            }
            loop(); // 初回呼び出し
        });
    }

    await checkThreadIsComplete(); // スレッドが全て終わるまで待つ

    collectedLines = connectLines(collectedLines); // 重複頂点を接続

    collectedLines = collectedLines.map((x) => {
        return simplifyPolygon(x, simplEpsilon, vec2.max(imageBufferSize) / 2);
    });

    // console.log("制約線分",collectedLines)

    let maxLenghtLine = [];
    for (const line of collectedLines) {
        if (maxLenghtLine.length < line.length) {
            maxLenghtLine = line;
        }
    }

    const resultData = {vertices: [], uv: [], edges: []};
    let verticesNumOffset = 0;
    // for (const data of collectedLines) {
    for (const data of [maxLenghtLine]) {
        if (2 < data.length) {
            // 膨らませる
            // const vertices = fixSelfIntersectingPolygon(data.map((vert, i) => {
            //     const left = data[modClamp(i - 1, data.length)];
            //     const right = data[(i + 1) % data.length];
            //     let vec = vec2.normalizeR(vec2.addR(vec2.subAndnormalizeR(right, vert),vec2.subAndnormalizeR(vert, left)));
            //     vec = [-vec[1], vec[0]];
            //     return vec2.addR(vert,vec2.scaleR(vec, padding));
            // }));
            const vertices = data.map((vert, i) => {
                const left = data[modClamp(i - 1, data.length)];
                const right = data[(i + 1) % data.length];
                let vec = vec2.normalizeR(vec2.addR(vec2.subAndnormalizeR(right, vert),vec2.subAndnormalizeR(vert, left)));
                vec = [-vec[1], vec[0]];
                return vec2.addR(vert,vec2.scaleR(vec, padding));
            });
            const cnEdges = [...Array(vertices.length)].map((_, i) => [i + verticesNumOffset,(i + 1) % vertices.length + verticesNumOffset]);
            const fixVertices = createUVAndFixVertices(vertices);
            resultData.vertices.push(...fixVertices.vertices);
            resultData.uv.push(...fixVertices.uv);
            resultData.edges.push(...cnEdges);
            verticesNumOffset += vertices.length;
        }
    }
    return resultData;
}

export function createMeshFromTexture(vertices, cnEdges) {
    const delaunayResult = cdt(vertices, cnEdges);
    return delaunayResult.meshes;
}