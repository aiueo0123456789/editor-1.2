import { vec2 } from "../../utils/mathVec.js";
import { changeParameter } from "../../utils/utility.js";
import { createID, managerForDOMs } from "../../utils/ui/util.js";


function bezierInterpolation(keyA, keyB, currentFrame) {
    // フレーム範囲外の場合は直接値を返す
    if (currentFrame <= keyA.point.worldPosition[0]) return keyA.point.worldPosition[1];
    if (currentFrame >= keyB.point.worldPosition[0]) return keyB.point.worldPosition[1];
    // ベジェ曲線の制御点を設定
    const p0 = keyA.point.worldPosition;
    const p1 = keyA.rightHandle.worldPosition;
    const p2 = keyB.leftHandle.worldPosition;
    const p3 = keyB.point.worldPosition;
    // 特定のx座標（フレーム）に対応するtの値を数値的に求める
    // 二分法を使用して解を求める
    let tLow = 0;
    let tHigh = 1;
    let t = 0.5;
    const epsilon = 0.0001; // 許容誤差
    for (let i = 0; i < 20; i++) { // 最大反復回数
        // 現在のtでのベジェ曲線上のx座標を計算
        const point = cubic_bezier(t, p0, p1, p2, p3);
        const x = point[0];
        if (Math.abs(x - currentFrame) < epsilon) {
            // 十分に近い解が見つかった
            break;
        }
        if (x < currentFrame) {
            tLow = t;
        } else {
            tHigh = t;
        }
        // tの値を更新
        t = (tLow + tHigh) / 2;
    }
    // 見つかったtを使ってベジェ曲線上のy座標（値）を計算
    const result = cubic_bezier(t, p0, p1, p2, p3);
    return result[1];
}

function cubic_bezier(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    // 三次ベジェ曲線の方程式
    return [
        mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0],
        mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1]
    ];
}

class Handle {
    constructor(keyframe, basePoint, data) {
        this.keyframe = keyframe; // 基準
        /** @type {Point} */
        this.basePoint = basePoint; // 基準
        this.localPosition = data.localPosition;
        this.selected = false;
    }

    get worldPosition() {
        return vec2.addR(this.basePoint.worldPosition, this.localPosition);
    }
}

class Point {
    constructor(keyframe, data) {
        this.keyframe = keyframe; // 基準
        this.worldPosition = data.worldPosition;
        this.selected = false;
    }
}

class Keyframe {
    constructor(keyframeBlock, data) {
        this.type = "キーフレーム"
        this.keyframeBlock = keyframeBlock;
        this.selected = false;
        this.pointSelected = false;
        this.leftHandleSelected = false;
        this.rightHandleSelected = false;

        this.point = new Point(this, data.point);
        this.rightHandle = new Handle(this, this.point, data.rightHandle);
        this.leftHandle = new Handle(this, this.point, data.leftHandle);
    }

    setFrame(frame) {
        this.point.worldPosition[0] = frame;
    }

    setValue(value) {
        this.point.worldPosition[1] = value;
    }

    setFrameAndValue(frame,value) {
        this.point.worldPosition[0] = frame;
        this.point.worldPosition[1] = value;
    }

    getSaveData() {
        return {
            point: {worldPosition: this.point.worldPosition},
            leftHandle: {localPosition: this.leftHandle.localPosition},
            rightHandle: {localPosition: this.rightHandle.localPosition},
        };
    }
}

export class KeyframeBlock {
    constructor(object, targetValue, data = {keys: []}) {
        this.type = "キーフレームブロック";
        this.id = createID();
        this.targetObject = object;
        this.targetValue = targetValue;
        this.visible = true;
        this.keys = [];
    }

    insert(frame, value) {
        let insertIndex = this.keys.length;
        console.log(this.keys, frame,value)
        for (let i = 0; i < this.keys.length; i ++) {
            if (frame == this.keys[i].point[0]) { // 同じフレームにキーがある場合削除して同じ位置に追加
                this.keys.splice(i, 1, new Keyframe(this, frame, value));
                return ;
            } else if (frame < this.keys[i].point[0]) {
                insertIndex = i;
                break ;
            }
        }
        this.keys.splice(insertIndex,0, new Keyframe(this, frame, value));
        managerForDOMs.update(this);
        managerForDOMs.update(this, "keys");
        // managerForDOMs.update("タイムライン-canvas");
    }

    deleteKeyframe(key) {
        this.keys.splice(this.keys.indexOf(key),1);
        managerForDOMs.update(this);
    }

    setKeyframe(data) {
        for (const key of data) {
            const keyframe =  new Keyframe(this, key);
            this.keys.push(keyframe);
        }
        managerForDOMs.update("タイムライン-canvas");
    }

    getKeyFromFrame(frame, threshold = 0.5) {
        for (const key of this.keys) {
            if (Math.abs(key.point.worldPosition[0] - frame) < threshold) return key;
        }
        return null;
    }

    hasKeyFromFrame(frame, threshold = 0.5) {
        for (const key of this.keys) {
            if (Math.abs(key.point.worldPosition[0] - frame) < threshold) return true;
        }
        return false;
    }

    update(frame) {
        if (this.keys.length == 0) return ;
        let leftKey = this.keys[0];
        let rightKey = this.keys[0];
        for (const key of this.keys) {
            leftKey = rightKey;
            rightKey = key;
            if (frame < key.point.worldPosition[0]) {
                break ;
            }
        }
        changeParameter(this.targetObject, this.targetValue, bezierInterpolation(leftKey, rightKey, frame));
    }

    getSaveData() {
        return {
            type: "キーブロック",
            targetObjectID: this.targetObject.id,
            targetValue: this.targetValue,
            keys: this.keys.map(key => key.getSaveData()),
        };
    }
}