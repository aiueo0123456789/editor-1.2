import { calculateBBoxFromLimitedBone, calculateBBoxFromLimitedVertices } from "../../../../../BBox.js";
import { c_srw_sr, v_sr } from "../../../../../GPUObject.js";
import { activeView, editorParameters, keysDown, stateMachine } from "../../../../../main.js";
import { managerForDOMs, updateDataForUI } from "../../../../../UI/制御.js";
import { GPU } from "../../../../../webGPU.js";
import { vec2 } from "../../../../../ベクトル計算.js";
import { calculateAllAverage } from "../../../../../平均.js";
import { createNextStateData } from "../../../../状態遷移.js";

export class StateModel_AnimationEditForBone {
    constructor() {
        this.名前 = "ボーンモディファイア_アニメーション編集";
        this.options = [];
        this.ツールバー = "&all";
        this.シェリフ = [
            {
                name: "メッシュ編集",
                targetObject: this.options,
                argumentArray: [
                    {name: "自動", type: {type: "ボタン", eventFn: {}}},
                    {name: "頂点追加", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
                    {name: "頂点削除", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
                ]
            }
        ];
        this.データ構造 = {
            activeObject: "&-",
            selectAnimation: {isInclude: "&-", not: null},
            selectIndexs: {isInclude: "&-", not: []},
            selectIndexsGroup: {isInclude: "&-", not: null},
            selectBBoxForCenterPoint: [0,0],
            selectBBoxBuffer: {isInclude: "&-", not: {GPU: true, type: "buffer", byteSize: 2 * 2 * 4}},
            referenceCoordinatesBuffer: {isInclude: "&-", not: {GPU: true, type: "buffer", byteSize: 2 * 4}},
            selectBBoxRenderGroup: {isInclude: "&-", not: {GPU: true, type: "group", layout: v_sr, items: ["&selectBBoxBuffer"]}},
            referenceCoordinatesRenderGroup: {isInclude: "&-", not: {GPU: true, type: "group", layout: v_sr, items: ["&referenceCoordinatesBuffer"]}},
            calculateSelectVerticesBBoxCenterGroup: {isInclude: "&-", not: {GPU: true, type: "group", layout: c_srw_sr, items: ["&referenceCoordinatesBuffer","&selectBBoxBuffer"]}},
        };
        this.遷移ステート = [
            createNextStateData([["/r"]], "頂点回転"),
            createNextStateData([["/s"]], "頂点リサイズ"),
            createNextStateData([["/g"]], "頂点並行移動"),
            createNextStateData([["/a"],["/Tab"]], "$-1"),
        ]
    }

    init(stateData) {
        managerForDOMs.update("ヒエラルキー")
        updateDataForUI["インスペクタ"] = true;
    }

    async update(stateData, externalInputs) {
        const updateSelectVerticesIndexs = (indexs, isAdd) => {
            if (isAdd) {
                for (const index of indexs) {
                    if (!stateData.selectIndexs.includes(index)) {
                        stateData.selectIndexs.push(index);
                    }
                }
            } else {
                stateData.selectIndexs = indexs;
            }
            if (stateData.selectIndexs.length == 0) {
                stateData.selectIndexBuffer = null;
                stateData.selectBBoxGroup = null;
                stateData.selectIndexsGroup = null;
            } else {
                stateData.selectIndexBuffer = GPU.createStorageBuffer(stateData.selectIndexs.length * 4, stateData.selectIndexs, ["u32"]);
                stateData.selectBBoxGroup = GPU.createGroup(c_srw_sr, [stateData.selectBBoxBuffer, stateData.selectIndexBuffer]);
                stateData.selectIndexsGroup = GPU.createGroup(v_sr, [stateData.selectIndexBuffer]);
            }
            managerForDOMs.update("モーダル-選択情報-選択数");
        }

        if (activeView.mouseState.click) {
            if (keysDown["c"]) { // サークル選択
            } else { // 選択
                updateSelectVerticesIndexs(await activeView.select.selectBones(stateData.activeObject, activeView.mouseState.positionForGPU, editorParameters.selectRadius), keysDown["Shift"]);
            }
        }
        if (stateData.selectBBoxGroup) {
            calculateBBoxFromLimitedBone(stateData.selectBBoxGroup, stateData.activeObject.collisionVerticesGroup, stateData.selectIndexs.length);
            calculateAllAverage(stateData.calculateSelectVerticesBBoxCenterGroup, 2);
        }
        await GPU.copyBufferToArray(stateData.referenceCoordinatesBuffer, stateData.selectBBoxForCenterPoint);

        if (externalInputs["オブジェクトのアニメーションキー選択"]) {
            stateData.selectAnimation = externalInputs["オブジェクトのアニメーションキー選択"];
            managerForDOMs.update(stateData.activeObject.animationBlock);
        } else if (externalInputs["オブジェクトのアニメーションキー選択"] === null) {
            stateData.selectAnimation = null;
            managerForDOMs.update(stateData.activeObject.animationBlock);
        }
    }

    finish(stateData) {
        managerForDOMs.update("ヒエラルキー")
        updateDataForUI["インスペクタ"] = true;
    }
}