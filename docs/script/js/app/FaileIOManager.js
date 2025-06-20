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
                    this.app.hierarchy.addHierarchy("", this.app.scene.objects.createObject({saveData: data}));
                }
            }
        } else {
            for (const objectType of ["modifiers", "bezierModifiers", "armatures", "graphicMeshs", "animationCollectors"]) { // rotateModifiersはロードしない
                for (const data of json.scene[objectType]) {
                    this.app.scene.objects.createObject({saveData: data});
                }
            }
            // ヒエラルキーを構築
            this.app.hierarchy.setHierarchy(json.hierarchy);
    
            // ボーンのアタッチメント
            json.attachments = [
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
            // for (const data of json.attachments) {
            //     if (data.type == "行列コピー") {
            //         const target = this.app.scene.searchObjectFromID(data.target.object).editor.getBoneFromIndex(data.target.boneIndex);
            //         const source = this.app.scene.searchObjectFromID(data.source.object).editor.getBoneFromIndex(data.source.boneIndex);
            //         // console.log(target,source)
            //         const attachment = this.app.scene.searchObjectFromID(data.target.object).attachments.append(data.type, {targetBone: target});
            //         // console.log(attachment)
            //         attachment.editor.setSourceBone(source);
            //     } else if (data.type == "ボーン追従") {
            //         const target = this.app.scene.searchObjectFromID(data.target.object).editor.getBoneFromIndex(data.target.boneIndex);
            //         const source = this.app.scene.searchObjectFromID(data.source.object).editor.getBoneFromIndex(data.source.boneIndex);
            //         // console.log(target,source)
            //         const attachment = this.app.scene.searchObjectFromID(data.target.object).attachments.append(data.type, {targetBone: target});
            //         // console.log(attachment)
            //         attachment.editor.setSourceBone(source);
            //     }
            // }
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