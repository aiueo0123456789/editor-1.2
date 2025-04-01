import { managerForDOMs } from "./UI/制御.js";

function bezierInterpolation(keyA, keyB, currentFrame) {
    // フレーム範囲外の場合は直接値を返す
    if (currentFrame <= keyA.frame) return keyA.value;
    if (currentFrame >= keyB.frame) return keyB.value;
    // ベジェ曲線の制御点を設定
    const p0 = [keyA.frame, keyA.value];
    const p1 = [
        keyA.frame + keyA.rightHandle[0],
        keyA.value + keyA.rightHandle[1]
    ];
    const p2 = [
        keyB.frame + keyB.leftHandle[0],
        keyB.value + keyB.leftHandle[1]
    ];
    const p3 = [keyB.frame, keyB.value];
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
    constructor(frame, value) {
        this.frame = frame;
        this.value = value;
        this.leftHandle = [-3,0];
        this.rightHandle = [3,0];
    }

    setSaveData(data) {
        this.frame = data.frame;
        this.value = data.value;
    }

    setFrame(frame) {
        this.frame = frame;
    }

    setValue(value) {
        this.value = value;
    }

    setFrameAndValue(frame,value) {
        this.frame = frame;
        this.value = value;
    }
}

export class KeyframeBlock {
    constructor(object) {
        this.belongObject = object;
        this.targetValue = "weight";
        this.keys = [];
    }

    addKeyframe(frame, value) {
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
        this.keys.splice(insertIndex,0, new Keyframe(frame, value));
        managerForDOMs.update(this);
    }

    deleteKeyframe(key) {
        this.keys.splice(this.keys.indexOf(key),1);
        managerForDOMs.update(this);
    }

    updateKeyframe(key,newData) {
        key.value = newData;
    }

    setKeyframe(data) {
        for (const key of data) {
            // this.addKeyframe(key.frame,key.value)
            // this.keys.push(key);
            const keyframe =  new Keyframe();
            keyframe.setSaveData(key);
            this.keys.push(keyframe);
        }
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
        managerForDOMs.update(this.belongObject, "ウェイト");
    }

    getSaveData() {
        return {
            type: "キーブロック",
            targetValue: this.targetValue,
            keys: this.keys,
        };
    }
}

export class KeyframeBlockForGPUBuffer {
    constructor(object) {
        this.belongObject = object;
        this.targetValue = "weight";
        this.targetIndex = 0;
        this.keys = [];
    }

    addKeyframe(frame, value) {
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
        this.keys.splice(insertIndex,0, new Keyframe(frame, value));
        managerForDOMs.update(this);
    }

    deleteKeyframe(key) {
        this.keys.splice(this.keys.indexOf(key),1);
        managerForDOMs.update(this);
    }

    updateKeyframe(key,newData) {
        key.value = newData;
    }

    setKeyframe(data) {
        for (const key of data) {
            this.keys.push(key);
        }
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
    }

    getSaveData() {
        return {
            type: "キーブロック",
            targetValue: this.targetValue,
            keys: this.keys,
        };
    }
}