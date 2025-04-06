import { activeView, stateMachine } from "../../../../../../main.js";
import { managerForDOMs } from "../../../../../../UI/制御.js";
import { operator } from "../../../../../../機能/オペレーター/オペレーター.js";
import { WeightPaintCommand } from "../../../../../../機能/オペレーター/メッシュ/ウェイトペイント.js";
import { createNextStateData } from "../../../../../状態遷移.js";

function a() {
    stateMachine.state.data.activeObject.editor.createEdgeFromTexture(1,5);
}

export class StateModel_WeightPaint {
    constructor() {
        this.名前 = "ウェイトペイント";
        this.options = ["ボタン", 50, 0, 1, false];
        this.ツールバー = "&all";
        this.シェリフ = [
            {
                name: "ウェイト編集",
                targetObject: this.options,
                argumentArray: [
                    {name: "自動", type: {type: "ボタン", eventFn: a}},
                    {name: "範囲", type: {type: "入力", inputType: "数字", option: {min: 0, max: 1000, step: 0.001}}},
                    {name: "種類", type: {type: "選択", choices: [{text: "混ぜる", value: 0},{text: "加算", value: 1},{text: "減算", value: 2}]}},
                    {name: "値", type: {type: "入力", inputType: "数字", option: {min: 0, max: 1, step: 0.001}}},
                ]
            }
        ];
        this.データ構造 = {
            activeObject: "&-",
            targetBoneIndex: "&-",
            targetBoneIndexBuffer: "&-",
            targetBoneGroup: "&-",
        };
        this.遷移ステート = [
            createNextStateData([["!ホールド"]], "$-1", {object: operator, targetFn: "update"}),
        ]
    }

    init(stateData) {
        stateData.command = new WeightPaintCommand(stateData.activeObject, stateData.targetBoneIndex, this.options[3], this.options[2], this.options[1]);
        operator.appendCommand(stateData.command);
    }

    // ホバーオブジェクトを更新
    async update(stateData) {
        stateData.command.paint(activeView.mouseState.positionForGPU);
    }

    finish(stateData) {
        managerForDOMs.update("ヒエラルキー")
    }
}