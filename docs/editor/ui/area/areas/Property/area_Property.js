import { app } from "../../../../app/app.js";

export class Area_Property {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"h": app.hierarchy, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Hierarchy"], "app": app},
            DOM: [
                {type: "section", name: "アニメーション", children: [
                    {type: "input", label: "開始", withObject: "scene/frame_start", options: {type: "number", min: 0, max: 500, step: 1}},
                    {type: "input", label: "終了", withObject: "scene/frame_end", options: {type: "number", min: 0, max: 500, step: 1}},
                    {type: "input", label: "再生速度", withObject: "app/animationPlayer/speed", options: {type: "number", min: 0, max: 10, step: 0.1}},
                ]},
                {type: "section", name: "マスク", children: [
                    {type: "list", appendEvent: () => {
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
                ]}
            ],
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct);

        this.update();
    }

    update() {
        for (const object of app.hierarchy.root) {
            const div = document.createElement("div");
            div.textContent = object.name;
        }
    }
}