import { vec2 } from "../../../mathVec.js";
import { createArrayN } from "../../../utility.js";

/* https://takashiijiri.com/study/miscs/DelaunayTriangulation.htm の制約つきドロネー分割---(逐次加点法)をもとに書いたコードです */

function isIntersecting(A, B, C, D) {
    function crossProduct(P, Q, R) {
        return (Q[0] - P[0]) * (R[1] - P[1]) - (Q[1] - P[1]) * (R[0] - P[0]);
    }
    function isBetween(P, Q, R) {
        return Math.min(P[0], Q[0]) <= R[0] && R[0] <= Math.max(P[0], Q[0]) &&
               Math.min(P[1], Q[1]) <= R[1] && R[1] <= Math.max(P[1], Q[1]);
    }
    let d1 = crossProduct(A, B, C);
    let d2 = crossProduct(A, B, D);
    let d3 = crossProduct(C, D, A);
    let d4 = crossProduct(C, D, B);
    // 一般的な交差判定
    if ((d1 * d2 < 0) && (d3 * d4 < 0)) {
        return true;
    }
    // 特殊ケース（一直線上にある場合）
    if (d1 === 0 && isBetween(A, B, C)) return true;
    if (d2 === 0 && isBetween(A, B, D)) return true;
    if (d3 === 0 && isBetween(C, D, A)) return true;
    if (d4 === 0 && isBetween(C, D, B)) return true;
    return false;
}

function getTriangleCenterPoint(p1,p2,p3) {
    const c = 2 * ((p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]));

    const a = (p2[0] * p2[0] - p1[0] * p1[0] + p2[1] * p2[1] - p1[1] * p1[1]);
    const b = (p3[0] * p3[0] - p1[0] * p1[0] + p3[1] * p3[1] - p1[1] * p1[1]);
    return [
        ((p3[1] - p1[1]) * a + (p1[1] - p2[1]) * b) / c,
        ((p1[0] - p3[0]) * a + (p2[0] - p1[0]) * b) / c
    ];
}

function hitTestTriangle(traingleA, traingleB, traingleC, point) {
    let ab = vec2.subR(traingleB, traingleA);
    let bp = vec2.subR(point, traingleB);

    let bc = vec2.subR(traingleC, traingleB);
    let cp = vec2.subR(point, traingleC);

    let ca = vec2.subR(traingleA, traingleC);
    let ap = vec2.subR(point, traingleA);

    let c1 = vec2.crossR(ab, bp);
    let c2 = vec2.crossR(bc, cp);
    let c3 = vec2.crossR(ca, ap);
    return (c1 > 0.0 && c2 > 0.0 && c3 > 0.0) || (c1 < 0.0 && c2 < 0.0 && c3 < 0.0);
}

function isSquareConvex(p1,p2,p3,p4) {
    // 四角形の各点で外積を計算
    const cross1 = vec2.cross3R(p1, p2, p3);
    const cross2 = vec2.cross3R(p2, p3, p4);
    const cross3 = vec2.cross3R(p3, p4, p1);
    const cross4 = vec2.cross3R(p4, p1, p2);

    // すべての外積の符号が同じかを確認
    const allPositive = cross1 > 0 && cross2 > 0 && cross3 > 0 && cross4 > 0;
    const allNegative = cross1 < 0 && cross2 < 0 && cross3 < 0 && cross4 < 0;

    return allPositive || allNegative;
}

