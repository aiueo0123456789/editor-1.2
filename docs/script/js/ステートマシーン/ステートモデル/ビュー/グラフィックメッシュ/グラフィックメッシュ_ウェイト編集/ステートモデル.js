import { activeView, editorParameters, keysDown, stateMachine } from "../../../../../main.js";
import { managerForDOMs, updateDataForUI } from "../../../../../UI/制御.js";
import { GPU } from "../../../../../webGPU.js";
import { WeightPaintCommand } from "../../../../../機能/オペレーター/メッシュ/ウェイトペイント.js";
import { mesh, weightPaint } from "../../../../../機能/オペレーター/メッシュ/メッシュ.js";
import { createNextStateData, previousKeysDown } from "../../../../状態遷移.js";

function a() {
    stateMachine.state.data.activeObject.editor.createEdgeFromTexture(1,5);
}

export class StateModel_WeightEditForGraphicMesh {
    constructor() {
        this.名前 = "グラフィックメッシュ_ウェイト編集";
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
            targetBoneIndex: {isInclude: "&-", not: 0},
            targetBoneIndexBuffer: {isInclude: "&-", not: {GPU: true, type: "buffer", byteSize: 1 * 4}},
            targetBoneGroup: {isInclude: "&-", not: {GPU: true, type: "group", layout: GPU.getGroupLayout("Vsr"), items: ["&targetBoneIndexBuffer"]}},
        };
        this.遷移ステート = [
            createNextStateData([["/w"],["/Tab"]], "$-1"),
            createNextStateData([["クリック","!Alt"]], "ウェイトペイント"),
        ]
    }

    init(stateData) {
        GPU.writeBuffer(stateData.targetBoneIndexBuffer, new Uint32Array([stateData.targetBoneIndex]));
    }

    async update(stateData) {
        if (keysDown["Alt"]) {
            if (activeView.mouseState.click) {
                const result = await activeView.select.selectBone(stateData.activeObject.parent, activeView.mouseState.positionForGPU, editorParameters.selectRadius);
                if (result != -1) {
                    stateData.targetBoneIndex = result;
                    GPU.writeBuffer(stateData.targetBoneIndexBuffer, new Uint32Array([stateData.targetBoneIndex]));
                }
            }
        }
    }

    finish(stateData) {
        managerForDOMs.update("ヒエラルキー")
        updateDataForUI["インスペクタ"] = true;
    }
}