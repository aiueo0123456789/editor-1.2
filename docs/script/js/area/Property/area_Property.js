import { app } from "../../app.js";
import { appendAnimationToObject, deleteAnimationToObject } from "../../オブジェクト/オブジェクトで共通の処理.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";

export class Area_Property {
    constructor(/** @type {HTMLElement} */dom) {
        this.dom = dom;

        this.inputObject = {"h": app.hierarchy, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Hierarchy"], "app": app};

        this.struct = {
            DOM: [
                {type: "section", name: "アニメーション", children: [
                    {type: "input", label: "開始", withObject: {object: "scene", parameter: "frame_start"}, options: {type: "number", min: 0, max: 1000, step: 1}},
                    {type: "input", label: "終了", withObject: {object: "scene", parameter: "frame_end"}, options: {type: "number", min: 0, max: 1000, step: 1}},
                    {type: "input", label: "再生速度", withObject: {object: "app/animationPlayer", parameter: "speed"}, options: {type: "text"}},
                ]},
            ],
        };

        this.creator = new CreatorForUI();
        this.creator.create(dom, this);

        this.update();
    }

    update() {
        for (const object of app.hierarchy.root) {
            const div = document.createElement("div");
            div.textContent = object.name;
        }
    }
}