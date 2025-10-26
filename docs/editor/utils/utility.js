import { managerForDOMs } from "./ui/util.js";
import { mathVec2 } from "./mathVec.js";

export function clearPlainObject(plainObject) {
    for (const key in plainObject) {
        delete plainObject[key];
    }
}

export function isPlainObject(obj) {
    return obj instanceof Object && Object.getPrototypeOf(obj) === Object.prototype;
}

export function isNumber(value) {
    return value !== null && value !== "" && isFinite(value);
}

export function IsString(value) {
    return typeof value === "string" || value instanceof String;
}

export function indexOfSplice(array, deleteValue) {
    if (!array.includes(deleteValue)) return;
    array.splice(array.indexOf(deleteValue), 1);
    managerForDOMs.update({o: array});
}

export function hitTestPointTriangle(a, b, c, p) {
    let ab = mathVec2.subR(b, a);
    let bp = mathVec2.subR(p, b);

    let bc = mathVec2.subR(c, b);
    let cp = mathVec2.subR(p, c);

    let ca = mathVec2.subR(a, c);
    let ap = mathVec2.subR(p, a);

    let c1 = mathVec2.crossR(ab, bp);
    let c2 = mathVec2.crossR(bc, cp);
    let c3 = mathVec2.crossR(ca, ap);
    return (c1 > 0.0 && c2 > 0.0 && c3 > 0.0) || (c1 < 0.0 && c2 < 0.0 && c3 < 0.0);
}

export function createArrayN(N, data = undefined) {
    if (data === undefined) {
        return [...Array(N)].map((_, i) => i);
    } else {
        const array = [...Array(N)];
        for (let i = 0; i < array.length; i ++) {
            array[i] = data[i % data.length];
        }
        return array;
    }
}

export function createArrayNAndFill(N, data) {
    return [...Array(N)].map(() => data);
}

export function createStructArrayN(N, data) {
    const array = [...Array(N * data.length)];
    for (let i = 0; i < array.length; i += data.length) {
        for (let j = 0; j < data.length; j ++) {
            array[i + j] = data[j];
        }
    }
    return array;
}
// -xのmod(%)を+に収める
export function modClamp(value, max) {
    return (value % max + max) % max;
}

export function getFuntion(resource) {
    if (typeof resource === 'function') {
        return resource;
    } else if (resource.object && resource.targetFn) {
        return resource.object[resource.targetFn];
    } else {
        console.warn("関数が見つかりません", resource);
    }
}

// カラーコードとaからrgba
export function hexToRgba(hex, alpha = 1) {
    // #を取り除く
    hex = hex.replace(/^#/, '');
    // R, G, Bを取り出して整数に変換
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    // RGBA形式で返す0
    return [ r, g, b, alpha ];
}

// rgbからカラーコード
export function rgbToHex(r, g, b) {
    const clamp = (val) => Math.max(0, Math.min(255, val)); // 範囲制限
    const toHex = (val) => clamp(val).toString(16).padStart(2, "0");

    return "#" + toHex(r * 255) + toHex(g * 255) + toHex(b * 255);
}

// 配列の最後の要素
export function getArrayLastValue(array) {
    return array[array.length - 1];
}

// 全てtrue
export function allTrue(array) {
    for (const element of array) {
        if (!element) return false;
    }
    return true;
}

// 全てfalseか
export function allFalse(array) {
    for (const element of array) {
        if (element) return false;
    }
    return true;
}

// ファイルを読み込む（text または json）
export async function loadFile(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) {
            console.trace("ファイルが見つかりません:", path);
            return null;
        }

        // 拡張子で判定
        if (path.toLowerCase().endsWith(".json")) {
            return await res.json();
        } else {
            return await res.text();
        }
    } catch (e) {
        console.trace("エラー", e);
        return null;
    }
}

// jsonの読み込み
export const readJsonFile = async (filePath) => {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Error reading JSON file:", error);
        return null;
    }
};

// 大文字か
export function isUpperCase(char) {
    return char === char.toUpperCase() && char !== char.toLowerCase();
}

// 小文字か
export function isLowerCase(char) {
    return char === char.toLowerCase() && char !== char.toUpperCase();
}

// 関数か
export function isFunction(t) {
    return typeof t === 'function';
}

export function boolTo0or1(bool) {
    return bool ? 1 : 0;
}

export function calculateLocalMousePosition(/** @type {HTMLElement} */dom, position, pixelDensity = 1) {
    const rect = dom.getBoundingClientRect();
    return mathVec2.scaleR(mathVec2.subR(position, [rect.left, rect.top]), pixelDensity);
}

export function createArrayFromHashKeys(hash) {
    const result = [];
    for (const key in hash) {
        result.push(key);
    }
    return result;
}

export function changeParameter(object, parameter, newValue) {
    object[parameter] = newValue;
    managerForDOMs.update({o: object, i: parameter});
}

export function arrayToPush(array, value) {
    array.push(value);
    managerForDOMs.update({o: array});
}

export function arrayToArrayCopy(target, source) {
    target.length = 0;
    for (const value of source) {
        target.push(value);
    }
    managerForDOMs.update({o: target});
}

export function arrayToSet(array, data, index, structSize = 0) {
    let offset = index * structSize;
    for (let i = 0; i < data.length; i ++) {
        array[offset + i] = data[i];
    }
    managerForDOMs.update({o: array});
}

export function looper(object, loopTarget, fn, firstParent) {
    const a = (children, parent, depth = 0) => {
        for (const child of children) {
            const nextParent = fn(child, parent, depth);
            if (child[loopTarget]) {
                a(child[loopTarget], nextParent, depth + 1);
            }
        }
    }
    if (Array.isArray(object)) {
        a(object, firstParent);
    } else {
        console.trace("このオブジェクトはlooperが使用できません",object);
    }
}

export function range(start, end) {
    const result = new Array(end - start);
    for (let i = 0; i < result.length; i ++) {
        result[i] = start + i;
    }
    return result;
}

export function timeSleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function errorCut(num, rate = 1000) {
    return Math.round(num * rate) / rate;
}

export function isPointInEllipse(p, c, radius) {
    const dx = p[0] - c[0];
    const dy = p[1] - c[1];
    return (dx * dx) / radius[0] ** 2 + (dy * dy) / radius[1] ** 2 <= 1;
}

export function removeDuplicates(array) {
    const result = [];
    for (const value of array) {
        if (!result.includes(value)) {
            result.push(value);
        }
    }
    return result;
}

export function waitUntilFrame(conditionFn) {
    return new Promise(resolve => {
        function check() {
            if (conditionFn()) {
                resolve();
            } else {
                requestAnimationFrame(check);
            }
        }
        check();
    });
}

// 値渡し参照渡しか(参照: true, 値: false)
export function isPassByReference(value) {
    const type = typeof value;

    // プリミティブ型（値渡し）
    const isPrimitive = (
        value === null || // typeof null は "object" になるので例外処理
        type === "undefined" ||
        type === "boolean" ||
        type === "number" ||
        type === "string" ||
        type === "symbol" ||
        type === "bigint"
    );

    return !isPrimitive; // プリミティブでなければ参照渡し
}

export function objectInit(object) {
    for (const key in object) {
        delete object[key];
    }
}

export function roundUp(number, min) {
    return number > min ? number : min;
}