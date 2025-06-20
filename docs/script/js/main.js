import { app } from './app.js';
import { managerForDOMs, updateLoad } from "./UI/制御.js";
import { GPU } from './webGPU.js';

updateLoad("test", 100, "test");

const appendModal = document.getElementById("appendModal");
const directories = document.getElementById("directories");
appendModal.classList.add("hidden");

export const mouseEvent = {};
const projectNameInputTag = document.getElementById("projectName-input");

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

// セーブ
document.getElementById("save-btn").addEventListener("click", () => {
    app.fileIO.save();
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
        app.fileIO.loadFile({ps: true, data: data});
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
    app.appConfig.projectName = event.target.value;
});