import { v_sr } from "../GPUObject.js";
import { keysDown, activeView } from "../main.js";
import { GPU } from "../webGPU.js";
import { vec2 } from "../ベクトル計算.js";
import { arrayMath } from "../配列計算.js";
import { StateModel_View } from "./ステートモデル/ビュー/ステートモデル.js";
import { StateModel_GraphicMesh } from "./ステートモデル/ビュー/グラフィックメッシュ/ステートモデル.js";
import { StateModel_MeshEditForGraphicMesh } from "./ステートモデル/ビュー/グラフィックメッシュ/グラフィックメッシュ_メッシュ編集/ステートモデル.js";
import { StateModel_BoneModifier } from "./ステートモデル/ビュー/ボーンモディファイア/ステートモデル.js";
import { StateModel_BoneEditForBoneModifier } from "./ステートモデル/ビュー/ボーンモディファイア/ボーンモディファイア_ボーン編集/ステートモデル.js";
import { StateModel_Vertices_Resize } from "./ステートモデル/ビュー/ユーティリティ/頂点/リサイズ/ステートモデル.js";
import { StateModel_Vertices_Translate } from "./ステートモデル/ビュー/ユーティリティ/頂点/並行移動/ステートモデル.js";
import { StateModel_Vertices_Rotate } from "./ステートモデル/ビュー/ユーティリティ/頂点/回転/ステートモデル.js";
import { StateModel_Modifier } from "./ステートモデル/ビュー/モディファイア/ステートモデル.js";
import { StateModel_MeshEditForModifier } from "./ステートモデル/ビュー/モディファイア/ディファイア_メッシュ編集/ステートモデル.js";
import { StateModel_BezierModifier } from "./ステートモデル/ビュー/ベジェモディファイア/ステートモデル.js";
import { StateModel_BaseEditForBezierModifier } from "./ステートモデル/ビュー/ベジェモディファイア/ベジェモディファイア_ベース編集/ステートモデル.js";
import { StateModel_AnimationEditForBone } from "./ステートモデル/ビュー/ボーンモディファイア/ボーンモディファイア_アニメーション編集/ステートモデル.js";
import { StateModel_AnimationEditForBezierModifier } from "./ステートモデル/ビュー/ベジェモディファイア/ベジェモディファイア_アニメーション編集/ステートモデル.js";
import { StateModel_AnimationEditForGraphicMesh } from "./ステートモデル/ビュー/グラフィックメッシュ/グラフィックメッシュ_アニメーション編集/ステートモデル.js";
import { transform } from "../データマネージャー/変形.js";
import { StateModel_WeightEditForGraphicMesh } from "./ステートモデル/ビュー/グラフィックメッシュ/グラフィックメッシュ_ウェイト編集/ステートモデル.js";
import { mesh } from "../データマネージャー/メッシュ.js";

function isPlainObject(obj) {
    return obj instanceof Object && Object.getPrototypeOf(obj) === Object.prototype;
}

function IsString(value) {
    return typeof value === "string" || value instanceof String;
}

export function createNextStateData(conditions, stateVariation, finish, roop) {
    let data = {条件: conditions, 次のステート: stateVariation};
    if (finish) data.終了関数 = finish;
    if (roop) data.ステート変更後ループさせるか = true;
    return data;
}

export let previousKeysDown = {};
export class StateMachine {
    constructor() {
        this.useTool = "選択";

        this.mouseBuffer = GPU.createStorageBuffer(2 * 4, undefined, ["f32"]);
        this.mouseRenderGroup = GPU.createGroup(v_sr, [{item: this.mouseBuffer, type: 'b'}]);

        this.undoList = [];
        this.undoDepth = 0;

        this.externalInputs = {"ヒエラルキーのオブジェクト選択": false, "オブジェクトのアニメーションキー選択": false, "ツールバー選択": false};

        const StateModels = [ // 使うステートモデル
            StateModel_View,
            StateModel_GraphicMesh,StateModel_MeshEditForGraphicMesh,StateModel_AnimationEditForGraphicMesh,StateModel_WeightEditForGraphicMesh,
            StateModel_BoneModifier,StateModel_BoneEditForBoneModifier,StateModel_AnimationEditForBone,
            StateModel_Modifier,StateModel_MeshEditForModifier,
            StateModel_BezierModifier,StateModel_BaseEditForBezierModifier,StateModel_AnimationEditForBezierModifier,
            StateModel_Vertices_Translate,StateModel_Vertices_Resize,StateModel_Vertices_Rotate,
        ];

        // ステートモデルからデータを作成
        this.structs = {};
        for (const StateModel of StateModels) {
            const stateModel = new StateModel();
            this.structs[stateModel.名前] = stateModel;
        }

        // 初期化(ビュー)
        let newData = {};
        for (const dataName in this.structs["ビュー"].データ構造) {
            const initData = this.structs["ビュー"].データ構造[dataName];
            if (isPlainObject(initData) && ("isInclude" in initData) && ("not" in initData)) {
                newData[dataName] = initData.not;
            } else {
                newData[dataName] = initData;
            }
        }
        this.state = {stateID: ["ビュー"], data: newData, structClass: this.structs["ビュー"]};
    }

