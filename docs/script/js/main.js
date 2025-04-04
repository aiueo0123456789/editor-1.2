import { hierarchy } from './ヒエラルキー.js';
import { RenderObjectManager } from './レンダー.js';
import { createGridsObject,gridUpdate  } from "./UI/grid.js";
import { GridInterior, updateDataForUI, updateForUI, View, managerForDOMs, updateLoad } from "./UI/制御.js";
import { StateMachine } from './ステートマシーン/状態遷移.js';
import { renderingParameters } from './レンダリングパラメーター.js';
import { updateObjectFromAnimation } from './オブジェクト/オブジェクトで共通の処理.js';
import { EditorPreference } from './エディタ設定.js';
import { GPU } from './webGPU.js';

// updateLoad("", 100);
updateLoad("test", 100, "test");

const appendModal = document.getElementById("appendModal");
const directories = document.getElementById("directories");
appendModal.classList.add("hidden");

// 構造の作成
const layout =
    {id: "main", type: "w", widthOrHeight: 70, children: [
        {id: "c1", type: "h", widthOrHeight: 70, children: [
            {id: "render-toolbar", type: "", children: []},
            {id: "ui2", type: "w", widthOrHeight: 70, children: [
                {id: "ui2_0", type: "", children: []},
                {id: "ui2_1", type: "", children: []},
            ]},
        ]},
        {id: "ui1", type: "h", widthOrHeight: 40, children: [
            {id: "ui1_0", type: "", children: []},
            {id: "ui1_1", type: "", children: []},
        ]},
    ]};

// 構造からグリッドオブジェクトを作成
createGridsObject(null, layout);

// appをリセットしてグリッドオブジェクトを表示
const appDiv = document.getElementById("app");
appDiv.innerHTML = "";
gridUpdate("app");

const renderAndToolbar = document.getElementById("render-toolbar");

const ui1_0 = document.getElementById("ui1_0");

const ui1_1 = document.getElementById("ui1_1");

const ui2_0 = document.getElementById("ui2_0");
const ui2_1 = document.getElementById("ui2_1");

export const editorParameters = new EditorPreference();
export const stateMachine = new StateMachine();
export const renderObjectManager = new RenderObjectManager();
new GridInterior(ui1_0, "ヒエラルキー");
new GridInterior(ui1_1, "プロパティ");
new GridInterior(ui2_0, "タイムライン");
new GridInterior(ui2_1, "インスペクタ");

export const keysDown = {};
let projectName = "名称未設定";
const projectNameInputTag = document.getElementById("projectName-input");
let loadData = null;

export let activeView = new View(renderAndToolbar);

// 関数モーダルのテスト
function test(a,b,c) {
    console.log("テスト",a,b,c)
}
activeView.addFunctionTranceShelfe(test, [{name: "a", type: {type: "入力", inputType: "文字"}}, {name: "b", type: {type: "入力", inputType: "数字", option: {}}}, {name: "c", type: {type: "選択", choices: ["g", "1", "あ"]}}]);

export function activeViewUpdate(view) {
    activeView = view;
}

