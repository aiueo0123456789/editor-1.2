// 入力を受け取って指示を出す
export class InputManager {
    constructor(app) {
        this.app = app;
    }

    // セーブデータを読み込み
    loadFile(json) {
        // オブジェクトの追加
        this.app.scene.destroy();
        for (const objectType of ["modifiers", "bezierModifiers", "boneModifiers", "graphicMeshs", "animationCollectors"]) { // rotateModifiersはロードしない
            for (const data of json.scene[objectType]) {
                this.app.scene.createObject({saveData: data});
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
        for (const data of json.attachments) {
            if (data.type == "行列コピー") {
                const target = this.app.scene.searchObjectFromID(data.target.object).editor.getBoneFromIndex(data.target.boneIndex);
                const source = this.app.scene.searchObjectFromID(data.source.object).editor.getBoneFromIndex(data.source.boneIndex);
                // console.log(target,source)
                const attachment = this.app.scene.searchObjectFromID(data.target.object).attachments.append(data.type, {targetBone: target});
                // console.log(attachment)
                attachment.editor.setSourceBone(source);
            } else if (data.type == "ボーン追従") {
                const target = this.app.scene.searchObjectFromID(data.target.object).editor.getBoneFromIndex(data.target.boneIndex);
                const source = this.app.scene.searchObjectFromID(data.source.object).editor.getBoneFromIndex(data.source.boneIndex);
                // console.log(target,source)
                const attachment = this.app.scene.searchObjectFromID(data.target.object).attachments.append(data.type, {targetBone: target});
                // console.log(attachment)
                attachment.editor.setSourceBone(source);
            }
        }
        console.log(this.app)
    }
}