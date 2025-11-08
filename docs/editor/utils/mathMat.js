export class MathMat3x3 {
    constructor() {
    }

    static createMatrix() {
        return [
            [1,0,0],
            [0,1,0],
            [0,0,1],
        ];
    }

    static createTransformMatrix(scale, angle, translation) {
        let rx = angle;
        let ry = angle + 1.5708;
        // スケールと回転を組み合わせた行列
        var matrix = [
            [scale[0] * Math.cos(rx), scale[0] * Math.sin(rx), 0.0],
            [scale[1] * Math.cos(ry), scale[1] * Math.sin(ry), 0.0],
            [translation[0], translation[1], 1.0],
        ];
        return matrix;
    }

    static multiplyMat3x3(a, b) {
        const result = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ];
        for (let i = 0; i < 3; i++) {        // 行
            for (let j = 0; j < 3; j++) {      // 列
                result[i][j] =
                a[i][0] * b[0][j] +
                a[i][1] * b[1][j] +
                a[i][2] * b[2][j];
            }
        }
        return result;
    }

    static mat4x3ValuesToMat3x3(m) {
        return [
            m[0],m[1],m[2],
            m[4],m[5],m[6],
            m[8],m[9],m[10],
        ];
    }

    static invertMatrix3x3AndRemoveTranslation(m) {
        const a = m[0][0], b = m[0][1], c = m[0][2];
        const d = m[1][0], e = m[1][1], f = m[1][2];
        const g = m[2][0], h = m[2][1], i = m[2][2];
        // 行列式の計算
        const det = a * (e * i - f * h) -
                    b * (d * i - f * g) +
                    c * (d * h - e * g);
        if (det === 0.0) {
            // 逆行列が存在しない場合、nullまたはエラーを返すのが適切
            return null; // またはエラーを投げる
        }
        const invDet = 1.0 / det;
        return [
            [(e * i - f * h) * invDet,-(b * i - c * h) * invDet,(b * f - c * e) * invDet],
            [-(d * i - f * g) * invDet,(a * i - c * g) * invDet,-(a * f - c * d) * invDet],
            [0,0,1],
        ];
    }
    static invertMatrix3x3(m) {
        const a = m[0][0], b = m[0][1], c = m[0][2];
        const d = m[1][0], e = m[1][1], f = m[1][2];
        const g = m[2][0], h = m[2][1], i = m[2][2];
        // 行列式の計算
        const det = a * (e * i - f * h) -
                    b * (d * i - f * g) +
                    c * (d * h - e * g);
        if (det === 0.0) {
            // 逆行列が存在しない場合、nullまたはエラーを返すのが適切
            return null; // またはエラーを投げる
        }
        const invDet = 1.0 / det;
        return [
            [(e * i - f * h) * invDet,-(b * i - c * h) * invDet,(b * f - c * e) * invDet],
            [-(d * i - f * g) * invDet,(a * i - c * g) * invDet,-(a * f - c * d) * invDet],
            [(d * h - e * g) * invDet,-(a * h - b * g) * invDet,(a * e - b * d) * invDet]
        ];
    }

    static getLocalVec2(worldMatrix,vec2d) {
        return this.multiplyMatrix3x3WithVec2(this.invertMatrix3x3AndRemoveTranslation(worldMatrix),vec2d);
    }

    // 並行移動を削除
    static removeTranslation(m) {
        return [
            m[0], m[1], m[2],
            m[3], m[4], m[5],
            0  ,  0  , m[8],
        ];
    }

    static multiplyMatrix3x3WithVec2(m, v) {
        const x = v[0], y = v[1];

        // WGSLでは列優先なので、m = [
        //  m0 m3 m6
        //  m1 m4 m7
        //  m2 m5 m8
        // ] の順になっていると考える
        return [
            m[0][0] * x + m[1][0] * y + m[2][0],  // result.x
            m[0][1] * x + m[1][1] * y + m[2][1]   // result.y
        ];
    }

    static mat3x3ToArray(array) {
        return [
            [array[0], array[1], array[2]],
            [array[3], array[4], array[5]],
            [array[6], array[7], array[8]],
        ];
    }
}