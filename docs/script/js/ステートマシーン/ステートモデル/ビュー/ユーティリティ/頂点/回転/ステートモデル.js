import { activeView, editorParameters, keysDown } from "../../../../../../main.js";
import { managerForDOMs, updateDataForUI } from "../../../../../../UI/制御.js";
import { vec2 } from "../../../../../../ベクトル計算.js";
import { createNextStateData } from "../../../../../状態遷移.js";
import { calculateAllAverage } from "../../../../../../平均.js";
import { RotateCommand } from "../../../../../../機能/オペレーター/変形/トランスフォーム.js";
import { operator } from "../../../../../../機能/オペレーター/オペレーター.js";

export class StateModel_Vertices_Rotate {
    constructor() {
        this.名前 = "頂点回転";
        this.options = [0];
        this.ツールバー = "&all";
        this.シェリフ = [
            {
                name: "回転編集",
                targetObject: this.options,
                argumentArray: [
                    {name: "回転量", type: {type: "入力", inputType: "数字", option: {min: -10000, max: 10000, step: 0.00001, initValue: 0}}},
                ]
            }
        ];
        this.データ構造 = {
            activeObject: "&-",
            selectAnimation: {isInclude: "&-", not: null},
            selectIndexs: "&-",
            selectIndexsGroup: "&-",
            selectBBoxForCenterPoint: "&-",
            selectBBoxBuffer: "&-",
            referenceCoordinatesBuffer: "&-",
            selectBBoxRenderGroup: "&-",
            referenceCoordinatesRenderGroup: "&-",
            calculateSelectVerticesBBoxCenterGroup: "&-",
            transformValueMouseStartPosition: [0,0],
            transformValue: 0,
        };
        this.遷移ステート = [
            createNextStateData([["/g"],["クリック"]], "$-1", {object: operator, targetFn: "update"}),
            // createNextStateData([["右クリック"]], "$-1", {object: transform, targetFn: "cancel"}),
        ]
    }

    init(stateData) {
        if (stateData.selectIndexs.length == 0) return {cancel: true};
        calculateAllAverage(stateData.calculateSelectVerticesBBoxCenterGroup, 2);
        if (stateData.selectAnimation) {
            stateData.command = new RotateCommand(stateData.selectAnimation, stateData.selectIndexs);
        } else {
            stateData.command = new RotateCommand(stateData.activeObject, stateData.selectIndexs);
        }
        operator.appendCommand(stateData.command);
        stateData.command.setPointOfEffort(stateData.selectBBoxForCenterPoint);
        stateData.transformValueMouseStartPosition = activeView.mouseState.positionForGPU;
        stateData.transformValue = 0;
    }

    // 頂点を移動
    update(stateData) {
        stateData.transformValue += vec2.getAngularVelocity(stateData.selectBBoxForCenterPoint, activeView.mouseState.lastPositionForGPU, activeView.mouseState.movementForGPU);
        stateData.command.update(stateData.transformValue, "ローカル", editorParameters.smoothType, editorParameters.smoothRadius);
    }

    finish(stateData) {
        managerForDOMs.update("ヒエラルキー")
        updateDataForUI["インスペクタ"] = true;
    }
}