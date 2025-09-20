import { app } from "../../../../../main.js";

export class Area_Property {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"outliner": app.scene.outliner, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Outliner"], "app": app},
            DOM: [
                {type: "section", name: "アニメーション", children: [
                    {type: "input", label: "開始", withObject: "scene/frame_start", options: {type: "number", min: 0, max: 500, step: 1}},
                    {type: "input", label: "終了", withObject: "scene/frame_end", options: {type: "number", min: 0, max: 500, step: 1}},
                    {type: "input", label: "再生速度", withObject: "scene/frame_speed", options: {type: "number", min: 0, max: 10, step: 0.1}},
                ]},
                {type: "section", name: "マスク", children: [
                    {type: "list", label: "マスク", appendEvent: () => {
                        app.scene.appendMaskTexture("新規");
                    }, deleteEvent: (masks) => {
                        for (const mask of masks) {
                            app.scene.deleteMaskTexture(mask);
                        }
                    }, withObject: "scene/maskTextures", options: {type: "min"}, liStruct:[
                        {type: "gridBox", axis: "c", allocation: "50% 1fr", children: [
                            {type: "dbInput", withObject: "/name", options: {type: "text"}},
                            {type: "padding", size: "10px"},
                        ]},
                    ]}
                ]},
                {type: "section", name: "パラメーターコレクター", children: [
                    {type: "list", appendEvent: () => {
                        // appendAnimationToObject(app.scene.state.activeObject, "新規");
                    }, deleteEvent: (animations) => {
                        for (const animation of animations) {
                            // deleteAnimationToObject(app.scene.state.activeObject, animation);
                        }
                    }, withObject: "scene/objects/parameterManagers", options: {}, liStruct:[
                        {type: "nodeFromFunction", source: "/getNodeData"}
                    ]}
                ]},
                {type: "section", name: "カメラ", children: [
                    {type: "input", label: "表示範囲x", withObject: "scene/objects/renderingCamera/displayRange/0", options: {type: "number", min: 1, max: 2048, step: 1}},
                    {type: "input", label: "表示範囲y", withObject: "scene/objects/renderingCamera/displayRange/1", options: {type: "number", min: 1, max: 2048, step: 1}},
                ]}
            ],
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct);

        this.update();
    }

    update() {
        for (const object of app.scene.outliner.root) {
            const div = document.createElement("div");
            div.textContent = object.name;
        }
    }
}