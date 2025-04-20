import { calculateBBoxFromLimitedVertices } from "../../../../../BBox.js";
import { activeView, editorParameters, keysDown, stateMachine } from "../../../../../main.js";
import { managerForDOMs, updateDataForUI } from "../../../../../UI/制御.js";
import { allFalse } from "../../../../../utility.js";
import { GPU } from "../../../../../webGPU.js";
import { BoneAppendCommand, BoneJoinCommand, mesh } from "../../../../../機能/オペレーター/メッシュ/メッシュ.js";
import { vec2 } from "../../../../../ベクトル計算.js";
import { calculateAllAverage } from "../../../../../平均.js";
import { createNextStateData, previousKeysDown } from "../../../../状態遷移.js";
import { app } from "../../../../../app.js";

function a() {
    stateMachine.state.data.activeObject.editor.createEdgeFromTexture(6,5);
}

export class StateModel_BoneEditForBoneModifier {
    constructor() {
        this.名前 = "ボーンモディファイア_ボーン編集";
        this.options = [false, false, false, false];
        this.ツールバー = "&all";
        this.シェリフ = [
            {
                name: "ボーン編集",
                targetObject: this.options,
                argumentArray: [
                    {name: "追加", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
                    {name: "削除", type: {type: "スイッチ", option: {look: "button-checkbox"}}},
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

    setSelectDataForGPU(stateData) {
        if (stateData.selectIndexs.length == 0) {
            stateData.selectIndexBuffer = null;
            stateData.selectBBoxGroup = null;
            stateData.selectIndexsGroup = null;
        } else {
            stateData.selectIndexBuffer = GPU.createStorageBuffer(stateData.selectIndexs.length * 4, stateData.selectIndexs, ["u32"]);
            stateData.selectBBoxGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [stateData.selectBBoxBuffer, stateData.selectIndexBuffer]);
            stateData.selectIndexsGroup = GPU.createGroup(GPU.getGroupLayout("Vsr"), [stateData.selectIndexBuffer]);
        }
    }

    init(stateData) {
        this.setSelectDataForGPU(stateData);
    }

    // ホバーオブジェクトを更新
    async update(stateData) {
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
            this.setSelectDataForGPU(stateData);
            managerForDOMs.update("モーダル-選択情報-選択数");
        }

        if (allFalse(this.options)) {
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
                updateSelectVerticesIndexs(Array.from({ length: stateData.activeObject.verticesNum }, (_, i) => i), false);
            }
            if (stateData.selectBBoxGroup) {
                calculateBBoxFromLimitedVertices(stateData.selectBBoxGroup, stateData.activeObject.collisionVerticesGroup, stateData.selectIndexs.length);
                calculateAllAverage(stateData.calculateSelectVerticesBBoxCenterGroup, 2);
            }
        }
        if (activeView.mouseState.click && this.options[0]) {
            let index;
            let head;
            let tail;
            if (stateData.selectIndexs.length == 0) {
                index = "last";
                head = activeView.mouseState.positionForGPU;
                tail = vec2.addR(activeView.mouseState.positionForGPU, [0,50]);
            } else {
                index = Math.floor(stateData.selectIndexs[0] / 2);
                if (keysDown["Shift"]) {
                    head = activeView.mouseState.positionForGPU;
                    tail = vec2.addR(activeView.mouseState.positionForGPU, [0,50]);
                } else {
                    head = [...await GPU.getF32BufferPartsData(stateData.activeObject.s_baseVerticesPositionBuffer,stateData.selectIndexs[0],2)];
                    tail = activeView.mouseState.positionForGPU;
                }
            }
            app.operator.appendCommand(new BoneAppendCommand(app.operator.bone, stateData.activeObject, index, head, tail));
        }
        if (activeView.mouseState.click && this.options[1]) {
            app.operator.appendCommand(new BoneDeleteCommand(app.operator.bone, stateData.activeObject, index, head, tail));
            // mesh.deleteBone(stateData.activeObject, stateData.selectIndexs);
            // updateSelectVerticesIndexs([]);
        }
        if (keysDown["f"] && !previousKeysDown["f"]) {
            app.operator.appendCommand(new BoneJoinCommand(app.operator.bone, stateData.activeObject, Math.floor(stateData.selectIndexs[0] / 2), Math.floor(stateData.selectIndexs[1] / 2)));
        }
        if (keysDown["x"] && !previousKeysDown["x"]) {
            mesh.deleteBaseEdges(stateData.activeObject, stateData.selectIndexs);
        }

        await GPU.copyBufferToArray(stateData.referenceCoordinatesBuffer, stateData.selectBBoxForCenterPoint);
    }

    finish(stateData) {
        managerForDOMs.update("ヒエラルキー")
    }
}