import { Application } from "../app.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { isFunction } from "../../utils/utility.js";

// 入力を受け取って指示を出す
export class FaileIOManager {
    constructor(/** @type {Application} */app) {
        this.app = app;
    }

    // セーブデータを読み込み
    loadFile(json) {
        this.app.scene.reset();
        console.log(this.app)
        console.log("実際に送られたデータ",json)
        if (json.ww) { // psフォルダのアップロードの場合
            for (const data of json.data.textures) {
                this.app.scene.outliner.append(this.app.scene.objects.createObjectAndSetUp(data), this.app.scene.outliner.textures);
            }
            for (const data of json.data.graphicMeshs) {
                this.app.scene.outliner.append(this.app.scene.objects.createObjectAndSetUp(data), this.app.scene.outliner.objects);
            }
        } else {
            console.log(json)
            for (const objectType of ["scripts", "particles", "bezierModifiers", "armatures", "graphicMeshs", "animationCollectors"]) { // rotateModifiersはロードしない
                for (const data of json.scene[objectType]) {
                    this.app.scene.objects.createObjectAndSetUp(data);
                }
            }
            // オブジェクト同士の参照を解決
            for (const object of this.app.scene.objects.allObject) {
                if (isFunction(object.resolvePhase)) {
                    object.resolvePhase();
                }
            }
            // ヒエラルキーを構築
            this.app.scene.outliner.set(json.scene.outliner);
            // this.app.scene.outliner.set(json.outliner);
        }
        managerForDOMs.allUpdate();
        console.log(this.app)
    }

    async save() {
        const zip = new JSZip();
        const data = await this.app.scene.getSaveData();
        // フォルダを作成
        const texturesFolder = zip.folder("textures");

        // 画像をフォルダに追加
        data.sceen.textures.forEach(texture => {
            texturesFolder.file(`${texture.id}.png`, texture.texture, { binary: true });
            texture.texture = "";
        });

        // JSONを追加
        zip.file("data.json", JSON.stringify(data.json));

        // ZIP生成
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${this.app.appConfig.projectName}.zip`;
        a.click(); // 自動クリックでダウンロード開始
        // メモリ解放
        URL.revokeObjectURL(url);
    }
}