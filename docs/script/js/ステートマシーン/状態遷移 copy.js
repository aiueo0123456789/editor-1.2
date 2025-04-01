import { calculateLimitBBox } from "../BBox.js";
import { c_sr, c_srw_sr, c_srw_sr_sr_sr_u, c_u_u_sr, v_sr, v_u, v_u_f_u, v_u_u } from "../GPUObject.js";
import { keysDown, activeView } from "../main.js";
import { GPU } from "../webGPU.js";
import { baseTransform } from "../オブジェクト/オブジェクトで共通の処理.js";
import { addShelfToAllView, deleteAllShelfForAllView, managerForDOMs, updateDataForUI } from "../UI/制御.js";
import { hierarchy } from "../ヒエラルキー.js";
import { vec2 } from "../ベクトル計算.js";
import { calculateAllAverage } from "../平均.js";
import { editorParameters } from "../main.js";
import { arrayMath } from "../配列計算.js";
import { transform, Transform } from "../データマネージャー/変形.js";
import { Mesh, WeightPaint } from "../データマネージャー/メッシュ.js";
import { initMeshShelf, initSelectShelf } from "../UI/シェリフ.js";

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

let previousKeysDown = {};
export class StateMachine {
    constructor() {
        this.useTool = "選択";

        this.weightPaint = new WeightPaint();
        this.mesh = new Mesh();
        // this.transform = new Transform();
        this.transform = transform;
        this.selectVerticesBBoxBuffer = GPU.createStorageBuffer(2 * 2 * 4, undefined, ["f32"]);
        this.referenceCoordinatesBuffer = GPU.createStorageBuffer(2 * 4, undefined, ["f32"]);
        this.calculateSelectVerticesBBoxCenterGroup = GPU.createGroup(c_srw_sr, [{item: this.referenceCoordinatesBuffer, type: 'b'}, {item: this.selectVerticesBBoxBuffer, type: 'b'}]); // BBoxから中心点を計算するためのグループ
        this.selectVerticesBBoxRenderGroup = GPU.createGroup(v_sr, [{item: this.selectVerticesBBoxBuffer, type: 'b'}]);
        this.referenceCoordinatesRenderGroup = GPU.createGroup(v_sr, [{item: this.referenceCoordinatesBuffer, type: 'b'}]);

        this.mouseBuffer = GPU.createStorageBuffer(2 * 4, undefined, ["f32"]);
        this.mouseRenderGroup = GPU.createGroup(v_sr, [{item: this.mouseBuffer, type: 'b'}]);

        this.selectBBoxForCenterPoint = [0,0];

        this.undoList = [];
        this.undoDepth = 0;

        this.externalInputs = {"ヒエラルキーのオブジェクト選択": false, "オブジェクトのアニメーションキー選択": false, "ツールバー選択": false};
        this.structs = { // データの構造: {ステートが変わったタイミングでセットされるデータの構造や定数(&をつけることで前ステートからデータを受け渡しできる)}, 更新関数: ステートの持つデータを更新する関数, ステートの更新: [{条件: ステートの切り替え条件([]配列指定でandを実現), 次のステート: 条件が揃った時に変わるステート, データの初期化: データに参照がある場合するか}...]
            "関数待機": {
                初期化関数: this.initAwaitFu.bind(this),
                データの構造: {
                    takeOver: "&all&",
                }, 更新関数: null,
                ステートの更新: [
                    {条件: [["クリック"]], 次のステート: "$-1/選択", 終了関数: this.cancelTransform.bind(this)},
                ]
            },
            "選択": {
                データの構造: {
                    object: "&-",
                    selectAnimation: {isInclude: "&-", not: null},
                    selectVerticesIndexs: {isInclude: "&-", not: []},
                    selectVerticesIndexBuffer: {isInclude: "&-", not: null},
                    selectVerticesIndexsGroup: {isInclude: "&-", not: null},
                    selectVerticesBBoxGroup: {isInclude: "&-", not: null},
                },
                更新関数: [this.updateSelectState.bind(this),this.updateActiveAnimation.bind(this)],
                ステートの更新: [
                    {条件: [["/Tab"]], 次のステート: "$-1", データの初期化: false, 終了関数: deleteAllShelfForAllView},
                    {条件: [["/f"]], 次のステート: "$-1/メッシュ追加"},
                    {条件: [["/e"]], 次のステート: "$-1/追加"},
                    {条件: [["/x"]], 次のステート: "$-1/削除"},
                    {条件: [["/g", this.transformForBool.bind(this)]], 次のステート: "$-1/並行移動"},
                    {条件: [["/s", this.transformForBool.bind(this)]], 次のステート: "$-1/リサイズ"},
                    {条件: [["/r", this.transformForBool.bind(this)]], 次のステート: "$-1/回転"},
                    {条件: [["/w"]], 次のステート: "$-1/ウェイトペイント"},
                ]
            },
            "追加": {
                データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-"
                },
                更新関数: null,
                ステートの更新: [
                    {条件: [["すぐに"]], 次のステート: "$-1/選択", 終了関数: this.addVertices.bind(this)},
                ]
            },
            "メッシュ追加": {
                データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-"
                },
                更新関数: null,
                ステートの更新: [
                    {条件: [["すぐに"]], 次のステート: "$-1/選択", 終了関数: this.addMesh.bind(this)},
                ]
            },
            "削除": {
                データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-"
                },
                更新関数: null,
                ステートの更新: [
                    {条件: [["すぐに"]], 次のステート: "$-1/選択", 終了関数: this.addVertices.bind(this)},
                ]
            },
            "並行移動": {
                初期化関数: this.createTransformDataInit.bind(this),
                データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-",
                    targetFn: {object: this.transform, targetFn: "translate"},
                }, 更新関数: this.createTranslateTransformData.bind(this),
                ステートの更新: [
                    {条件: [["/g"],["クリック"]], 次のステート: "$-1/関数待機", 終了関数: this.createTransformUndoData.bind(this)},
                    {条件: [["右クリック"],["/c"]], 次のステート: "$-1/選択", 終了関数: this.cancelTransform.bind(this)},
                ]
            },
            "リサイズ": {
                初期化関数: this.createTransformDataInit.bind(this),
                データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-",
                    targetFn: {object: this.transform, targetFn: "resize"},
                }, 更新関数: this.createResizeTransformData.bind(this),
                ステートの更新: [
                    {条件: [["/s"],["クリック"]], 次のステート: "$-1/関数待機", 終了関数: this.createTransformUndoData.bind(this)},
                    {条件: [["右クリック"],["/c"]], 次のステート: "$-1/選択", 終了関数: this.cancelTransform.bind(this)},
                ]
            },
            "回転": {
                初期化関数: this.createTransformDataInit.bind(this),
                データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-",
                    targetFn: {object: this.transform, targetFn: "rotate"},
                }, 更新関数: this.createRotateTransformData.bind(this),
                ステートの更新: [
                    {条件: [["/r"],["クリック"]], 次のステート: "$-1/関数待機", 終了関数: this.createTransformUndoData.bind(this)},
                    {条件: [["右クリック"],["/c"]], 次のステート: "$-1/選択", 終了関数: this.cancelTransform.bind(this)},
                ]
            },
            "ウェイトペイント": {初期化関数: this.updateWeightPaintAwaitInit.bind(this), データの構造: {object: "&-", animation: "&-", selectVerticesIndexs: "&-", selectVerticesIndexBuffer: "&-", selectVerticesIndexsGroup: "&-", selectVerticesBBoxRenderGroup: "&-", referenceCoordinatesRenderGroup: "&-", selectVerticesBBoxGroup: "&-", weightPaintTarget: {isInclude: "&-", not: 0}}, 更新関数: this.updateWeightPaintAwait.bind(this), ステートの更新: [
                {条件: [["/Tab"]], 次のステート: "$-1/選択", 終了関数: null},
                {条件: [["/w"]], 次のステート: "$-1/選択", 終了関数: null},
                {条件: [["!Alt","クリック"]], 次のステート: "ペイント", 終了関数: null},
            ]},
            "ペイント": {初期化関数: this.updateWeightPaintInit.bind(this), データの構造: {object: "&-", animation: "&-", selectVerticesIndexs: "&-", selectVerticesIndexBuffer: "&-", selectVerticesIndexsGroup: "&-", selectVerticesBBoxRenderGroup: "&-", referenceCoordinatesRenderGroup: "&-", selectVerticesBBoxGroup: "&-", weightPaintTarget: "&-", weightTargetBuffer: "&-", weightTargetGroup: "&-"}, 更新関数: this.updateWeightPaint.bind(this), ステートの更新: [
                {条件: [["!ホールド"]], 次のステート: "$-1", 終了関数: this.weightPaintUndo.bind(this)},
            ]},

            "オブジェクト選択": {データの構造: {object: null,  hoverObjects: {isInclude: "&-", not: []}}, 更新関数: this.updateSelectObjects.bind(this), ステートの更新: [
                [
                    {条件: [["クリック",this.SelectObjects.bind(this, hierarchy.graphicMeshs)]], 次のステート: ""},
                    {条件: [[this.hierarchySelect.bind(this,"グラフィックメッシュ")]], 次のステート: "グラフィックメッシュ"},
                    {条件: [[this.hierarchySelect.bind(this,"モディファイア")]], 次のステート: "モディファイア"},
                    {条件: [[this.hierarchySelect.bind(this,"ボーンモディファイア")]], 次のステート: "ボーンモディファイア"},
                    {条件: [[this.hierarchySelect.bind(this,"ベジェモディファイア")]], 次のステート: "ベジェモディファイア"},
                    {条件: [[this.hierarchySelect.bind(this,"回転モディファイア")]], 次のステート: "回転モディファイア"},
                ],
            ]},

            // グラフィックメッシュの編集
            "グラフィックメッシュ": {初期化関数: () => {managerForDOMs.update("ヒエラルキー"); updateDataForUI["インスペクタ"] = true; },データの構造: {object: "&-", IsHideForGUI: "&-", selectAnimation: {isInclude: "&-", not: null}, hoverObjects: {isInclude: "&-", not: []}}, 更新関数: [this.updateSelectObjects.bind(this),this.updateActiveAnimation.bind(this)], ステートの更新: [
                {条件: [["クリック"],["input-ヒエラルキーのオブジェクト選択"]], 次のステート: "$-1", ステート変更後ループさせるか: true},
                {条件: [["/Tab"]], 次のステート: "選択", 終了関数: this.graphicMeshsEditShelf.bind(this)},
            ]},

            // モディファイアの編集
            "モディファイア": {初期化関数: () => {managerForDOMs.update("ヒエラルキー"); updateDataForUI["インスペクタ"] = true; }, データの構造: {object: "&-", IsHideForGUI: "&-", selectAnimation: {isInclude: "&-", not: null}, hoverObjects: {isInclude: "&-", not: []}}, 更新関数: [this.updateSelectObjects.bind(this),this.updateActiveAnimation.bind(this)], ステートの更新: [
                {条件: [["クリック"],["input-ヒエラルキーのオブジェクト選択"]], 次のステート: "$-1", ステート変更後ループさせるか: true},
                {条件: [["/Tab"]], 次のステート: "選択"},
            ]},

            //　ベジェモディファイアの編集
            "ベジェモディファイア": {初期化関数: () => {managerForDOMs.update("ヒエラルキー"); updateDataForUI["インスペクタ"] = true; }, データの構造: {object: "&-", IsHideForGUI: "&-", selectAnimation: {isInclude: "&-", not: null}, hoverObjects: {isInclude: "&-", not: []}}, 更新関数: [this.updateSelectObjects.bind(this),this.updateActiveAnimation.bind(this)], ステートの更新: [
                {条件: [["クリック"],["input-ヒエラルキーのオブジェクト選択"]], 次のステート: "$-1", ステート変更後ループさせるか: true},
                {条件: [["/Tab"]], 次のステート: "選択"},
            ]},
            "ベジェモディファイア編集-選択": {データの構造: {
                object: "&-",
                selectAnimation: {isInclude: "&-", not: null},
                selectVerticesIndexs: {isInclude: "&-", not: []},
                selectVerticesIndexBuffer: {isInclude: "&-", not: null},
                selectVerticesBBoxGroup: {isInclude: "&-", not: null},
                selectVerticesIndexsGroup: {isInclude: "&-", not: null},
                selectVerticesBBoxRenderGroup: GPU.createGroup(v_sr, [{item: this.selectVerticesBBoxBuffer, type: 'b'}]),
                referenceCoordinatesRenderGroup: GPU.createGroup(v_sr, [{item: this.referenceCoordinatesBuffer, type: 'b'}]),
            }, 更新関数: [this.updateSelectState.bind(this),this.updateActiveAnimation.bind(this)], ステートの更新: [
                {条件: [["/Tab"]], 次のステート: "オブジェクト選択-ベジェモディファイア", データの初期化: false},
                {条件: [["/e"]], 次のステート: "ベジェモディファイア編集-頂点追加", ステート変更後ループさせるか: true},
                {条件: [["/x"]], 次のステート: "ベジェモディファイア編集-頂点削除", ステート変更後ループさせるか: true},
                {条件: [["/g", this.transformForBool.bind(this)]], 次のステート: "ベジェモディファイア編集-並行移動"},
                {条件: [["/s", this.transformForBool.bind(this)]], 次のステート: "ベジェモディファイア編集-拡大縮小"},
                {条件: [["/r", this.transformForBool.bind(this)]], 次のステート: "ベジェモディファイア編集-回転"},
            ]},
            "ベジェモディファイア編集-頂点追加": {データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-"
                }, 更新関数: null, ステートの更新: [
                {条件: [["すぐに"]], 次のステート: "ベジェモディファイア編集-選択", 終了関数: this.addVertices.bind(this)},
            ]},
            "ベジェモディファイア編集-頂点削除": {データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-"
                }, 更新関数: null, ステートの更新: [
                {条件: [["すぐに"]], 次のステート: "ベジェモディファイア編集-選択", 終了関数: this.deleteVertices.bind(this)},
            ]},

            //　回転モディファイアの編集
            "回転モディファイア": {初期化関数: () => {managerForDOMs.update("ヒエラルキー"); updateDataForUI["インスペクタ"] = true; }, データの構造: {object: "&-", IsHideForGUI: "&-", hoverObjects: {isInclude: "&-", not: []}}, 更新関数: [this.updateSelectObjects.bind(this),this.updateActiveAnimation.bind(this)], ステートの更新: [
                {条件: [["クリック"],["input-ヒエラルキーのオブジェクト選択"]], 次のステート: "$-1", ステート変更後ループさせるか: true},
                {条件: [["/Tab"]], 次のステート: "回転モディファイア待機"},
            ]},
            "回転モディファイア待機": {データの構造: {
                object: "&-",
                selectAnimation: {isInclude: "&-", not: null},
            }, 更新関数: this.updateActiveAnimation.bind(this), ステートの更新: [
                {条件: [["/Tab"]], 次のステート: "$-1", データの初期化: false},
                {条件: [["/g"]], 次のステート: "$-1/回転モディファイア並行移動"},
                {条件: [["/s"]], 次のステート: "$-1/回転モディファイア拡大縮小"},
                {条件: [["/r"]], 次のステート: "$-1/回転モディファイア回転"},
            ]},
            "回転モディファイア並行移動": {初期化関数: this.createRotateModifierTransformDataInit.bind(this), データの構造: {transformType: "move", object: "&-", animation: "&-"}, 更新関数: this.createRotateModifierTransformData.bind(this), ステートの更新: [
                {条件: [["/g"],["クリック"]], 次のステート: "$-1/回転モディファイア待機", 終了関数: this.createRotateModifierTransformData.bind(this)},
            ]},
            "回転モディファイア拡大縮小": {初期化関数: this.createRotateModifierTransformDataInit.bind(this), データの構造: {transformType: "scaling", object: "&-", animation: "&-"}, 更新関数: this.createRotateModifierTransformData.bind(this), ステートの更新: [
                {条件: [["/s"],["クリック"]], 次のステート: "$-1/回転モディファイア待機", 終了関数: this.createRotateModifierTransformData.bind(this)},
            ]},
            "回転モディファイア回転": {初期化関数: this.createRotateModifierTransformDataInit.bind(this), データの構造: {transformType: "rotate", object: "&-", animation: "&-"}, 更新関数: this.createRotateModifierTransformData.bind(this), ステートの更新: [
                {条件: [["/r"],["クリック"]], 次のステート: "$-1/回転モディファイア待機", 終了関数: this.createRotateModifierTransformData.bind(this)},
            ]},

            //　ボーンモディファイアの編集
            "ボーンモディファイア": {初期化関数: () => {managerForDOMs.update("ヒエラルキー"); updateDataForUI["インスペクタ"] = true; }, データの構造: {object: "&-", IsHideForGUI: "&-", selectAnimation: {isInclude: "&-", not: null}, hoverObjects: {isInclude: "&-", not: []}}, 更新関数: [this.updateSelectObjects.bind(this),this.updateActiveAnimation.bind(this)], ステートの更新: [
                {条件: [["クリック"],["input-ヒエラルキーのオブジェクト選択"]], 次のステート: "$-1", ステート変更後ループさせるか: true},
                {条件: [["/Tab"]], 次のステート: "選択"},
            ]},
            "ボーンモディファイア編集-選択": {データの構造: {
                object: "&-",
                selectAnimation: {isInclude: "&-", not: null},
                selectVerticesIndexs: {isInclude: "&-", not: []},
                selectVerticesIndexBuffer: {isInclude: "&-", not: null},
                selectVerticesBBoxGroup: {isInclude: "&-", not: null},
                selectVerticesIndexsGroup: {isInclude: "&-", not: null},
                selectVerticesBBoxRenderGroup: GPU.createGroup(v_sr, [{item: this.selectVerticesBBoxBuffer, type: 'b'}]),
                referenceCoordinatesRenderGroup: GPU.createGroup(v_sr, [{item: this.referenceCoordinatesBuffer, type: 'b'}]),
            }, 更新関数: [this.updateSelectState.bind(this),this.updateActiveAnimation.bind(this)], ステートの更新: [
                {条件: [["/Tab"]], 次のステート: "オブジェクト選択-ボーンモディファイア", データの初期化: false},
                {条件: [["/e"]], 次のステート: "ボーンモディファイア編集-頂点追加", ステート変更後ループさせるか: true},
                {条件: [["/x"]], 次のステート: "ボーンモディファイア編集-頂点削除", ステート変更後ループさせるか: true},
                {条件: [["/g", this.transformForBool.bind(this)]], 次のステート: "ボーンモディファイア編集-並行移動"},
                {条件: [["/s", this.transformForBool.bind(this)]], 次のステート: "ボーンモディファイア編集-拡大縮小"},
                {条件: [["/r", this.transformForBool.bind(this)]], 次のステート: "ボーンモディファイア編集-回転"},
            ]},
            "ボーンモディファイア編集-頂点追加": {データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-"
                }, 更新関数: null, ステートの更新: [
                {条件: [["すぐに"]], 次のステート: "ボーンモディファイア編集-選択", 終了関数: this.addVertices.bind(this)},
            ]},
            "ボーンモディファイア編集-頂点削除": {データの構造: {
                    object: "&-",
                    animation: "&-",
                    selectVerticesIndexs: "&-",
                    selectVerticesIndexBuffer: "&-",
                    selectVerticesIndexsGroup: "&-",
                    selectVerticesBBoxGroup: "&-"
                }, 更新関数: null, ステートの更新: [
                {条件: [["すぐに"]], 次のステート: "ボーンモディファイア編集-選択", 終了関数: this.deleteVertices.bind(this)},
            ]},

            "all": {更新関数: this.allUpdate.bind(this)},
        };
        let newData = {};
        for (const dataName in this.structs["オブジェクト選択"].データの構造) {
            const initData = this.structs["オブジェクト選択"].データの構造[dataName];
            if (isPlainObject(initData) && ("isInclude" in initData) && ("not" in initData)) {
                newData[dataName] = initData.not;
            } else {
                newData[dataName] = initData;
            }
        }
        this.state = {stateID: ["オブジェクト選択"], data: newData};
    }

    initAwaitFu() {
        console.log(this.state.data.targetFn)
        const resource = this.state.data.targetFn;
        if (typeof resource === 'function') {
            activeView.addFunctionTranceShelfe(this.state.data.targetFn, resource.argumentArray);
        } else if (resource.object && resource.targetFn) {
            activeView.addFunctionTranceShelfe(this.state.data.targetFn, resource.object[resource.targetFn].argumentArray, this.state.data.targetFn.targetFn);
        } else {
            console.warn("関数が見つかりません", resource);
        }
    }

    graphicMeshsEditShelf() {
        addShelfToAllView("選択", initSelectShelf);
        addShelfToAllView("メッシュ", initMeshShelf);
    }

    allUpdate() {
        if (keysDown["1"]) this.state.data.IsHideForGUI = false;
        if (keysDown["2"]) this.state.data.IsHideForGUI = true;
        if (this.externalInputs["ツールバー選択"]) {
        }
    }

    async updateSelectObjects() {
        let hoverObjects = this.state.data.hoverObjects;
        hoverObjects.length = 0;
        await Promise.all(
            hierarchy.allObject.map(async (object) => {
                if (await activeView.select.selectSilhouette(object, activeView.mouseState.positionForGPU)) {
                    hoverObjects.push(object);
                }
            })
        )
    }

    async updateWeightPaintAwaitInit() {
        this.state.data.weightTargetBuffer = GPU.createStorageBuffer(4, undefined, ["u32"]);
        this.state.data.weightTargetGroup = GPU.createGroup(v_sr, [{item: this.state.data.weightTargetBuffer, type: "b"}]);
        GPU.writeBuffer(this.state.data.weightTargetBuffer, new Uint32Array([this.state.data.weightPaintTarget]));
    }

    async updateWeightPaintAwait() {
        // if (this.state.data.object.parent.type == "ボーンディファイア" || this.state.data.object.parent.type == "ディファイア") {
        if (keysDown["Alt"]) {
            if (activeView.mouseState.click) {
                const result = await activeView.select.selectBone(this.state.data.object.parent, activeView.mouseState.positionForGPU);
                console.log(result);
                this.state.data.weightPaintTarget = result;

                GPU.writeBuffer(this.state.data.weightTargetBuffer, new Uint32Array([this.state.data.weightPaintTarget]));
            }
        }
        // }
    }

    updateWeightPaintInit() {
        this.weightPaint.init(this.state.data.object, this.state.data.weightPaintTarget, 0.5, 0, activeView.convertCoordinate.GPUSizeFromCPU(300));
    }

    async updateWeightPaint() {
        this.weightPaint.paint(activeView.mouseState.positionForGPU);
    }

    weightPaintUndo() {
        this.addUndoData(this.weightPaint.createUndoData());
    }

    hierarchySelect(type) {
        if (this.externalInputs["ヒエラルキーのオブジェクト選択"]) {
            if (this.externalInputs["ヒエラルキーのオブジェクト選択"].type == type) {
                this.state.data.object = this.externalInputs["ヒエラルキーのオブジェクト選択"];
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    SelectObjects() {
        let frontObject = null;
        if (this.state.data.hoverObjects.length) {
            frontObject = this.state.data.hoverObjects[0];
            for (let i = 1; i < this.state.data.hoverObjects.length; i ++) {
                const object = this.state.data.hoverObjects[i];
                if ("zIndex" in object) {
                    if (object.zIndex <= frontObject) {
                        frontObject = object;
                    }
                } else {
                    frontObject = object;
                }
            }
        }

        this.state.data.object = frontObject;
        if (frontObject == null) {
            return false;
        } else {
            return {nextState: frontObject.type};
        }
    }

    transformForBool() { // 変形を適応する頂点が存在しているかとそのデータ
        if (this.state.data.selectVerticesIndexs.length > 0) {
            return true;
        } else {
            return false;
        }
    }

    updateSelectVerticesIndexs(indexs, isAdd) {
        if (isAdd) {
            for (const index of indexs) {
                if (!this.state.data.selectVerticesIndexs.includes(index)) {
                    this.state.data.selectVerticesIndexs.push(index);
                }
            }
        } else {
            this.state.data.selectVerticesIndexs = indexs;
        }
        if (this.state.data.selectVerticesIndexs.length == 0) {
            console.log("選択解除")
            this.state.data.selectVerticesIndexBuffer = null;
            this.state.data.selectVerticesBBoxGroup = null;
            this.state.data.selectVerticesIndexsGroup = null;
        } else {
            this.state.data.selectVerticesIndexBuffer = GPU.createStorageBuffer(this.state.data.selectVerticesIndexs.length * 4, this.state.data.selectVerticesIndexs, ["u32"]);
            this.state.data.selectVerticesBBoxGroup = GPU.createGroup(c_srw_sr, [{item: this.selectVerticesBBoxBuffer, type: "b"}, {item: this.state.data.selectVerticesIndexBuffer, type: "b"}]);
            this.state.data.selectVerticesIndexsGroup = GPU.createGroup(v_sr, [{item: this.state.data.selectVerticesIndexBuffer, type: "b"}]);
        }
        managerForDOMs.update("モーダル-選択情報-選択数");
    }

    async updateSelectState() {
        if (activeView.mouseState.click) {
            if (keysDown["c"]) { // サークル選択
                this.updateSelectVerticesIndexs(await activeView.select.circleSelectVertices(this.state.data.object, activeView.mouseState.positionForGPU, editorParameters.selectRadius), keysDown["Shift"]);
            } else { // 選択
                this.updateSelectVerticesIndexs(await activeView.select.closestSelectVertices(this.state.data.object, activeView.mouseState.positionForGPU, editorParameters.selectRadius), keysDown["Shift"]);
            }
        }
        if (activeView.mouseState.holdFrameCount > 10) { // ボックス選択
            this.updateSelectVerticesIndexs(await activeView.select.boxSelectVertices(this.state.data.object, vec2.createBBox([
                activeView.mouseState.positionForGPU,
                activeView.mouseState.clickPositionForGPU
            ])), keysDown["Shift"]);
        }
        if (keysDown["a"]) { // 全選択
            this.updateSelectVerticesIndexs(Array.from({ length: this.state.data.object.verticesNum }, (_, i) => i), false);
        }
        if (this.state.data.selectVerticesBBoxGroup) {
            calculateLimitBBox(this.state.data.selectVerticesBBoxGroup, this.state.data.object.collisionVerticesGroup, this.state.data.selectVerticesIndexs.length);
            calculateAllAverage(this.calculateSelectVerticesBBoxCenterGroup, 2);
        }
        await GPU.copyBufferToArray(this.referenceCoordinatesBuffer, this.selectBBoxForCenterPoint);
    }

    updateActiveAnimation() {
        if (this.externalInputs["オブジェクトのアニメーションキー選択"]) {
            this.state.data.selectAnimation = this.externalInputs["オブジェクトのアニメーションキー選択"];
            managerForDOMs.update(this.state.data.object.animationBlock);
        } else if (this.externalInputs["オブジェクトのアニメーションキー選択"] === null) {
            this.state.data.selectAnimation = null;
            managerForDOMs.update(this.state.data.object.animationBlock);
        }
    }

    async createTransformDataInit() {
        calculateAllAverage(this.calculateSelectVerticesBBoxCenterGroup, 2);
        this.transform.setPointOfEffort(this.selectBBoxForCenterPoint);
        if (this.state.data.selectAnimation) {
            this.transform.init(this.state.data.selectAnimation, this.state.data.selectVerticesIndexs);
        } else {
            this.transform.init(this.state.data.object, this.state.data.selectVerticesIndexs);
        }
        this.transformValueMouseStartPosition = activeView.mouseState.positionForGPU;
        this.transformValue = [0,0];
    }

    cancelTransform() {
        this.transform.cancel();
    }

    async createTransformUndoData() {
        this.addUndoData(this.transform.createUndoData());
    }

    createTranslateTransformData() {
        vec2.add(this.transformValue, this.transformValue, activeView.mouseState.movementForGPU);
        if (keysDown["x"]) {
            vec2.mul(this.transformValue, this.transformValue, [1,0])
        } else if (keysDown["y"]) {
            vec2.mul(this.transformValue, this.transformValue, [0,1])
        }
        this.transform.translate(this.transformValue, "ローカル", editorParameters.smoothType, editorParameters.smoothRadius);
    }

    createResizeTransformData() {
        vec2.div(this.transformValue, vec2.subR(activeView.mouseState.positionForGPU, this.selectBBoxForCenterPoint), vec2.subR(this.transformValueMouseStartPosition, this.selectBBoxForCenterPoint));
        if (keysDown["x"]) {
            vec2.set(this.transformValue, [this.transformValue[0],1])
        } else if (keysDown["y"]) {
            vec2.set(this.transformValue, [1,this.transformValue[1]])
        }
        this.transform.resize(this.transformValue, "ローカル", editorParameters.smoothType, editorParameters.smoothRadius);
    }

    createRotateTransformData() {
        this.transformValue[0] += vec2.getAngularVelocity(this.selectBBoxForCenterPoint, activeView.mouseState.lastPositionForGPU, activeView.mouseState.movementForGPU);
        this.transform.rotate(this.transformValue[0], "ローカル", editorParameters.smoothType, editorParameters.smoothRadius);
    }

    createRotateModifierTransformDataInit() {
        this.state.data.originalVertices = [...this.state.data.object.rotateData];
        this.state.data.referenceCoordinates = [this.state.data.originalVertices[0],this.state.data.originalVertices[1]];
    }

    createRotateModifierTransformData() {
        let transformData = [...this.state.data.originalVertices];
        if (this.state.data.transformType == "move") {
            const movement = activeView.mouseState.positionForGPU;
            transformData[0] = movement[0];
            transformData[1] = movement[1];
        } else if (this.state.data.transformType == "scaling") {
            transformData[2] = vec2.distanceR(activeView.mouseState.positionForGPU, this.state.data.referenceCoordinates) / 512;
        } else if (this.state.data.transformType == "rotate") {
            transformData[3] = vec2.angleAFromB(this.state.data.referenceCoordinates, activeView.mouseState.positionForGPU);
        }
        if (this.state.data.selectAnimation) {
            this.state.data.selectAnimation.transformAnimationData(transformData);
        } else {
            baseTransform(this.state.data.object, transformData);
        }
    }

    async addMesh() {
        const object = this.state.data.object;
        if (object.type == "グラフィックメッシュ") {
            await this.mesh.addMesh(object, this.state.data.selectVerticesIndexs);
        }
    }

    async addVertices() {
        const object = this.state.data.object;
        if (object.type == "ベジェモディファイア") {
            object.addBaseVertices([activeView.mouseState.positionForGPU, vec2.addR(activeView.mouseState.positionForGPU,[100,0]), vec2.addR(activeView.mouseState.positionForGPU,[-100,0])]);
        } else if (object.type == "ボーンモディファイア") {
            if (this.state.data.selectVerticesIndexs.length) {
                if (keysDown["Shift"]) {
                    this.mesh.appendBone(object, Math.floor(this.state.data.selectVerticesIndexs[0] / 2), activeView.mouseState.positionForGPU, vec2.addR(activeView.mouseState.positionForGPU, [0,50]));
                } else {
                    this.mesh.appendBone(object, Math.floor(this.state.data.selectVerticesIndexs[0] / 2), [0,0], activeView.mouseState.positionForGPU, await GPU.getF32BufferPartsData(object.s_baseVerticesPositionBuffer,this.state.data.selectVerticesIndexs[0],2));
                }
            } else {
                this.mesh.appendBone(object, "last", activeView.mouseState.positionForGPU, vec2.addR(activeView.mouseState.positionForGPU, [0,50]));
            }
            this.updateSelectVerticesIndexs([object.verticesNum - 1], false);
        } else if (object.type == "グラフィックメッシュ") {
            this.mesh.appendBaseVertices(object, activeView.mouseState.positionForGPU);
            // this.updateSelectVerticesIndexs([object.verticesNum - 1], false);
        }
    }

    deleteVertices() {
        if (this.state.data.object.type == "ベジェモディファイア") {
            this.state.data.object.subBaseVertices(this.state.data.selectVerticesIndexs);
        }
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
            undoData.data.object.isChange = true;
            GPU.copyBuffer(undoData.data.undo, undoData.data.target);
        } else if (undoData.action == "ウェイトペイント") {
            undoData.data.object.isChange = true;
            GPU.copyBuffer(undoData.data.undo, undoData.data.target);
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
        vec2.sub(activeView.mouseState.movementForGPU, activeView.mouseState.positionForGPU, activeView.mouseState.lastPositionForGPU);
        GPU.writeBuffer(this.mouseBuffer, new Float32Array(activeView.mouseState.positionForGPU));
        let roop = true;
        if (this.structs["all"]) {
            await this.structs["all"].更新関数();
        }
        while (roop) {
            const nowStateStruct = this.structs[this.state.stateID[this.state.stateID.length - 1]];
            // console.log(nowStateStruct, this.state.stateID)
            if (nowStateStruct.更新関数) {
                if (Array.isArray(nowStateStruct.更新関数)) {
                    for (const fn of nowStateStruct.更新関数) {
                        await fn();
                    }
                } else {
                    await nowStateStruct.更新関数();
                }
            }
            let orBool = false; // orを満たすか
            const ステートの管理 = async (data) => {
                let nextStateStrings = data.次のステート;
                for (const ands of data.条件) {
                    let andBool = true; // andを満たすか
                    for (const 条件 of ands) {
                        if (typeof 条件 === 'function') {
                            const result = await 条件();
                            if (result) {
                                if (isPlainObject(result) && "nextState" in result) {
                                    nextStateStrings = result.nextState;
                                }
                            } else {
                                andBool = false;
                                break ;
                            }
                        } else if (条件 == "すぐに") {
                        } else if (条件 == "クリック") {
                            if (!activeView.mouseState.click) {
                                andBool = false;
                                break ;
                            }
                        } else if (条件 == "右クリック") {
                            if (!activeView.mouseState.rightClick) {
                                andBool = false;
                                break ;
                            }
                        } else if (条件 == "ホールド") {
                            if (!activeView.mouseState.hold) {
                                andBool = false;
                                break ;
                            }
                        }  else if (条件 == "!ホールド") {
                            if (activeView.mouseState.hold) {
                                andBool = false;
                                break ;
                            }
                        } else if (条件[0] == "!") {
                            if ((keysDown[条件.slice(1)])) {
                                andBool = false;
                                break ;
                            }
                        } else if (条件[0] == "/") {
                            if (!(keysDown[条件.slice(1)] && !previousKeysDown[条件.slice(1)])) {
                                andBool = false;
                                break ;
                            }
                        } else if (条件.length >= 7 && 条件.slice(0,6) == "input-") {
                            if (!this.externalInputs[条件.slice(6,)]) {
                                andBool = false;
                            }
                        } else if (!keysDown[条件]) {
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
                    if (data.終了関数 && typeof data.終了関数 == "function") {
                        data.終了関数();
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
                        for (const dataName in nextStateStruct.データの構造) {
                            const initData = nextStateStruct.データの構造[dataName]; // データ構造からどうするかを取得
                            if (dataName == "takeOver") { // データを全て引き継ぎ
                                if (initData == "&all&") { // 全て引き継ぐ
                                    for (const dataName_ in this.state.data) {
                                        newData[dataName_] = this.state.data[dataName_];
                                    }
                                }
                            } else {
                                if (isPlainObject(initData) && ("isInclude" in initData) && ("not" in initData)) { // {isInclude: , not: }の場合
                                    // 前のステートデータに含まれているなら
                                    const referenceName = initData.isInclude == "&-" ? dataName : initData.isInclude.slice(1); // "&-"の場合同じ名前のデータを探す
                                    if (referenceName in this.state.data) { // 存在している場合引き継ぐ
                                        newData[dataName] = this.state.data[referenceName];
                                    } else {
                                        newData[dataName] = initData.not;
                                    }
                                } else if (IsString(initData) && initData[0] == "&") { // "&"で始まる場合引き継ぎ
                                    if (initData == "&-") { // "&-1"の場合引き継ぎ
                                        newData[dataName] = this.state.data[dataName];
                                    } else {
                                        newData[dataName] = this.state.data[initData.slice(1)]; // 指定された名前のデータを引き継ぎ
                                    }
                                } else {
                                    newData[dataName] = initData; // 新規作成
                                }
                            }
                        }
                    } else {
                        console.warn("ステートが定義されていません",nextStateStrings,nextState,data,nextStateStruct)
                    }
                    console.log("次のデータ",newData)
                    this.state = {stateID: nextState, data: newData};
                    if (nextStateStruct.初期化関数 && typeof nextStateStruct.初期化関数 === 'function') nextStateStruct.初期化関数();
                    if (!data.ステート変更後ループさせるか) roop = false;
                    console.log("次のステート",this.state)
                    return true;
                }
                return false;
            }
            const ステートのループ = async () => {
                for (const data of nowStateStruct.ステートの更新) {
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
    }
}