async function init() {
    if (loadData.append) {
        for (const data of loadData.objects) {
            hierarchy.addHierarchy("", hierarchy.setSaveObject(data,""));
        }
        loadData = null;
        Object.keys(updateDataForUI).forEach(key => {
            updateDataForUI[key] = true;
        });
        managerForDOMs.allUpdate();
    } else if (loadData.ps) {
        updateLoad("読み込み", 0);
        hierarchy.destroy();
        for (const data of loadData.data.GraphicMesh) {
            if (data.texture) {
                hierarchy.addHierarchy("", hierarchy.setSaveObject(Object.assign({ps: true},data),""));
            }
        }
        console.log(loadData)
        hierarchy.editor.layer.setSaveData(loadData.data.struct);
        updateLoad("読み込み", 60);
        // hierarchy.setHierarchy(loadData.hierarchy);
        loadData = null;
        updateLoad("読み込み", 70);
        Object.keys(updateDataForUI).forEach(key => {
            updateDataForUI[key] = true;
        });
        updateLoad("読み込み", 80);
        managerForDOMs.allUpdate();
        updateLoad("読み込み", 100);
        console.log(hierarchy)
    } else {
        updateLoad("読み込み", 0);
        hierarchy.destroy();
        for (const data of loadData.modifiers) {
            hierarchy.setSaveObject(data,"");
        }
        for (const data of loadData.bezierModifiers) {
            hierarchy.setSaveObject(data,"");
        }
        for (const data of loadData.rotateModifiers) {
            hierarchy.setSaveObject(data,"");
        }
        for (const data of loadData.boneModifiers) {
            hierarchy.setSaveObject(data,"");
        }
        for (const data of loadData.graphicMeshs) {
            hierarchy.setSaveObject(data,"");
        }
        for (const data of loadData.animationCollectors) {
            hierarchy.setSaveObject(data,"");
        }
        updateLoad("読み込み", 60);
        hierarchy.setHierarchy(loadData.hierarchy);
        loadData.attachments = [
            {
                // type: "行列コピー",
                type: "ボーン追従",
                target: {object: "vRTze5673ffMCNPT", boneIndex: 0},
                source: {object: "ajRgB51r4iDQTCS9", boneIndex: 32},
            },
            // {
            //     type: "行列コピー",
            //     target: {object: "oz3KO5BnvB0Nr95d", boneIndex: 0},
            //     source: {object: "ajRgB51r4iDQTCS9", boneIndex: 32},
            // },
            {
                type: "ボーン追従",
                target: {object: "oz3KO5BnvB0Nr95d", boneIndex: 0},
                source: {object: "ajRgB51r4iDQTCS9", boneIndex: 32},
            },
            {
                type: "ボーン追従",
                target: {object: "fTt6iJ1ahSIyxAbI", boneIndex: 0},
                source: {object: "ajRgB51r4iDQTCS9", boneIndex: 1},
            },
        ];
        for (const data of loadData.attachments) {
            if (data.type == "行列コピー") {
                const target = hierarchy.searchObjectFromID(data.target.object).editor.getBoneFromIndex(data.target.boneIndex);
                const source = hierarchy.searchObjectFromID(data.source.object).editor.getBoneFromIndex(data.source.boneIndex);
                console.log(target,source)
                const attachment = hierarchy.searchObjectFromID(data.target.object).attachments.append(data.type, {targetBone: target});
                console.log(attachment)
                attachment.editor.setSourceBone(source);
            } else if (data.type == "ボーン追従") {
                const target = hierarchy.searchObjectFromID(data.target.object).editor.getBoneFromIndex(data.target.boneIndex);
                const source = hierarchy.searchObjectFromID(data.source.object).editor.getBoneFromIndex(data.source.boneIndex);
                console.log(target,source)
                const attachment = hierarchy.searchObjectFromID(data.target.object).attachments.append(data.type, {targetBone: target});
                console.log(attachment)
                attachment.editor.setSourceBone(source);
            }
        }
        loadData = null;
        updateLoad("読み込み", 70);
        Object.keys(updateDataForUI).forEach(key => {
            updateDataForUI[key] = true;
        });
        updateLoad("読み込み", 80);
        managerForDOMs.allUpdate();
        updateLoad("読み込み", 100);
        console.log(hierarchy)
    }
    update();
}

async function update() {
    if (loadData) {
        init();
    } else {
        await stateMachine.stateUpdate();
        // 表示順番の再計算
        hierarchy.updateRenderingOrder(100);
        if (renderingParameters.isReplay) {
            hierarchy.updateAnimation(renderingParameters.keyfarameCount);
        }
        hierarchy.updateManagers();
        hierarchy.runHierarchy();
        // 編集中のobjectを特別処理
        if (stateMachine.state.data.selectAnimation) {
            // console.log("特別処理")
            updateObjectFromAnimation(stateMachine.state.data.activeObject, stateMachine.state.data.selectAnimation);
        }
        for (const object of hierarchy.allObject) {
            object.isChange = false;
        }
        updateForUI();
        renderingParameters.updateKeyfarameCount();
        requestAnimationFrame(update);
    }
}

update();

