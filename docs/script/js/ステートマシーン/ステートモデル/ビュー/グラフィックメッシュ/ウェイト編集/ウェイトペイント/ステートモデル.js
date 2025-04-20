import { app } from "../../../../../../app.js";
import { activeView, stateMachine } from "../../../../../../main.js";
import { managerForDOMs } from "../../../../../../UI/制御.js";
import { WeightPaintCommand } from "../../../../../../機能/オペレーター/メッシュ/ウェイトペイント.js";
import { createNextStateData } from "../../../../../状態遷移.js";

function a() {
    stateMachine.state.data.activeObject.editor.createEdgeFromTexture(1,5);
}

export class StateModel_WeightPaint {
    constructor() {
        this.名前 = "ウェイトペイント";
        this.ツールバー = "&all";
        this.シェリフ = [];
        this.データ構造 = {
            activeObject: "&-",
            targetBoneIndex: "&-",
            targetBoneIndexBuffer: "&-",
            targetBoneGroup: "&-",
            options: "&-",
        };
        this.遷移ステート = [
            createNextStateData([["!ホールド"]], "$-1", {object: app.operator, targetFn: "update"}),
        ]
    }

    init(stateData) {
        stateData.command = new WeightPaintCommand(stateData.activeObject, stateData.targetBoneIndex, stateData.options[3], stateData.options[2], stateData.options[1]);
        app.operator.appendCommand(stateData.command);
    }

    // ホバーオブジェクトを更新
    async update(stateData) {
        stateData.command.paint(activeView.mouseState.positionForGPU);
    }

    finish(stateData) {
        managerForDOMs.update("ヒエラルキー")
    }
}