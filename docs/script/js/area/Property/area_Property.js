import { app } from "../../app.js";
import { appendAnimationToObject, deleteAnimationToObject } from "../../オブジェクト/オブジェクトで共通の処理.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";

export class Area_Property {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"h": app.hierarchy, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Hierarchy"], "app": app},
            DOM: [
                {type: "section", name: "アニメーション", children: [
                    {type: "input", label: "開始", withObject: {object: "scene", parameter: "frame_start"}, options: {type: "number", min: 0, max: 1000, step: 1}},
                    {type: "input", label: "終了", withObject: {object: "scene", parameter: "frame_end"}, options: {type: "number", min: 0, max: 1000, step: 1}},
                    {type: "input", label: "再生速度", withObject: {object: "app/animationPlayer", parameter: "speed"}, options: {type: "number", min: 0, max: 1000, step: 0.1}},
                ]},
                {type: "section", name: "マスク", children: [
                    {type: "list", appendEvent: () => {
                        app.scene.appendMaskTexture("新規");
                    }, deleteEvent: (masks) => {
                        for (const mask of masks) {
                            app.scene.deleteMaskTexture(mask);
                        }
                    }, withObject: {object: "scene/maskTextures"}, options: {type: "min"}, liStruct:[
                        {type: "gridBox", axis: "c", allocation: "50% 1fr", children: [
                            {type: "dbInput", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                            {type: "padding", size: "10px"},
                        ]},
                    ]}
                ]},
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