// キーのダウンを検知
document.addEventListener('keydown', (event) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    console.log(event.key,"down")
    if (isCtrlOrCmd && event.key === 'z') {
        if (event.shiftKey) {
            keysDown["redo"] = true;
        } else {
            keysDown["undo"] = true;
        }
        event.preventDefault(); // デフォルトの動作を防ぐ場合
    } else if (isCtrlOrCmd && event.key == "s") {
        save();
        event.preventDefault(); // デフォルトの動作を防ぐ場合
    } else {
        keysDown[event.key] = true;
        if (event.key === "Tab" || event.key === "Shift" || event.key === "Meta") {
            // デフォルト動作を無効化
            event.preventDefault();
            console.log(event.key,"のデフォルト動作を無効化しました");
        }
    }
});

// キーのアップを検知
document.addEventListener('keyup',(event) => {
    keysDown[event.key] = false;
    console.log(event.key,"up")
});

async function save() {
    updateLoad("書き出し", 0);
    // JSONデータを作成
    const data = {};
    data.hierarchy = hierarchy.getSaveData();
    data.graphicMeshs =
        await Promise.all(
            hierarchy.graphicMeshs.map(graphicMeshs => {
                return graphicMeshs.getSaveData(); // Promise を返す
            })
        );
    updateLoad("書き出し", 40);
    data.modifiers =
        await Promise.all(
            hierarchy.modifiers.map(modifier => {
                return modifier.getSaveData(); // Promise を返す
            })
        );
    updateLoad("書き出し", 50);
    data.bezierModifiers =
        await Promise.all(
            hierarchy.bezierModifiers.map(modifier => {
                return modifier.getSaveData(); // Promise を返す
            })
        );
    updateLoad("書き出し", 60);
    data.rotateModifiers =
        await Promise.all(
            hierarchy.rotateModifiers.map(modifier => {
                return modifier.getSaveData(); // Promise を返す
            })
        );
    updateLoad("書き出し", 70);
    data.boneModifiers =
        await Promise.all(
            hierarchy.boneModifiers.map(modifier => {
                return modifier.getSaveData(); // Promise を返す
            })
        );
    updateLoad("書き出し", 80);
    data.animationCollectors =
        await Promise.all(
            hierarchy.animationCollectors.map(animationCollector => {
                return animationCollector.getSaveData(); // Promise を返す
            })
        );
    updateLoad("書き出し", 90);

    // JSONデータを文字列化
    const jsonString = JSON.stringify(data, null, 2);
    // Blobを作成
    const blob = new Blob([jsonString], { type: "application/json" });
    updateLoad("書き出し", 95);
    // ダウンロード用のリンクを作成
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    // a.download = `${projectName}.json`;
    a.download = `${projectName}.anm`;
    // リンクをクリックしてダウンロードを開始
    a.click();
    updateLoad("書き出し", 100);
    // メモリ解放
    URL.revokeObjectURL(a.href);
}

// セーブ
document.getElementById("save-btn").addEventListener("click", () => {
    save();
});

