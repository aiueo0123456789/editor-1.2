import { GPU } from "./webGPU.js";

class ArrayMath {
    constructor() {
    }

    add() {
        for (let i = 0; i < t.length; i ++) {
            t[i] = a[i] + b[i]
        }
    }

    sub(t,a,b) {
        for (let i = 0; i < t.length; i ++) {
            t[i] = a[i] - b[i]
        }
    }

    shuffleArray(array) {
        const result = [...array]; // 元の配列を破壊しないようにコピー
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1)); // ランダムなインデックスを選ぶ
          [result[i], result[j]] = [result[j], result[i]]; // 要素をスワップ
        }
        return result;
    }
}

class Mat3x3 {
    constructor() {
    }

    create() {
        return new Float32Array(9);
    }

    setFromMat4x3(t,mat4x3) {
        t[0] = mat4x3[0];
        t[1] = mat4x3[1];
        t[2] = mat4x3[2];
        t[3] = mat4x3[4];
        t[4] = mat4x3[5];
        t[5] = mat4x3[6];
        t[6] = mat4x3[8];
        t[7] = mat4x3[9];
        t[8] = mat4x3[10];
    }

    set(t, pos, scale, rot) {
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);

        t[0] = scale[0] * cosR;
        t[1] = scale[0] * sinR;
        t[2] = 0;
        t[3] = scale[1] * sinR;
        t[4] = scale[1] * cosR;
        t[5] = 0;
        t[6] = pos[0];
        t[7] = pos[1];
        t[8] = 1;
    }

    setMat3x3ToMat4x3Buffer(buffer, mat3x3) {
        GPU.writeBuffer(buffer, [mat3x3[0],mat3x3[1],mat3x3[2],0,mat3x3[3],mat3x3[4],mat3x3[5],0,mat3x3[6],0,mat3x3[7],mat3x3[8],0]);
    }

    invert(mat) {
        // 3x3行列の逆行列を求める
        const a = mat[0], b = mat[1], c = mat[2];
        const d = mat[3], e = mat[4], f = mat[5];
        const g = mat[6], h = mat[7], i = mat[8];

        const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

        if (Math.abs(det) < 1e-6) {
            throw new Error("Singular matrix, cannot invert");
        }

        const invDet = 1.0 / det;

        return [
            (e * i - f * h) * invDet,
            (c * h - b * i) * invDet,
            (b * f - c * e) * invDet,
            (f * g - d * i) * invDet,
            (a * i - c * g) * invDet,
            (c * d - a * f) * invDet,
            (d * h - e * g) * invDet,
            (b * g - a * h) * invDet,
            (a * e - b * d) * invDet
        ];
    }

    multiply(a, b) {
        // 3x3行列の掛け算
        return [
            a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
            a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
            a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    
            a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
            a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
            a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    
            a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
            a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
            a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
        ];
    }

    local(globalA, globalB) {
        // A のローカル座標系での B の行列を求める
        const invA = this.invert(globalA);
        return this.multiply(invA, globalB);
    }

    setPos(t,pos) {
        t[6] = pos[0];
        t[7] = pos[1];
        t[8] = 1;
    }
}

export const arrayMath = new ArrayMath();

export const mat3x3 = new Mat3x3();