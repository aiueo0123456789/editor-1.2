export class ViewerSpaceData {
    constructor() {
        this.mode = "オブジェクト";
        this.modes = {
            "": ["オブジェクト"],
            "グラフィックメッシュ": ["オブジェクト","メッシュ編集","頂点メーション編集"],
            "ボーンモディファイア": ["オブジェクト","ボーン編集", "ボーンアニメーション編集"],
            "ベジェモディファイア": ["オブジェクト","ベジェ編集", "頂点アニメーション編集"],
        };
        this.tools = ["select", "move", "resize", "rotate", "remove", "append"];
        this.useTool = "select";
        this.smooth = false;
    }

    createModeSelectList() {
        const result = [];
        result.push("オブジェクト");
        result.push("test");

        return result;
    }
}