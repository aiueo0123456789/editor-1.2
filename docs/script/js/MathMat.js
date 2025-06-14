class MathMat3x3 {
    constructor() {
    }

    mat4x3ValuesToMat3x3(m) {
        return [
            m[0],m[1],m[2],
            m[4],m[5],m[6],
            m[8],m[9],m[10],
        ];
    }

    invertMatrix3x3AndRemoveTranslation(m) {
        const a = m[0], b = m[1], c = m[2];
        const d = m[3], e = m[4], f = m[5];
        const g = m[6], h = m[7], i = m[8];
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
            (e * i - f * h) * invDet,   // [0][0]
            -(b * i - c * h) * invDet,  // [0][1] 符号修正
            (b * f - c * e) * invDet,   // [0][2] 
            -(d * i - f * g) * invDet,  // [1][0] 符号修正
            (a * i - c * g) * invDet,   // [1][1]
            -(a * f - c * d) * invDet,  // [1][2] 符号修正
            0,
            0,
            1
        ];
    }
    invertMatrix3x3(m) {
        const a = m[0], b = m[1], c = m[2];
        const d = m[3], e = m[4], f = m[5];
        const g = m[6], h = m[7], i = m[8];
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
            (e * i - f * h) * invDet,   // [0][0]
            -(b * i - c * h) * invDet,  // [0][1] 符号修正
            (b * f - c * e) * invDet,   // [0][2] 
            -(d * i - f * g) * invDet,  // [1][0] 符号修正
            (a * i - c * g) * invDet,   // [1][1]
            -(a * f - c * d) * invDet,  // [1][2] 符号修正
            (d * h - e * g) * invDet,   // [2][0] 完全に修正
            -(a * h - b * g) * invDet,  // [2][1] 完全に修正
            (a * e - b * d) * invDet    // [2][2] 完全に修正
        ];
    }

    getLocalVec2(worldMatrix,vec2d) {
        return this.multiplyMatrix3x3WithVec2(this.invertMatrix3x3AndRemoveTranslation(worldMatrix),vec2d);
    }

    // 並行移動を削除
    removeTranslation(m) {
        return [
            m[0], m[1], m[2],
            m[3], m[4], m[5],
            0  ,  0  , m[8],
        ];
    }

    multiplyMatrix3x3WithVec2(m, v) {
        const x = v[0], y = v[1];

        // WGSLでは列優先なので、m = [
        //  m0 m3 m6
        //  m1 m4 m7
        //  m2 m5 m8
        // ] の順になっていると考える
        return [
          m[0] * x + m[3] * y + m[6],  // result.x
          m[1] * x + m[4] * y + m[7]   // result.y
        ];
    }
}

export const mathMat3x3 = new MathMat3x3();