import { managerForDOMs } from "./ui/util.js";

export class MathVec2 {
    constructor() {
    }

    static create() {
        return new Float32Array(2);
    }

    static mixR(a,b,raito) {
        return this.addR(this.scaleR(a,1-raito), this.scaleR(b,raito));
    }

    static random(range) {
        return this.scaleR(this.subR(this.scaleR([Math.random(),Math.random()],2),[1,1]), range);
    }

    static set(t,a) {
        t[0] = a[0];
        t[1] = a[1];
    }

    static add(t,a,b) {
        t[0] = a[0] + b[0];
        t[1] = a[1] + b[1];
    }

    static addR(a,b) {
        return [a[0] + b[0], a[1] + b[1]];
    }

    static sub(t,a,b) {
        t[0] = a[0] - b[0];
        t[1] = a[1] - b[1];
    }

    static subR(a,b) {
        return [a[0] - b[0], a[1] - b[1]];
    }

    static scale(t,a,b) {
        t[0] = a[0] * b;
        t[1] = a[1] * b;
    }

    static scaleR(a,b) {
        return [a[0] * b, a[1] * b];
    }

    static reverseScale(t,a,b) {
        t[0] = a[0] / b;
        t[1] = a[1] / b;
    }

    static reverseScaleR(a,b) {
        return [a[0] / b, a[1] / b];
    }

    static mul(t,a,b) {
        t[0] = a[0] * b[0];
        t[1] = a[1] * b[1];
    }

    static mulR(a,b) {
        return [a[0] * b[0], a[1] * b[1]];
    }

    static div(t,a,b) {
        t[0] = a[0] / b[0];
        t[1] = a[1] / b[1];
    }

    static divR(a,b) {
        return [a[0] / b[0], a[1] / b[1]];
    }

    static angleAFromB(a, b) {
        const delta = [b[0] - a[0], b[1] - a[1]]

        return Math.atan2(delta[1], delta[0]) - 1.5708;
    }

    static normalizeR(a) {
        const len = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
        return [a[0] / len, a[1] / len];
    }

    static subAndnormalizeR(a,b) {
        const sub = [a[0] - b[0], a[1] - b[1]];
        const len = Math.sqrt(sub[0] * sub[0] + sub[1] * sub[1]);
        return [sub[0] / len, sub[1] / len];
    }

    static crossR(vec1, vec2) {
        return vec1[0] * vec2[1] - vec2[0] * vec1[1];
    }

    static dotR(vec1, vec2) {
        return vec1[0] * vec2[0] + vec1[1] * vec2[1];
    }

    static cross3R(a, b, c) {
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    }

    static lengthR(vec) {
        return Math.sqrt(vec[0] ** 2 + vec[1] ** 2);
    }

    static distanceR(a, b) {
        const sub = [a[0] - b[0], a[1] - b[1]];
        return Math.sqrt(sub[0] ** 2 + sub[1] ** 2);
    }

    static same(a,b) {
        return a[0] == b[0] && a[1] == b[1];
    }

    static max(a) {
        return Math.max(a[0], a[1]);
    }

    static createBBox(points) {
        if (!points.length) return {max: [NaN, NaN], min: [NaN, NaN]};
        let maxX = points[0][0];
        let maxY = points[0][1];
        let minX = points[0][0];
        let minY = points[0][1];
        for (let i = 1; i < points.length; i ++) {
            maxX = Math.max(points[i][0], maxX);
            maxY = Math.max(points[i][1], maxY);
            minX = Math.min(points[i][0], minX);
            minY = Math.min(points[i][1], minY);
        }
        return {max: [maxX,maxY], min: [minX,minY]};
    }

    // 地点Aから見た地点Bの角速度を求める関数
    // A: [x, y], B: [x, y], C: [vx, vy] (移動量)
    static getAngularVelocity(A, B, C) {
        // ベクトルABを計算
        const AB = this.subR(B, A);
        // ABベクトルの長さを取得
        const distance = this.lengthR(AB);
        if (distance === 0) { // 地点ABが同じ
            return 0.0;
        }
        // AB方向の単位ベクトル
        const AB_normalized = this.normalizeR(AB);
        // Cの垂直成分（角速度成分）を求めるための外積の大きさ
        const perpendicularVelocityMagnitude = this.crossR(AB_normalized, C);
        // 角速度の大きさを計算（|v_perpendicular| / |AB|）
        const angularVelocityMagnitude = perpendicularVelocityMagnitude / distance;
        return angularVelocityMagnitude;
    }


    static getAngle(p1, p2) {
        return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    }

    static rotate2D(point, angle) {
        let sinTheta = Math.sin(angle);
        let cosTheta = Math.cos(angle);
        let xPrime = point[0] * cosTheta - point[1] * sinTheta;
        let yPrime = point[0] * sinTheta + point[1] * cosTheta;
        return [xPrime,yPrime];
    }

    static averageR(pointArray) {
        const result = MathVec2.create();
        for (const point of pointArray) {
            MathVec2.add(result, result, point);
        }
        MathVec2.reverseScale(result, result, pointArray.length);
        return result;
    }

    static decimalPartR(vec) {
        return [vec[0] - Math.floor(vec[0]), vec[1] - Math.floor(vec[1])];
    }

    static modR(a,b) {
        return [a[0] % b[0], a[1] % b[1]];
    }

    static flipY(vec, height) {
        vec[1] = height - vec[1];
        return vec;
    }

    static copy(vec) {
        return [...vec];
    }
}