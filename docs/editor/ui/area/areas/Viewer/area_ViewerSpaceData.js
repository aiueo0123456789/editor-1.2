export class ViewerSpaceData {
    constructor() {
        this.mode = "オブジェクト";
        this.modes = {
            "": ["オブジェクト"],
            "グラフィックメッシュ": ["オブジェクト","メッシュ編集","頂点メーション編集"],
            "アーマチュア": ["オブジェクト","ボーン編集", "ボーンアニメーション編集"],
            "ベジェモディファイア": ["オブジェクト","ベジェ編集", "頂点アニメーション編集"],
        };
        this.tools = ["select", "move", "resize", "rotate", "remove", "append"];
        this.useTool = "select";
        this.smooth = false;

        this.proportionalMetaData = {
            use: false,
            type: "リニア",
            size: 100,
        }

        this.weightPaintMetaData = {
            weightBlockIndex: 0,
            bezierType: 0,
            weightValue: 1,
            decayType: "ミックス",
            decaySize: 50,
        }

        this.areas = [];

        this.weightBezierType = 0;
    }
}