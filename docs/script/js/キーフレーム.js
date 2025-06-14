import { app } from "./app.js";
import { managerForDOMs } from "./UI/制御.js";
import { vec2 } from "./ベクトル計算.js";

function bezierInterpolation(keyA, keyB, currentFrame) {
    // フレーム範囲外の場合は直接値を返す
    if (currentFrame <= keyA.frame) return keyA.value;
    if (currentFrame >= keyB.frame) return keyB.value;
    // ベジェ曲線の制御点を設定
    const p0 = keyA.point;
    const p1 = keyA.wRightHandle;
    const p2 = keyB.wLeftHandle;
    const p3 = keyB.point;
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

class Keyframe {
    constructor(belongBlock, frame, value) {
        this.type = "キーフレーム"
        this.belongBlock = belongBlock;
        this.selected = false;
        this.pointSelected = false;
        this.leftHandleSelected = false;
        this.rightHandleSelected = false;
        this.frame = frame;
        this.value = value;
        this.leftHandle = [-3,0];
        this.rightHandle = [3,0];
        this.point = [frame, value];
        this.wLeftHandle = vec2.addR(this.point, this.leftHandle);
        this.wRightHandle = vec2.addR(this.point, this.rightHandle);
    }

    setSaveData(data) {
        this.setFrameAndValue(data.frame, data.value);
    }

    setFrame(frame) {
        this.frame = frame;
        this.point[0] = frame;
        this.wLeftHandle = vec2.addR(this.point, this.leftHandle);
        this.wRightHandle = vec2.addR(this.point, this.rightHandle);
    }

    setValue(value) {
        this.value = value;
        this.point[1] = value;
        this.wLeftHandle = vec2.addR(this.point, this.leftHandle);
        this.wRightHandle = vec2.addR(this.point, this.rightHandle);
    }

    setFrameAndValue(frame,value) {
        this.frame = frame;
        this.value = value;
        this.point[0] = frame;
        this.point[1] = value;
        this.wLeftHandle = vec2.addR(this.point, this.leftHandle);
        this.wRightHandle = vec2.addR(this.point, this.rightHandle);
    }

    updateWorldToLocal() {
        this.frame = this.point[0];
        this.value = this.point[1];
        this.leftHandle = vec2.subR(this.wLeftHandle, this.point);
        this.rightHandle = vec2.subR(this.wRightHandle, this.point);
    }
}

export class KeyframeBlock {
    constructor(object, targetValue) {
        this.type = "キーフレームブロック"
        this.belongObject = object;
        this.targetValue = targetValue;
        this.keys = [];
        app.scene.keyframeBlocks.push(this);
    }

    insert(frame, value) {
        let insertIndex = this.keys.length;
        for (let i = 0; i < this.keys.length; i ++) {
            if (frame == this.keys[i].frame) {
                this.keys[i].value = value;
                return ;
            } else if (frame < this.keys[i].frame) {
                insertIndex = i;
                break ;
            }
        }
        this.keys.splice(insertIndex,0, new Keyframe(this, frame, value));
        managerForDOMs.update(this);
    }

    delete(key) {
        this.keys.splice(this.keys.indexOf(key),1);
        managerForDOMs.update(this);
    }

    updateKeyframe(key,newData) {
        key.value = newData;
    }

    setKeyframe(data) {
        for (const key of data) {
            const keyframe =  new Keyframe(this);
            keyframe.setSaveData(key);
            this.keys.push(keyframe);
        }
        managerForDOMs.update("タイムライン-canvas");
    }

    getKeyFromFrame(frame, threshold = 0.5) {
        for (const key of this.keys) {
            if (Math.abs(key.frame - frame) < threshold) return key;
        }
        return null;
    }

    hasKeyFromFrame(frame, threshold = 0.5) {
        for (const key of this.keys) {
            if (Math.abs(key.frame - frame) < threshold) return true;
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
            if (frame < key.frame) {
                break ;
            }
        }
        this.belongObject[this.targetValue] = bezierInterpolation(leftKey, rightKey, frame);
        managerForDOMs.update(this.belongObject, this.targetValue);
    }

    getSaveData() {
        return {
            type: "キーブロック",
            targetValue: this.targetValue,
            keys: this.keys,
        };
    }
}