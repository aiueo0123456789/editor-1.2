class Vec2 {
    constructor() {
    }

    create() {
        return new Float32Array(2);
    }

    random(range) {
        return this.scaleR(this.subR(this.scaleR([Math.random(),Math.random()],2),[1,1]), range);
    }

    set(t,a) {
        t[0] = a[0];
        t[1] = a[1];
    }

    add(t,a,b) {
        t[0] = a[0] + b[0];
        t[1] = a[1] + b[1];
    }

    addR(a,b) {
        return [a[0] + b[0], a[1] + b[1]];
    }

    sub(t,a,b) {
        t[0] = a[0] - b[0];
        t[1] = a[1] - b[1];
    }

    subR(a,b) {
        return [a[0] - b[0], a[1] - b[1]];
    }

    scale(t,a,b) {
        t[0] = a[0] * b;
        t[1] = a[1] * b;
    }

    scaleR(a,b) {
        return [a[0] * b, a[1] * b];
    }

    reverseScale(t,a,b) {
        t[0] = a[0] / b;
        t[1] = a[1] / b;
    }

    reverseScaleR(a,b) {
        return [a[0] / b, a[1] / b];
    }

    mul(t,a,b) {
        t[0] = a[0] * b[0];
        t[1] = a[1] * b[1];
    }

    mulR(a,b) {
        return [a[0] * b[0], a[1] * b[1]];
    }

    div(t,a,b) {
        t[0] = a[0] / b[0];
        t[1] = a[1] / b[1];
    }

    divR(a,b) {
        return [a[0] / b[0], a[1] / b[1]];
    }

    angleAFromB(a, b) {
        const delta = [b[0] - a[0], b[1] - a[1]]

        return Math.atan2(delta[1], delta[0]) - 1.5708;
    }

    normalizeR(a) {
        const len = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
        return [a[0] / len, a[1] / len];
    }

    subAndnormalizeR(a,b) {
        const sub = [a[0] - b[0], a[1] - b[1]];
        const len = Math.sqrt(sub[0] * sub[0] + sub[1] * sub[1]);
        return [sub[0] / len, sub[1] / len];
    }

    crossR(vec1, vec2) {
        return vec1[0] * vec2[1] - vec2[0] * vec1[1];
    }

    dotR(vec1, vec2) {
        return vec1[0] * vec2[0] + vec1[1] * vec2[1];
    }

    cross3R(a, b, c) {
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    }

    lengthR(vec) {
        return Math.sqrt(vec[0] ** 2 + vec[1] ** 2);
    }

    distanceR(a, b) {
        const sub = [a[0] - b[0], a[1] - b[1]];
        return Math.sqrt(sub[0] ** 2 + sub[1] ** 2);
    }

    same(a,b) {
        return a[0] == b[0] && a[1] == b[1];
    }

    max(a) {
        return Math.max(a[0], a[1]);
    }

    createBBox(points) {
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
    getAngularVelocity(A, B, C) {
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

    rotate2D(point, angle) {
        let sinTheta = Math.sin(angle);
        let cosTheta = Math.cos(angle);
        let xPrime = point[0] * cosTheta - point[1] * sinTheta;
        let yPrime = point[0] * sinTheta + point[1] * cosTheta;
        return [xPrime,yPrime];
    }

    averageR(pointArray) {
        const result = vec2.create();
        for (const point of pointArray) {
            vec2.add(result, result, point);
        }
        vec2.reverseScale(result, result, pointArray.length);
        return result;
    }

    decimalPartR(vec) {
        return [vec[0] - Math.floor(vec[0]), vec[1] - Math.floor(vec[1])];
    }

    modR(a,b) {
        return [a[0] % b[0], a[1] % b[1]];
    }

    flipY(vec, height) {
        vec[1] = height - vec[1];
        return vec;
    }

    copy(vec) {
        return [...vec];
    }
}

export const vec2 = new Vec2();