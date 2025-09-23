import { Area } from "../../ui/area/Area.js";
import { CreatorForUI } from "../../utils/ui/creatorForUI.js";
import { AutoGrid } from "../../utils/ui/grid.js";
import { createID } from "../../utils/ui/util.js";
import { changeParameter, indexOfSplice } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";
import { Application } from "../app.js";

export class UI {
    constructor(/** @type {Application} */ app) {
        this.app = app;

        this.creatorForUI = new CreatorForUI();
        this.creatorForUI.create(
            app.dom,
            {
                inputObject: {"app": app},
                DOM: [
                    {type: "html", id: "contextmenu", class: "contextmenu hidden", tag: "ul"},
                    {type: "html", id: "custom-menu-items", class: "custom-menu-items hidden", tag: "ul"},
                    {type: "html", id: "custom-select-items", class: "custom-select-items hidden", tag: "ul"},
                    {type: "div", id: "headMenubar", class: "menubar", children: [
                        {type: "input", label: "プロジェクト名", withObject: "app/appConfig/projectName", options: {type: "text"}},
                        {type: "button", look: {type: "string", text: "セーブ"}, submitFunction: () => {
                            app.fileIO.save();
                        }},
                        {type: "input", id: "open-btn", labelIn: "開く", options: {type: "file"}},
                        {type: "input", id: "ww-open-btn", labelIn: "開く2", options: {type: "file",  webkitdirectory: true, directory: true, multiple: true}},
                        {type: "html", id: "workSpaces", style: "width: 100%; display: flex; gap: 10px; alignItems: center; overflowX: auto;", tag: "div"},
                    ]},
                    {type: "html", id: "main", class: "main", tag: "div"},
                    {type: "div", id: "headMenubar", class: "menubar", children: [
                        // {type: "meter", label: "メモリ", valueSource: "app/appPerformance/usedJSHeapByteSize", maxSource: "app/appPerformance/jsHeapByteSizeLimit"},
                        {type: "meter", label: "メモリ", valueSource: "app/appPerformance/usedJSHeapByteSize", maxSource: "app/appPerformance/totalJSHeapByteSize"},
                        {type: "input", label: "DOM数", withObject: "app/appPerformance/domCount", options: {type: "number"}},
                    ]}
                ]
            },
            {
                class: "all",
            }
        );
        this.header = this.creatorForUI.getDOMFromID("headMenubar");
        console.log(this.creatorForUI.getDOMFromID("custom-select-items"));

        const appendModal = document.getElementById("appendModal");
        const directories = document.getElementById("directories");
        appendModal.classList.add("hidden");

        // 他のファイルから追加
        // document.getElementById("file-append-btn").addEventListener("change", (event) => {
        //     console.log("発火")
        //     const file = event.target.files[0]; // 選択したファイルを取得
        //     const fileType = file.name.split(".").slice(-1)[0];
        //     if (file && (fileType === "json" || fileType === "anm")) {
        //         const reader = new FileReader();
        //         reader.onload = function(e) {
        //             try {
        //                 // JSONの内容をパースする
        //                 const fileData = JSON.parse(e.target.result);
        //                 const path = [];
        //                 console.log(fileData)
        //                 appendModal.classList.remove("hidden");

        //                 const reset = () => {
        //                     directories.replaceChildren();
        //                     const createDirectory = (children, depth = 0) => {
        //                         const directoryDOM = document.createElement("ul");
        //                         directoryDOM.classList.add("directory");
        //                         directories.append(directoryDOM);
        //                         const createChild = (title,id) => {
        //                             const li = document.createElement("li");
        //                             li.textContent = title;
        //                             if (path[depth] && path[depth].includes(id)) {
        //                                 li.classList.add("activeColor")
        //                             }
        //                             li.addEventListener("click", () => {
        //                                 if (app.input.keysDown["Shift"]) {
        //                                     if (path[depth]) {
        //                                         path[depth].push(id);
        //                                     } else {
        //                                         path[depth] = [id];
        //                                     }
        //                                 } else {
        //                                     path[depth] = [id];
        //                                 }
        //                                 path.splice(depth + 1); // 以降を削除
        //                                 console.log(path);
        //                                 reset();
        //                             })
        //                             directoryDOM.append(li);
        //                         }
        //                         if (Array.isArray(children)) {
        //                             for (let i = 0; i < children.length; i ++) {
        //                                 const child = children[i];
        //                                 if (child.name) {
        //                                     createChild(child.name, i);
        //                                 } else {
        //                                     createChild(child, i);
        //                                 }
        //                             }
        //                         } else {
        //                             for (const childName in children) {
        //                                 createChild(childName, childName);
        //                             }
        //                         }
        //                         if (path.length > depth && path[depth].length <= 1) { // pathの長さを深さが超えたら止める
        //                             createDirectory(children[path[depth][0]],depth + 1);
        //                         }
        //                     }
        //                     createDirectory(fileData);
        //                 }

        //                 reset();

        //                 document.getElementById("appendModal-appendBtn").addEventListener("click", () => {
        //                     let data = fileData;
        //                     const objects = [];
        //                     for (const ids of path) {
        //                         if (ids.length == 1) {
        //                             data = data[ids[0]];
        //                         } else {
        //                             for (const id of ids) {
        //                                 objects.push(data[id]);
        //                             }
        //                         }
        //                     }
        //                     loadData = {append: true, objects: objects};
        //                     appendModal.classList.add("hidden");
        //                     event.target.value = ""; // 選択をリセット
        //                 })
        //             } catch (error) {
        //                 console.error("JSONの解析に失敗しました:", error);
        //             }
        //         };
        //         reader.onerror = function() {
        //             console.error("ファイルの読み込みに失敗しました");
        //         };
        //         // ファイルをテキストとして読み込む
        //         reader.readAsText(file);
        //     } else {
        //         console.error("選択したファイルはJSONではありません");
        //     }
        // });

        // .anmまたは.jsonから読み込む
        this.creatorForUI.getDOMFromID("open-btn").addEventListener("change", (event) => {
            const file = event.target.files[0]; // 選択したファイルを取得
            console.log(file.name)
            const fileType = file.name.split(".").slice(-1)[0];
            if (file && (fileType === "json" || fileType === "anm")) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        // JSONの内容をパースする
                        changeParameter(app.appConfig, "projectName", file.name.split(".")[0]);
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
        this.creatorForUI.getDOMFromID('ww-open-btn').addEventListener('change', (event) => {
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
                console.log('画像ファイル:', images);
                console.log('JSONファイル:', jsonFiles);
                const data = jsonFiles[0];
                const submitData = data;
                for (const texture of submitData.textures) {
                    texture.texture = images[`${texture.id}.png`].texture;
                }
                app.fileIO.loadFile({ww: true, data: submitData});
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
    }

    createArea(axis, target = this.creatorForUI.getDOMFromID("main")) { // エリアの作成
        const area = new AutoGrid(createID(), target, axis, 50);
        this.app.areaMap.set(area, []);
        return area;
    }

    setAreaType(t, type) {
        const area_dom = document.createElement("div");
        area_dom.style.width = "100%";
        area_dom.style.height = "100%";
        const area = new Area(type,area_dom);
        this.app.areas.push(area);
        t.append(area_dom);
    }

    deleteArea(/** @type {Area} */area) {
        area.target.replaceChildren();
        /** @type {AutoGrid} */
        const grid = area.grid;
        const gridInnner = this.areaMap.get(grid);
        indexOfSplice(gridInnner, area);
        grid.target.replaceChildren();
        if (gridInnner.length) {
            grid.target.append(gridInnner[0].target);
        }
        indexOfSplice(this.areas, area);
        this.app.areaMap.delete(area);
    }
}