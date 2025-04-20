import { calculateBBoxFromLimitedVertices } from "../../../../../BBox.js";
import { activeView, editorParameters, keysDown, stateMachine } from "../../../../../main.js";
import { managerForDOMs, updateDataForUI } from "../../../../../UI/制御.js";
import { allFalse, allTrue, getArrayLastValue } from "../../../../../utility.js";
import { GPU } from "../../../../../webGPU.js";
import { mesh } from "../../../../../機能/オペレーター/メッシュ/メッシュ.js";
import { vec2 } from "../../../../../ベクトル計算.js";
import { calculateAllAverage } from "../../../../../平均.js";
import { createNextStateData, previousKeysDown } from "../../../../状態遷移.js";

function a() {
    stateMachine.state.data.activeObject.editor.createEdgeFromTexture(1,5);
}

export class StateModel_MeshEditForGraphicMesh {
    constructor() {
        this.名前 = "グラフィックメッシュ_メッシュ編集";
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
            activeObject: "&-",
            selectIndexs: {isInclude: "&-", not: []},
            selectIndexsGroup: {isInclude: "&-", not: null},
            selectBBoxForCenterPoint: [0,0],
            selectBBoxBuffer: {isInclude: "&-", not: {GPU: true, type: "buffer", byteSize: 2 * 2 * 4}},
            selectBBoxGroup: {isInclude: "&-", not: null},
            referenceCoordinatesBuffer: {isInclude: "&-", not: {GPU: true, type: "buffer", byteSize: 2 * 4}},
            selectBBoxRenderGroup: {isInclude: "&-", not: {GPU: true, type: "group", layout: GPU.getGroupLayout("Vsr"), items: ["&selectBBoxBuffer"]}},
            referenceCoordinatesRenderGroup: {isInclude: "&-", not: {GPU: true, type: "group", layout: GPU.getGroupLayout("Vsr"), items: ["&referenceCoordinatesBuffer"]}},
            calculateSelectVerticesBBoxCenterGroup: {isInclude: "&-", not: {GPU: true, type: "group", layout: GPU.getGroupLayout("Csrw_Csr"), items: ["&referenceCoordinatesBuffer","&selectBBoxBuffer"]}},
        };
        this.遷移ステート = [
            createNextStateData([["/r"]], "頂点回転"),
            createNextStateData([["/s"]], "頂点リサイズ"),
            createNextStateData([["/g"]], "頂点並行移動"),
            createNextStateData([["/m"],["/Tab"]], "$-1"),
        ]
    }

    init(stateData) {
        updateDataForUI["インスペクタ"] = true;
    }

    // ホバーオブジェクトを更新
    async update(stateData) {
        const updateSelectVerticesIndexs = (indexs, isAdd = false) => {
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
                stateData.selectBBoxGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [stateData.selectBBoxBuffer, stateData.selectIndexBuffer]);
                stateData.selectIndexsGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [stateData.selectIndexBuffer]);
            }
            managerForDOMs.update("モーダル-選択情報-選択数");
        }

        if (allFalse(this.options.slice(1))) {
            if (activeView.mouseState.click) {
                if (keysDown["c"]) { // サークル選択
                    updateSelectVerticesIndexs(await activeView.select.circleSelectVertices(stateData.activeObject, activeView.mouseState.positionForGPU, editorParameters.selectRadius), keysDown["Shift"]);
                } else { // 選択
                    updateSelectVerticesIndexs(await activeView.select.closestSelectVertices(stateData.activeObject, activeView.mouseState.positionForGPU, editorParameters.selectRadius, 20), keysDown["Shift"]);
                }
            }
            if (activeView.mouseState.holdFrameCount > 10) { // ボックス選択
                updateSelectVerticesIndexs(await activeView.select.boxSelectVertices(stateData.activeObject, vec2.createBBox([
                    activeView.mouseState.positionForGPU,
                    activeView.mouseState.clickPositionForGPU
                ])), keysDown["Shift"]);
            }
            if (keysDown["a"]) { // 全選択
                updateSelectVerticesIndexs(Array.from({ length: stateData.activeObject.verticesNum }, (_, i) => i));
            }
        }
        if (stateData.selectBBoxGroup) {
            calculateBBoxFromLimitedVertices(stateData.selectBBoxGroup, stateData.activeObject.collisionVerticesGroup, stateData.selectIndexs.length);
            calculateAllAverage(stateData.calculateSelectVerticesBBoxCenterGroup, 2);
        }
        if (activeView.mouseState.click && this.options[1]) {
            mesh.appendBaseVertices(stateData.activeObject, activeView.mouseState.positionForGPU);
        }
        if (activeView.mouseState.click && this.options[2]) {
            mesh.deleteBaseVertices(stateData.activeObject, stateData.selectIndexs);
        }
        if (activeView.mouseState.click && this.options[3]) {
            const appendIndexs = mesh.appendBaseVertices(stateData.activeObject, activeView.mouseState.positionForGPU);
            mesh.appendBaseEdges(stateData.activeObject, [stateData.selectIndexs[0], appendIndexs]);
            updateSelectVerticesIndexs(appendIndexs);
        }
        if (keysDown["f"] && !previousKeysDown["f"]) {
            mesh.appendBaseEdges(stateData.activeObject, stateData.selectIndexs);
        }
        if (keysDown["x"] && !previousKeysDown["x"]) {
            mesh.deleteBaseEdges(stateData.activeObject, stateData.selectIndexs);
        }
        await GPU.copyBufferToArray(stateData.referenceCoordinatesBuffer, stateData.selectBBoxForCenterPoint);
    }

    finish(stateData) {
        managerForDOMs.update("ヒエラルキー")
        updateDataForUI["インスペクタ"] = true;
    }
}