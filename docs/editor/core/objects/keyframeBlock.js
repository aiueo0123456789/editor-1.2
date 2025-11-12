import { changeParameter } from "../../utils/utility.js";
import { createID, managerForDOMs } from "../../utils/ui/util.js";
import { app } from "../../../main.js";


function bezierInterpolation(keyA, keyB, currentFrame) {
    // フレーム範囲外の場合は直接値を返す
    if (currentFrame <= keyA.point[0]) return keyA.point[1];
    if (currentFrame >= keyB.point[0]) return keyB.point[1];
    // ベジェ曲線の制御点を設定
    const p0 = keyA.point;
    const p1 = keyA.rightHandle;
    const p2 = keyB.leftHandle;
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

export class Keyframe {
    constructor(data) {
        this.type = "キーフレーム"
        this.selectedPoint = false;
        this.selectedRightHandle = false;
        this.selectedLeftHandle = false;
        this.point = [...data.point];
        this.rightHandle = [...data.rightHandle];
        this.leftHandle = [...data.leftHandle];
    }

    get keyframeBlock() {
        return app.scene.objects.keyframeBlocks.filter(keyframeBlock => keyframeBlock.keys.includes(this))[0];
    }

    getSaveData() {
        return {
            type: "キーフレーム",
            point: this.point,
            leftHandle: this.leftHandle,
            rightHandle: this.rightHandle,
        };
    }
}

export class KeyframeBlock {
    static createKeyframe(frame, value) {
        return new Keyframe(
            {
                point: [frame, value],
                leftHandle: [frame + -1, value + 0],
                rightHandle: [frame + 1, value + 0],
            }
        );
    }
    constructor(data) {
        this.type = "キーフレームブロック";
        this.id = data.id ? data.id : createID();
        this.visible = true;
        /** @type {Keyframe[]} */
        this.keys = data.keys ? data.keys.map(key => new Keyframe(key)) : [];
        this.value = 0;
    }

    addKeyframe(/** @type {Keyframe} */ key) {
        let insertIndex = this.keys.length;
        for (let i = 0; i < this.keys.length; i ++) {
            if (key.point[0] <= this.keys[i].point[0]) {
                insertIndex = i;
                break ;
            }
        }
        this.keys.splice(insertIndex,0, key);
        managerForDOMs.update({o: this});
        managerForDOMs.update({o: this, i: "keys"});
    }

    removeKeyframe(/** @type {Keyframe} */ key) {
        this.keys.splice(this.keys.indexOf(key),1);
        managerForDOMs.update({o: this});
    }

    setKeyframe(data) {
        for (const key of data) {
            const keyframe =  new Keyframe(this, key);
            this.keys.push(keyframe);
        }
        managerForDOMs.update({o: "タイムライン-canvas"});
    }

    getKeyFromFrame(frame, threshold = 0.5) {
        for (const key of this.keys) {
            if (Math.abs(key.point[0] - frame) < threshold) return key;
        }
        return null;
    }

    hasKeyFromFrame(frame, threshold = 0.5) {
        for (const key of this.keys) {
            if (Math.abs(key.point[0] - frame) < threshold) return true;
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
            if (frame < key.point[0]) {
                break ;
            }
        }
        changeParameter(this, "value", bezierInterpolation(leftKey, rightKey, frame));
    }

    getSaveData() {
        return {
            type: "キーフレームブロック",
            id: this.id,
            keys: this.keys.map(key => key.getSaveData()),
        };
    }
}