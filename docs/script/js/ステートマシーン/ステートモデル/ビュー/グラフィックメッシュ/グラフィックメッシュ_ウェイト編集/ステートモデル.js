import { calculateBBoxFromLimitedVertices } from "../../../../../BBox.js";
import { c_srw_sr, v_sr } from "../../../../../GPUObject.js";
import { activeView, editorParameters, keysDown, stateMachine } from "../../../../../main.js";
import { managerForDOMs, updateDataForUI } from "../../../../../UI/制御.js";
import { allFalse, allTrue, getArrayLastValue } from "../../../../../utility.js";
import { GPU } from "../../../../../webGPU.js";
import { mesh, weightPaint } from "../../../../../データマネージャー/メッシュ.js";
import { vec2 } from "../../../../../ベクトル計算.js";
import { calculateAllAverage } from "../../../../../平均.js";
import { createNextStateData, previousKeysDown } from "../../../../状態遷移.js";

function a() {
    stateMachine.state.data.activeObject.editor.createEdgeFromTexture(1,5);
}

export class StateModel_WeightEditForGraphicMesh {
    constructor() {
        this.名前 = "グラフィックメッシュ_ウェイト編集";
        this.options = ["ボタン", false, false, false, false];
        this.ツールバー = "&all";
        this.シェリフ = [
            {
                name: "メッシュ編集",
                targetObject: this.options,
                argumentArray: [
                    {name: "自動", type: {type: "ボタン", eventFn: a}},
                    {name: "頂点追加", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
                    {name: "頂点削除", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
                    {name: "辺追加", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
                    {name: "辺削除", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
                ]
            }
        ];
        this.データ構造 = {
            initBool: false,
            activeObject: "&-",
            targetBoneIndex: 0,
            targetBoneIndexBuffer: {GPU: true, type: "buffer", byteSize: 1 * 4},
            targetBoneGroup: {GPU: true, type: "group", layout: v_sr, items: ["&targetBoneIndexBuffer"]},
        };
        this.遷移ステート = [
            createNextStateData([["/w"],["/Tab"]], "$-1"),
        ]
    }

    init(stateData) {
        GPU.writeBuffer(stateData.targetBoneIndexBuffer, new Uint32Array([0]));
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
        } else if (activeView.mouseState.holdFrameCount > 2) {
            if (!stateData.initBool) {
                weightPaint.init(stateData.activeObject, stateData.targetBoneIndex, 1, 0, 50);
                stateData.initBool = true;
            }
            weightPaint.paint(activeView.mouseState.positionForGPU);
        } else {
            stateData.initBool = false;
        }
    }

    finish(stateData) {
        managerForDOMs.update("ヒエラルキー")
        updateDataForUI["インスペクタ"] = true;
    }
}