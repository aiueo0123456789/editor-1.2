import { app } from './app.js';
import { managerForDOMs, updateLoad } from "./UI/制御.js";
import { GPU } from './webGPU.js';

// updateLoad("", 100);
updateLoad("test", 100, "test");

const appendModal = document.getElementById("appendModal");
const directories = document.getElementById("directories");
appendModal.classList.add("hidden");

export const mouseEvent = {};
let projectName = "名称未設定";
const projectNameInputTag = document.getElementById("projectName-input");
let loadData = null;

export let activeView = null;

async function init() {
    if (loadData.append) {
        for (const data of loadData.objects) {
            app.hierarchy.addHierarchy("", app.hierarchy.setSaveObject(data,""));
        }
        loadData = null;
        managerForDOMs.allUpdate();
    } else if (loadData.ps) {
        updateLoad("読み込み", 0);
        app.hierarchy.destroy();
        for (const data of loadData.data.GraphicMesh) {
            if (data.texture) {
                app.hierarchy.addHierarchy("", app.hierarchy.setSaveObject(Object.assign({ps: true},data),""));
            }
        }
        console.log(loadData)
        app.hierarchy.editor.layer.setSaveData(loadData.data.struct);
        updateLoad("読み込み", 60);
        // hierarchy.setHierarchy(loadData.hierarchy);
        loadData = null;
        updateLoad("読み込み", 70);
        updateLoad("読み込み", 80);
        managerForDOMs.allUpdate();
        updateLoad("読み込み", 100);
        console.log(app.hierarchy)
    } else {
        updateLoad("読み込み", 0);
        app.hierarchy.destroy();
        for (const data of loadData.bezierModifiers) {
            app.hierarchy.setSaveObject(data,"");
        }
        for (const data of loadData.rotateModifiers) {
            app.hierarchy.setSaveObject(data,"");
        }
        for (const data of loadData.boneModifiers) {
            app.hierarchy.setSaveObject(data,"");
        }
        for (const data of loadData.graphicMeshs) {
            app.hierarchy.setSaveObject(data,"");
        }
        for (const data of loadData.animationCollectors) {
            app.hierarchy.setSaveObject(data,"");
        }
        updateLoad("読み込み", 60);
        app.hierarchy.setHierarchy(loadData.hierarchy);
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
                const target = app.scene.searchObjectFromID(data.target.object).editor.getBoneFromIndex(data.target.boneIndex);
                const source = app.scene.searchObjectFromID(data.source.object).editor.getBoneFromIndex(data.source.boneIndex);
                console.log(target,source)
                const attachment = app.scene.searchObjectFromID(data.target.object).attachments.append(data.type, {targetBone: target});
                console.log(attachment)
                attachment.editor.setSourceBone(source);
            } else if (data.type == "ボーン追従") {
                const target = app.scene.searchObjectFromID(data.target.object).editor.getBoneFromIndex(data.target.boneIndex);
                const source = app.scene.searchObjectFromID(data.source.object).editor.getBoneFromIndex(data.source.boneIndex);
                console.log(target,source)
                const attachment = app.scene.searchObjectFromID(data.target.object).attachments.append(data.type, {targetBone: target});
                console.log(attachment)
                attachment.editor.setSourceBone(source);
            }
        }
        loadData = null;
        updateLoad("読み込み", 70);
        updateLoad("読み込み", 80);
        managerForDOMs.allUpdate();
        updateLoad("読み込み", 100);
        console.log(app.hierarchy)
    }
    update();
}

// マウスイベント管理
document.addEventListener("mousedown", (e) => {
    mouseEvent.down = true;
    mouseEvent.click = true;
    mouseEvent.clickPosition = [e.clientX,e.clientY];
    mouseEvent.movement = [e.movementX,e.movementY];
})
document.addEventListener("mouseup", (e) => {
    mouseEvent.down = false;
    mouseEvent.position = [e.clientX,e.clientY];
})

async function save() {
    updateLoad("書き出し", 0);
    // JSONデータを作成
    const data = await app.getSaveData();
    console.log(data)

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
                                if (app.input.keysDown["Shift"]) {
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
                app.fileIO.loadFile(JSON.parse(e.target.result));
                // init();
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