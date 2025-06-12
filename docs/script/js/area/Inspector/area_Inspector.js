import { app } from "../../app.js";
import { appendAnimationToObject, deleteAnimationToObject } from "../../オブジェクト/オブジェクトで共通の処理.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";

export class Area_Inspector {
    constructor(/** @type {HTMLElement} */dom) {
        this.dom = dom;

        this.inputObject = {"h": app.hierarchy, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Hierarchy"]};

        this.struct = {
            DOM: [
                {type: "section", name: "基本情報", children: [
                    {type: "path", sourceObject: {object: "scene/state/activeObject"}, updateEventTarget: "アクティブオブジェクト", children: [
                        {type: "if", formula: {source: {object: "", parameter: "type"}, conditions: "==", value: "グラフィックメッシュ"},
                            true: [
                                {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                {type: "input", label: "表示順番", withObject: {object: "", parameter: "zIndex"}, options: {type: "number", min: 0, max: 1000, step: 1}},
                                {type: "input", label: "最大頂点数", withObject: {object: "", parameter: "MAX_VERTICES"}, options: {type: "number"}, custom: {visual: "1"}},
                                {type: "input", label: "頂点数", withObject: {object: "", parameter: "verticesNum"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                            ],
                            false: [
                                {type: "if", formula: {source: {object: "", parameter: "type"}, conditions: "==", value: "ベジェモディファイア"},
                                    true: [
                                        {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                    ],
                                    false: [
                                        {type: "if", formula: {source: {object: "", parameter: "type"}, conditions: "==", value: "ボーンモディファイア"},
                                            true: [
                                                {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                                {type: "input", label: "最大ボーン数", withObject: {object: "", parameter: "MAX_BONES"}, options: {type: "number"}, custom: {visual: "1"}},
                                                {type: "input", label: "ボーン数", withObject: {object: "", parameter: "boneNum"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                            ],
                                            false: [
                                                {type: "input", label: "対象オブジェクト", withObject: {object: "belongObject", parameter: "name"}, options: {type: "text"}},
                                                {type: "input", label: "対象値", withObject: {object: "", parameter: "targetValue"}, options: {type: "text"}},
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]}
                ]},
                {type: "path", sourceObject: {object: "scene/state/activeObject"}, updateEventTarget: "アクティブオブジェクト", children: [
                    {type: "section", name: "アニメーション", children: [
                        {type: "input", label: "アニメーション最大数", withObject: {object: "", parameter: "MAX_ANIMATIONS"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                        {type: "list", appendEvent: () => {
                            appendAnimationToObject(app.scene.state.activeObject, "新規");
                        }, deleteEvent: (animations) => {
                            for (const animation of animations) {
                                deleteAnimationToObject(app.scene.state.activeObject, animation);
                            }
                        }, withObject: {object: "animationBlock/animationBlock"}, options: {type: "min", selectSource: {object: "areaConfig/selectAnimations"}, activeSource: {object: "areaConfig", parameter: "activeAnimation"}}, liStruct:[
                            // {type: "gridBox", axis: "c", allocation: "auto 50% 1fr", children: [
                            {type: "gridBox", axis: "c", allocation: "50% 1fr 10%", children: [
                                // {type: "icon-img", name: "icon", withObject: {object: "", parameter: "type"}},
                                {type: "dbInput", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                {type: "padding", size: "10px"},
                                {type: "input", withObject: {object: "", parameter: "weight"}, options: {type: "number", min: 0, max: 1}, custom: {visual: "1"}},
                            ]},
                        ]}
                    ]}
                ]}
            ],
            utility: {
                "testTest": {}
            }
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