export function cdt(inputVertices, cnEdges, option = "頂点の並び順を保持") {
    // 頂点全てを包む三角形を作る
    const meshes = [
        [inputVertices.length,inputVertices.length + 1, inputVertices.length + 2]
    ];
    inputVertices.push([-1000000,-1000000],[0,1000000],[1000000,-1000000]);
    const edges = [];

    const findTriangleContainsPoint = (point) => {
        for (let i = 0; i < meshes.length; i ++) {
            const mesh = meshes[i];
            if (hitTestTriangle(inputVertices[mesh[0]],inputVertices[mesh[1]],inputVertices[mesh[2]], point)) {
                return i;
            }
        }
        return -1;
    }

    // 辺を受け取って辺を含む三角形を二つ返す
    const findTriangleContainsEdge = (edge) => {
        const triangleContainsEdge = (mesh) => {
            let sameCount = 0;
            for (const i of mesh) {
                for (const j of edge) {
                    if (i == j) {
                        sameCount ++;
                        if (sameCount == 2) {
                            return true;
                        }
                        break ;
                    }
                }
            }
            return false;
        }

        const resultIndex = [];
        for (let i = 0; i < meshes.length; i ++) {
            const mesh = meshes[i];
            if (triangleContainsEdge(mesh)) {
                resultIndex.push(i);
                if (resultIndex.length == 2) {
                    return resultIndex;
                }
            }
        }
        return [-1,-1];
    }

    const edgecnContainsEdge = (edge) => {
        for (const cn of cnEdges) {
            if (sameEdge(edge, cn)) {
                return true;
            }
        }
        return false;
    }

    const getPointsFromMesh = (mesh) => {
        const result = [];
        for (const index of mesh) {
            result.push(inputVertices[index]);
        }
        return result;
    }

    const roopStack = () => {
        // スタックSが空になるまで
        while (S.length != 0) {
            const AB = S.pop(); // スタックから辺ABをpop
            const [ABCi, ABDi] = findTriangleContainsEdge(AB); // 辺ABを含む三角形ABCとABDを見つける

            if (ABCi != -1) { // 辺が2つ見つからない(外周の辺)場合スキップ
                // const ABC = meshes[ABCi]; // 辺ABを含む三角形ABCとABDを見つける
                // const ABD = meshes[ABDi]; // 辺ABを含む三角形ABCとABDを見つける
                const ABC = AB.concat(meshes[ABCi].filter(value => !AB.includes(value))); // ABC
                const ABD = AB.concat(meshes[ABDi].filter(value => !AB.includes(value))); // ABD
                const [A,B,C] = ABC;
                const D = ABD[2];
                const CD = [ABC[2],ABD[2]];
                // ABCDの頂点
                const [Av,Bv,Cv] = getPointsFromMesh(ABC);
                const Dv = inputVertices[ABD[2]];

                const centerABC = getTriangleCenterPoint(Av,Bv,Cv);
                const radius = vec2.distanceR(centerABC, Av);
                if (edgecnContainsEdge(AB)) { // ABが線分制約の場合スキップ
                } else if (edgecnContainsEdge(CD) && isSquareConvex(Av,Bv,Cv,Dv)) { // CDが線分制約で四角形ABCDが凸
                    // flip
                    meshes[ABCi] = [A,C,D]; // ABCをACDに
                    meshes[ABDi] = [B,C,D]; // ABDをBCDに
                    // setMesh([A,C,D],ABCi);
                    // setMesh([B,C,D],ABDi);
                    S.push([A,D]);
                    S.push([D,B]);
                    S.push([B,C]);
                    S.push([C,A]);
                } else if (vec2.distanceR(centerABC, Dv) < radius) { // ABCの外接円にDが入る
                    // flip
                    meshes[ABCi] = [A,C,D]; // ABCをACDに
                    meshes[ABDi] = [B,C,D]; // ABDをBCDに
                    // setMesh([A,C,D],ABCi);
                    // setMesh([B,C,D],ABDi);
                    S.push([A,D]);
                    S.push([D,B]);
                    S.push([B,C]);
                    S.push([C,A]);
                } else {} // 何もしない
            }
        }
    }

    const appendVertex = (index) => {
        if (true) {
            const traingleIndex = findTriangleContainsPoint(inputVertices[index]); // Pを含む三角形のindexを取得
            const [A,B,C] = meshes.splice(traingleIndex, 1)[0]; // Pを含む三角形A,B,Cを取得して削除
            // const [A,B,C] = deleteMesh(traingleIndex); // Pを含む三角形A,B,Cを取得して削除
            // ABCをABP,BCP,CAPの3個の三角形に分割
            meshes.push([A,B,index]);
            meshes.push([B,C,index]);
            meshes.push([C,A,index]);
            // 辺AB,BC,CAをスタックに追加
            S.push([A,B]);
            S.push([B,C]);
            S.push([C,A]);
        }
        roopStack();
    }

    function sortEdge(edge) {
        return edge[0] < edge[1] ? edge : edge.reverse();
    }

    // 辺1(入力時の頂点index)と辺2が同じ辺か
    function sameEdge(edge1, edge2) {
        const sort0 = sortEdge(edge1);
        const sort1 = sortEdge(edge2);
        return sort0[0] == sort1[0] && sort0[1] == sort1[1];
    }

    // 辺にindexが含まれるか
    function edgeIncludeIndex(edge, index) {
        return edge[0] == index || edge[1] == index;
    }

    function arrayDifference(A, B) {
        const setB = new Set(B);
        return A.filter(item => !setB.has(item));
    }

    // 入力と出力のindexのズレを正すため
    // 線分制約に関わる頂点
    const cnEdgesIncludedVerticesIndex = [...new Set(cnEdges.flat())];
    // 線分線役に関わらない頂点
    const cnEdgesNotIncludedVerticesIndex = arrayDifference(createArrayN(inputVertices.length - 3), cnEdgesIncludedVerticesIndex);

    const S = []; // スタック
    // 線分制約に関わる頂点Pを図形に追加
    for (const index of cnEdgesIncludedVerticesIndex) {
        appendVertex(index);
    }
    // console.log("線分制約に関わる頂点Pを図形に追加")

    const edgesIncludes = new Map();

    // 制約線分の復帰
    const K = []; // キュー
    for (const cnEdge of cnEdges) {
        // meshesからedgesを計算
        for (const [i0,i1,i2] of meshes) {
            const appendEdge = (edge) => {
                const sortedEdge = edge[0] < edge[1] ? edge : [edge[1], edge[0]];
                // for (const edge_ of edges) {
                //     if (edge_[0] == sortedEdge[0] && edge_[1] == sortedEdge[1]) {
                //         return ;
                //     }
                // }
                const hash = `${sortedEdge[0]}_${sortedEdge[1]}`;
                if (!edgesIncludes.has(hash)) {
                    edgesIncludes.set(hash);
                    edges.push(sortedEdge);
                }
            }
            appendEdge([i0,i1]);
            appendEdge([i1,i2]);
            appendEdge([i2,i0]);
        }

        if (true) {
            const line0Start = inputVertices[cnEdge[0]];
            const line0End = inputVertices[cnEdge[1]];
            for (const edge of edges) {
                const line1Start = inputVertices[edge[0]];
                const line1End = inputVertices[edge[1]];
                if (!(edgeIncludeIndex(cnEdge, edge[0]) || edgeIncludeIndex(cnEdge, edge[1])) && isIntersecting(line0Start, line0End, line1Start, line1End)) {
                    K.unshift(edge); // 現在図形とABと交差する全てのエッジをキューKに挿入
                }
            }
        }
        let count = 1000;
        while (K.length != 0 && count >= 0) {
            const CD = K.shift();
            const [CDEi, CDFi] = findTriangleContainsEdge(CD); // 辺CDを含む三角形CDEとCDFを見つける
            if (CDEi != -1) {
                const [C,D] = CD;
                const E = meshes[CDEi].filter(value => !CD.includes(value))[0]; // E
                const F = meshes[CDFi].filter(value => !CD.includes(value))[0]; // F

                const Cv = inputVertices[C];
                const Dv = inputVertices[D];
                const Ev = inputVertices[E];
                const Fv = inputVertices[F];
                if (isSquareConvex(Ev,Cv,Fv,Dv)) {
                    // flip
                    meshes[CDEi] = [C,E,F]; // CDEをCEF
                    meshes[CDFi] = [D,E,F]; // CDFをDEF
                    // setMesh([C,E,F],CDEi);
                    // setMesh([D,E,F],CDFi);
                    S.push([E,F]);
                } else {
                    K.push(CD);
                }
            }
            count --;
        }
    }
    roopStack();
    // console.log("制約線分の復帰")
    // 線分制約に関わらない頂点Pの追加
    for (const index of cnEdgesNotIncludedVerticesIndex) {
        appendVertex(index);
    }
    // console.log("線分制約に関わらない頂点Pの追加")

    // 頂点全てを包む三角形を消す
    inputVertices.splice(-1,1);
    inputVertices.splice(-1,1);
    inputVertices.splice(-1,1);

    for (let i = meshes.length - 1; i >= 0; i --) {
        const mesh = meshes[i];
        if (inputVertices.length <= mesh[0] || inputVertices.length <= mesh[1] || inputVertices.length <= mesh[2]) {
            meshes.splice(i,1);
        }
    }

    return {vertices: inputVertices, edges: edges, meshes: meshes};
}