    addUndoData(data) {
        for (let i = 0; i < this.undoDepth; i ++) {
            this.undoList.splice(this.undoList.length - 1, 1);
        }
        this.undoDepth = 0;
        this.undoList.push(data);
        while (this.undoList.length > 50) {
            this.undoList.splice(0, 1);
        }
    }

    undo() {
        console.log(this.undoDepth, this.undoList)
        if (this.undoDepth == this.undoList.length) {
            console.log("取り消すデータがありません");
            return false;
        }
        this.undoDepth ++;
        const undoData = this.undoList[this.undoList.length - this.undoDepth];
        if (undoData.action == "変形") {
            transform.do(undoData.data);
        } else if (undoData.action == "メッシュ編集") {
            mesh.do(undoData.data);
        }
        return true;
    }

    redo() {
        if (this.undoDepth == 0) {
            console.log("取り消すデータがありません");
            return false;
        }
        const undoData = this.undoList[this.undoList.length - this.undoDepth];
        if (undoData.action == "変形") {
            undoData.data.object.isChange = true;
            GPU.copyBuffer(undoData.data.redo, undoData.data.target);
        } else if (undoData.action == "ウェイトペイント") {
            undoData.data.object.isChange = true;
            GPU.copyBuffer(undoData.data.redo, undoData.data.target);
        }
        this.undoDepth --;
        return true;
    }

    // 現在のステートに文字列が含まれるか
    searchStringInNowState(string) {
        return this.state.stateID.includes(string);
    }