// 他のファイルから追加
document.getElementById("file-append-btn").addEventListener("change", (event) => {
    console.log("発火")
    const file = event.target.files[0]; // 選択したファイルを取得
    const fileType = file.name.split(".").slice(-1)[0];
    if (file && (fileType === "json" || fileType === "anm")) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                // JSONの内容をパースする
                const fileData = JSON.parse(e.target.result);
                const path = [];
                console.log(fileData)
                appendModal.classList.remove("hidden");

                const reset = () => {
                    directories.replaceChildren();
                    const createDirectory = (children, depth = 0) => {
                        const directoryDOM = document.createElement("ul");
                        directoryDOM.classList.add("directory");
                        directories.append(directoryDOM);
                        const createChild = (title,id) => {
                            const li = document.createElement("li");
                            li.textContent = title;
                            if (path[depth] && path[depth].includes(id)) {
                                li.classList.add("activeColor")
                            }
                            li.addEventListener("click", () => {
                                if (keysDown["Shift"]) {
                                    if (path[depth]) {
                                        path[depth].push(id);
                                    } else {
                                        path[depth] = [id];
                                    }
                                } else {
                                    path[depth] = [id];
                                }
                                path.splice(depth + 1); // 以降を削除
                                console.log(path);
                                reset();
                            })
                            directoryDOM.append(li);
                        }
                        if (Array.isArray(children)) {
                            for (let i = 0; i < children.length; i ++) {
                                const child = children[i];
                                if (child.name) {
                                    createChild(child.name, i);
                                } else {
                                    createChild(child, i);
                                }
                            }
                        } else {
                            for (const childName in children) {
                                createChild(childName, childName);
                            }
                        }
                        if (path.length > depth && path[depth].length <= 1) { // pathの長さを深さが超えたら止める
                            createDirectory(children[path[depth][0]],depth + 1);
                        }
                    }
                    createDirectory(fileData);
                }

                reset();

                document.getElementById("appendModal-appendBtn").addEventListener("click", () => {
                    let data = fileData;
                    const objects = [];
                    for (const ids of path) {
                        if (ids.length == 1) {
                            data = data[ids[0]];
                        } else {
                            for (const id of ids) {
                                objects.push(data[id]);
                            }
                        }
                    }
                    loadData = {append: true, objects: objects};
                    appendModal.classList.add("hidden");
                    event.target.value = ""; // 選択をリセット
                })
            } catch (error) {
                console.error("JSONの解析に失敗しました:", error);
            }
        };
        reader.onerror = function() {
            console.error("ファイルの読み込みに失敗しました");
        };
        // ファイルをテキストとして読み込む
        reader.readAsText(file);
    } else {
        console.error("選択したファイルはJSONではありません");
    }
});

// .anmまたは.jsonから読み込む
document.getElementById("open-btn").addEventListener("change", (event) => {
    const file = event.target.files[0]; // 選択したファイルを取得
    console.log(file.name)
    const fileType = file.name.split(".").slice(-1)[0];
    if (file && (fileType === "json" || fileType === "anm")) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                // JSONの内容をパースする
                projectName = file.name.split(".")[0];
                projectNameInputTag.value = projectName;
                loadData = JSON.parse(e.target.result);
            } catch (error) {
                console.error("JSONの解析に失敗しました:", error);
            }
        };
        reader.onerror = function() {
            console.error("ファイルの読み込みに失敗しました");
        };
        // ファイルをテキストとして読み込む
        reader.readAsText(file);
    } else {
        console.error("選択したファイルはJSONではありません");
    }
});

// フォトショップから読み込む
document.getElementById('ps-open-btn').addEventListener('change', (event) => {
    const files = event.target.files;
    // 画像とJSONファイルを格納する配列
    const images = {};
    const jsonFiles = [];
    // ファイルを非同期で処理
    Promise.all(Array.from(files).map(file => {
        // ファイルの拡張子を取得
        const extension = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
            // 画像ファイルの処理
            return GPU.imageFileToTexture2D(file).then(texture => {
                images[file.name] = texture;
            });
        } else if (extension === 'json') {
            // JSONファイルの処理
            return readTextFile(file).then(jsonText => {
                try {
                    const jsonData = JSON.parse(jsonText);
                    jsonFiles.push(jsonData);
                } catch (e) {
                    console.error(`JSONパースエラー (${file.name}):`, e);
                }
            });
        } else {
            // 対象外のファイルタイプは何もしない
            return Promise.resolve();
        }
    })).then(() => {
        // ここで画像やJSONデータを使った処理を行う
        const data = jsonFiles[0];
        const layers = data.GraphicMesh;
        for (let i = 0; i < layers.length; i ++) {
            const layer = layers[i];
            if (images[layer.imagePath]) {
                layer.texture = images[layer.imagePath].texture;
                layer.zIndex = layers.length - i;
            }
        }
        loadData = {ps: true, data: data};
        console.log('画像ファイル:', images);
        console.log('JSONファイル:', jsonFiles);
    }).catch(error => {
        console.error('エラー:', error);
    });
});
// テキストファイル（JSON）を読み込む関数
function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            resolve(event.target.result); // テキストデータ
        };
        reader.onerror = function(error) {
            reject(error);
        };
        reader.readAsText(file);
    });
}

projectNameInputTag.addEventListener("change", async (event) => {
    projectName = event.target.value;
});