export function cutSilhouetteOutTriangle(meshData, polygon) {
    function isTriangleOutsidePolygon(triangle) {
        function isPointInPolygon(point, poly) {
            let x = point[0], y = point[1];
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                let xi = poly[i][0], yi = poly[i][1];
                let xj = poly[j][0], yj = poly[j][1];
                let intersect = ((yi > y) !== (yj > y)) &&
                                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        function doLinesIntersect(a, b, c, d) {
            function ccw(p1, p2, p3) {
                return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
            }
            return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
        }

        // 三角形の辺とポリゴンの辺の交差チェック
        for (let i = 0; i < 3; i++) {
            let a = triangle[i];
            let b = triangle[(i + 1) % 3];
            for (let j = 0; j < polygon.length; j++) {
                let c = polygon[j];
                let d = polygon[(j + 1) % polygon.length];
                if (doLinesIntersect(a, b, c, d)) return true;
            }
        }

        // 三角形の各頂点がポリゴンの外にある場合
        let insideCount = triangle.filter(v => isPointInPolygon(v, polygon)).length;
        if (insideCount === 0) return true; // 完全に外にある

        return false;
    }

    const vertices = meshData.vertices;
    for (let i = meshData.meshes.length - 1; i >= 0; i --) {
        const mesh = meshData.meshes[i];
        const A = vertices[mesh[0]];
        const B = vertices[mesh[1]];
        const C = vertices[mesh[2]];
        if (isTriangleOutsidePolygon([A,B,C])) {
            meshData.meshes.splice(i, 1);
        }
    }
}