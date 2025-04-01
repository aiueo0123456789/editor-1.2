import { activeView, keysDown } from "../../../main.js";
import { managerForDOMs, updateDataForUI } from "../../../UI/制御.js";
import { updateForContextmenu } from "../../../コンテキストメニュー/制御.js";
import { hierarchy } from "../../../ヒエラルキー.js";
import { createNextStateData, previousKeysDown } from "../../状態遷移.js";
import { updateForHoverObjects, updateSelectObjects } from "./ユーティリティ/関数.js";

export class StateModel_View {
    constructor() {
        this.名前 = "ビュー";
        this.ツールバー = [];
        this.シェリフ = [
            {
                name: "ビュー",
                targetObject: this.options,
                argumentArray: [
                    {name: "自動", type: {type: "ボタン", eventFn: {}}},
                    {name: "頂点追加", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
                    {name: "頂点削除", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
                ]
            }
        ];
        this.データ構造 = {
            activeObject: null,
            selectObjects: [],
            hoverObjects: {isInclude: "&-", not: []}
        };
        this.遷移ステート = [
            createNextStateData([["クリック",this.checkFn],[this.externalInputsCheckFn]], ""),
        ]
    }

    init(stateData) {
        managerForDOMs.update(hierarchy);
        updateDataForUI["インスペクタ"] = true;
    }

    // ホバーオブジェクトを更新
    async update(stateData) {
        await updateForHoverObjects(stateData);
        if (keysDown["A"] && !previousKeysDown["A"]) {
            updateForContextmenu("オブジェクト追加",activeView.mouseState.client);
        }
        if (keysDown["a"]) {
            updateSelectObjects(stateData,hierarchy.graphicMeshs);
            managerForDOMs.update("ヒエラルキー")
        }
    }

    finish(stateData) {
    }

    externalInputsCheckFn(stateData, externalInputs) {
        if (externalInputs["ヒエラルキーのオブジェクト選択"]) {
            if (Array.isArray(externalInputs["ヒエラルキーのオブジェクト選択"])) {
                updateSelectObjects(stateData,externalInputs["ヒエラルキーのオブジェクト選択"],true);
                stateData.activeObject = null;
            } else {
                updateSelectObjects(stateData,[externalInputs["ヒエラルキーのオブジェクト選択"]],keysDown["Shift"]);
                stateData.activeObject = externalInputs["ヒエラルキーのオブジェクト選択"];
                return {nextState: stateData.activeObject.type};
            }
        }
    }

    // ホバーオブジェクトから最前面のオブジェクトを探す
    checkFn(stateData) {
        let frontObject = null;
        if (stateData.hoverObjects.length) {
            frontObject = stateData.hoverObjects[0];
            for (let i = 1; i < stateData.hoverObjects.length; i ++) {
                const object = stateData.hoverObjects[i];
                if ("zIndex" in object) {
                    if (object.zIndex <= frontObject) {
                        frontObject = object;
                    }
                } else {
                    frontObject = object;
                }
            }
        }

        stateData.activeObject = frontObject;
        if (frontObject == null) {
            updateSelectObjects(stateData,"clear");
            return false;
        } else {
            updateSelectObjects(stateData,[frontObject],keysDown["Shift"]);
            return {nextState: frontObject.type};
        }
    }
}