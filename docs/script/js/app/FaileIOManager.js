import { Application } from "../app.js";
import { managerForDOMs } from "../UI/制御.js";

// 入力を受け取って指示を出す
export class FaileIOManager {
    constructor(/** @type {Application} */app) {
        this.app = app;
    }

    // セーブデータを読み込み
    loadFile(json) {
        // オブジェクトの追加
        // this.app.scene.destroy();
        if (json.ps) { // psフォルダのアップロードの場合
            for (const data of json.data.GraphicMesh) {
                if (data.texture) {
                    this.app.hierarchy.addHierarchy("", this.app.scene.objects.createObjectAndSetUp({saveData: data}));
                }
            }
        } else {
            console.log(json)
            for (const objectType of ["bezierModifiers", "armatures", "graphicMeshs", "animationCollectors"]) { // rotateModifiersはロードしない
                for (const data of json.scene[objectType]) {
                    this.app.scene.objects.createObjectAndSetUp({saveData: data});
                }
            }
            // ヒエラルキーを構築
            this.app.hierarchy.setHierarchy(json.hierarchy);
        }
        managerForDOMs.allUpdate();
        console.log(this.app)
    }

    async save() {
        // JSONデータを作成
        const data = await this.app.getSaveData();
        console.log(data)
        // JSONデータを文字列化
        const jsonString = JSON.stringify(data, null, 2);
        // Blobを作成
        const blob = new Blob([jsonString], { type: "application/json" });
        // ダウンロード用のリンクを作成
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${this.app.appConfig.projectName}.anm`;
        // リンクをクリックしてダウンロードを開始
        a.click();
        // メモリ解放
        URL.revokeObjectURL(a.href);
    }
}