    // ステート更新
    async stateUpdate() {
        try {
            vec2.sub(activeView.mouseState.movementForGPU, activeView.mouseState.positionForGPU, activeView.mouseState.lastPositionForGPU);
            GPU.writeBuffer(this.mouseBuffer, new Float32Array(activeView.mouseState.positionForGPU));
            let roop = true;
            while (roop) {
                const nowStateStruct = this.structs[this.state.stateID[this.state.stateID.length - 1]];
                if (nowStateStruct.update) {
                    await nowStateStruct.update(this.state.data, this.externalInputs);
                }
                 // and : [[条件0,条件1],...] or : [[条件0,...],[条件1,...]]
                let orBool = false; // orを満たすか
                const ステートの管理 = async (data) => {
                    let nextStateStrings = data.次のステート;
                    for (const ands of data.条件) {
                        let andBool = true; // andを満たすか
                        for (const 条件 of ands) {
                            if (typeof 条件 === 'function') { // 関数
                                const result = await 条件(this.state.data, this.externalInputs);
                                if (result) {
                                    if (isPlainObject(result) && "nextState" in result) {
                                        nextStateStrings = result.nextState;
                                    }
                                } else {
                                    andBool = false;
                                    break ;
                                }
                            } else if (条件 == "すぐに") { // 無条件
                            } else if (条件 == "クリック") { // クリック
                                if (!activeView.mouseState.click) {
                                    andBool = false;
                                    break ;
                                }
                            } else if (条件 == "右クリック") { // 右クリック
                                if (!activeView.mouseState.rightClick) {
                                    andBool = false;
                                    break ;
                                }
                            } else if (条件 == "ホールド") { // マウス長押し
                                if (!activeView.mouseState.hold) {
                                    andBool = false;
                                    break ;
                                }
                            }  else if (条件 == "!ホールド") { // マウス長押しではない
                                if (activeView.mouseState.hold) {
                                    andBool = false;
                                    break ;
                                }
                            } else if (条件[0] == "!") { // 任意のキーを押していない
                                if ((keysDown[条件.slice(1)])) {
                                    andBool = false;
                                    break ;
                                }
                            } else if (条件[0] == "/") { // 任意のキーを押しはじめた
                                if (!(keysDown[条件.slice(1)] && !previousKeysDown[条件.slice(1)])) {
                                    andBool = false;
                                    break ;
                                }
                            } else if (条件.length >= 7 && 条件.slice(0,6) == "input-") {
                                if (!this.externalInputs[条件.slice(6,)]) {
                                    andBool = false;
                                }
                            } else if (!keysDown[条件]) { // 任意のキーを押している
                                andBool = false;
                                break ;
                            }
                        }
                        if (andBool) {
                            orBool = true;
                            break ;
                        }
                    }
                    if (orBool) {
                        if (data.終了関数) {
                            const resource = data.終了関数;
                            let result;
                            if (typeof resource === 'function') {
                                result = resource();
                            } else if (resource.object && resource.targetFn) {
                                result = resource.object[resource.targetFn]();
                            } else {
                                console.warn("関数が見つかりません", resource);
                            }
                            if (result.undoData) {
                                this.addUndoData(result.undoData);
                            }
                        }

                        let nextStateStruct;
                        let undoNum = 0;
                        let nextStateSplit = nextStateStrings.split("/");
                        let nextState = [...this.state.stateID];
                        if (nextStateStrings[0] == "$") {
                            undoNum = Number(nextStateSplit[0].slice(1));
                            nextState = nextState.slice(0, undoNum);
                            if (1 < nextStateSplit.length) {
                                nextState = nextState.concat([nextStateSplit[nextStateSplit.length - 1]]);
                            }
                        } else {
                            nextState = nextState.concat([nextStateSplit[nextStateSplit.length - 1]]);
                        }
                        nextStateStruct = this.structs[nextState[nextState.length - 1]];

                        // データの作成
                        let newData = {};
                        if (nextStateStruct) {
                            for (const dataName in nextStateStruct.データ構造) {
                                const dataStruct = nextStateStruct.データ構造[dataName]; // データ構造からどうするかを取得
                                const createDataForGPU = (struct) => { // GPUデータをセット
                                    if (isPlainObject(struct) && struct.GPU) {
                                        if (struct.type == "buffer") {
                                            newData[dataName] = GPU.createStorageBuffer(struct.byteSize, undefined, ["f32"]);
                                        } else if (struct.type == "group") {
                                            newData[dataName] = GPU.createGroup(struct.layout, struct.items.map((item) => {
                                                if (item[0] == "&") {
                                                    return newData[item.slice(1)]; // 指定された名前のデータをセット
                                                }
                                            }));
                                        }
                                        return true;
                                    } else {
                                        return false;
                                    }
                                }
                                if (dataName == "takeOver") { // データを全て引き継ぎ
                                    if (dataStruct == "&all&") { // 全て引き継ぐ
                                        for (const dataName_ in this.state.data) {
                                            newData[dataName_] = this.state.data[dataName_];
                                        }
                                    }
                                } else if (createDataForGPU(dataStruct)) {
                                } else {
                                    if (isPlainObject(dataStruct) && ("isInclude" in dataStruct) && ("not" in dataStruct)) { // {isInclude: , not: }の場合
                                        // 前のステートデータに含まれているなら
                                        const referenceName = dataStruct.isInclude == "&-" ? dataName : dataStruct.isInclude.slice(1); // "&-"の場合同じ名前のデータを探す
                                        if (referenceName in this.state.data) { // 存在している場合引き継ぐ
                                            newData[dataName] = this.state.data[referenceName];
                                        } else {
                                            if (!createDataForGPU(dataStruct.not)) {
                                                newData[dataName] = dataStruct.not;
                                            }
                                        }
                                    } else if (IsString(dataStruct) && dataStruct[0] == "&") { // "&"で始まる場合引き継ぎ
                                        if (dataStruct == "&-") { // "&-1"の場合引き継ぎ
                                            newData[dataName] = this.state.data[dataName];
                                        } else {
                                            newData[dataName] = this.state.data[dataStruct.slice(1)]; // 指定された名前のデータを引き継ぎ
                                        }
                                    } else {
                                        newData[dataName] = dataStruct; // 新規作成
                                    }
                                }
                            }
                        } else {
                            console.warn("ステートが定義されていません",nextStateStrings,nextState,data,nextStateStruct)
                        }
                        console.log("次のデータ",newData)
                        this.state = {stateID: nextState, data: newData, structClass: nextStateStruct};
                        if (nextStateStruct.init && typeof nextStateStruct.init === 'function') nextStateStruct.init(newData);
                        if (nextStateStruct.シェリフ) {
                            activeView.deleteAll();
                            for (const shelf of nextStateStruct.シェリフ) {
                                activeView.addTranceShelfe(shelf.targetObject, shelf.argumentArray, shelf.name);
                            }
                        }
                        if (!data.ステート変更後ループさせるか) roop = false;
                        console.log("次のステート",this.state)
                        return true;
                    }
                    return false;
                }
                const ステートのループ = async () => {
                    for (const data of nowStateStruct.遷移ステート) {
                        if (Array.isArray(data)) {
                            const shuffleState = arrayMath.shuffleArray(data);
                            for (const data2 of shuffleState) {
                                if (await ステートの管理(data2)) {
                                    return ;
                                }
                            }
                        } else {
                            if (await ステートの管理(data)) {
                                return ;
                            }
                        }
                    }
                }
                await ステートのループ();
                if (!orBool) roop = false;
            }
            // 巻き戻し巻き戻しの取り消し
            if (keysDown["undo"]) {
                this.undo();
                keysDown["undo"] = false;
            }
            if (keysDown["redo"]) {
                this.redo();
                keysDown["redo"] = false;
            }
            activeView.mouseState.click = false;
            activeView.mouseState.rightClick = false;
            activeView.mouseState.lastPositionForGPU = [...activeView.mouseState.positionForGPU];
            if (activeView.mouseState.hold) {
                activeView.mouseState.holdFrameCount ++;
            }
            for (const keyName in this.externalInputs) {
                this.externalInputs[keyName] = false;
            }
            previousKeysDown = structuredClone(keysDown);
        } catch (err) {
            console.error(err);
        }
    }
}