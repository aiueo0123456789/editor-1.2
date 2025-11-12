import { Application } from "../app.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { changeParameter, isFunction } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";

// 入力を受け取って指示を出す
export class FaileIOManager {
    constructor(/** @type {Application} */app) {
        this.app = app;
    }

    // セーブデータを読み込み
    async loadFile(file, dataType) {
        this.app.updateStop("load");
        this.app.scene.reset();
        const loadingModalID = this.app.ui.createLodingModal("ロード");
        this.app.ui.updateLoadingModal(loadingModalID,0,"読み込み開始");
        if (dataType == "ww") { // psフォルダのアップロードの場合
            for (const data of file.data.textures) {
                this.app.scene.objects.createObjectAndSetUp(data);
            }
            for (const data of file.data.graphicMeshs) {
            }
        } else {
            changeParameter(this.app.appConfig, "projectName", file.name.split(".")[0]);
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            // json
            const json = JSON.parse(await zip.file("data.json").async("string"));
            console.log(json)
            this.app.ui.updateLoadingModal(loadingModalID,10,"jsonの読み込み");

            // textures
            const texturesFolder = zip.folder("textures");
            const promises = [];
            let completedTextures = 0;
            texturesFolder.forEach((relativePath, image) => {
                // const match = image.name.match(/^textures\/(.+)\.raw$/);
                const match = image.name.match(/^textures\/(.+)\.png$/);
                if (match) {
                    for (const texture of json.scene.objects.textures) {
                        if (texture.id == match[1]) {
                            const p = (async () => {
                                // const startTime = Date.now(); // 開始時間
                                // const raw = await image.async("uint8array");
                                // const lap1Time = Date.now(); // 開始時間
                                // texture.texture = GPU.rawToTexture(raw, texture.meta);
                                // const lap2Time = Date.now(); // 開始時間
                                const startTime = Date.now(); // 開始時間
                                const blob = await image.async("blob");
                                const lap1Time = Date.now(); // 開始時間
                                texture.texture = await GPU.blobToTexture(blob);
                                const lap2Time = Date.now(); // 開始時間
                                console.log(`${match[1]} 合計: ${lap2Time - startTime} lap1: ${lap1Time - startTime} lap2: ${lap2Time - lap1Time}`);
                                completedTextures ++;
                                this.app.ui.updateLoadingModal(loadingModalID,10 + (40 * (completedTextures / promises.length)), `${match[1]}の読み込み`);
                            })();
                            promises.push(p);
                        }
                    }
                }
            });
            // 全部終わるまで待つ
            await Promise.all(promises);
            this.app.ui.updateLoadingModal(loadingModalID,50,"テクスチャの読み込み完了");

            console.log(json)
            const objectTypes = ["maskTextures", "textures", "scripts", "particles", "bezierModifiers", "armatures", "graphicMeshs", "blendShapes", "keyframeBlocks", "parameterManagers"];
            for (const objectType of objectTypes) {
                for (const objectData of json.scene.objects[objectType]) {
                    this.app.scene.objects.createObjectAndSetUp(objectData);
                }
                this.app.ui.updateLoadingModal(loadingModalID,50 + (40 * (objectTypes.indexOf(objectType) / objectTypes.length)), `${objectType}のデータをセット`);
            }
            this.app.ui.updateLoadingModal(loadingModalID,90, "オブジェクトのセット完了");
            // オブジェクト同士の参照を解決
            for (const object of this.app.scene.objects.allObject) {
                if (isFunction(object.resolvePhase)) object.resolvePhase();
            }
            this.app.ui.updateLoadingModal(loadingModalID,95, "オブジェクト同士の参照を解決");
            // ヒエラルキーを構築
            changeParameter(this.app.scene, "frame_speed", json.scene.frame_speed);
            changeParameter(this.app.scene, "frame_start", json.scene.frame_start);
            changeParameter(this.app.scene, "frame_end", json.scene.frame_end);
            this.app.ui.updateLoadingModal(loadingModalID, 100, "完了");
        }
        // managerForDOMs.allUpdate();
        this.app.ui.removeLodingModal(loadingModalID);
        this.app.updateStopCancel("load");
    }

    async save() {
        this.app.updateStop("save");
        const zip = new JSZip();
        const data = await this.app.scene.getSaveData();
        // フォルダを作成
        const texturesFolder = zip.folder("textures");

        // 画像をフォルダに追加
        data.scene.objects.textures.forEach(texture => {
            // texturesFolder.file(`${texture.id}.raw`, texture.texture, { binary: true });
            texturesFolder.file(`${texture.id}.png`, texture.texture, { binary: true });
            texture.texture = "";
        });

        // JSONを追加
        zip.file("data.json", JSON.stringify(data));
        // ZIP生成
        const blob = await zip.generateAsync({ type: "blob", compression: "STORE" }, // 圧縮しない
            (metadata) => {
                console.log(`progress: ${metadata.percent.toFixed(2)} %`);
            }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${this.app.appConfig.projectName}.zip`;
        a.click(); // 自動クリックでダウンロード開始
        // メモリ解放
        URL.revokeObjectURL(url);
        this.app.updateStopCancel("save");
    }
}