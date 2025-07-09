import { app } from "../../app.js";
import { changeParameter } from "../../utility.js";
import { appendAnimationToObject, deleteAnimationToObject } from "../../オブジェクト/オブジェクトで共通の処理.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";

export class Area_Inspector {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"h": app.hierarchy, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Hierarchy"]},
            DOM: [
                {type: "section", name: "基本情報", children: [
                    {type: "path", sourceObject: "scene/state/activeObject", updateEventTarget: "アクティブオブジェクト", children: [
                        {type: "if", formula: {source: "/type", conditions: "==", value: "グラフィックメッシュ"},
                            true: [
                                {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                {type: "input", label: "親", withObject: {object: "parent", parameter: "name"}, options: {type: "text"}},
                                {type: "input", label: "表示順番", withObject: {object: "", parameter: "zIndex"}, options: {type: "number", min: 0, max: 1000, step: 1}},
                                {type: "input", label: "最大頂点数", withObject: {object: "", parameter: "MAX_VERTICES"}, options: {type: "number"}, custom: {visual: "1"}},
                                {type: "input", label: "頂点数", withObject: {object: "", parameter: "verticesNum"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                {type: "input", label: "アニメーション最大数", withObject: {object: "", parameter: "MAX_ANIMATIONS"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                {type: "input", label: "自動のウェイト", withObject: {object: "", parameter: "autoWeight"}, options: {type: "checkbox", look: "defo"}},
                            ],
                            false: [
                                {type: "if", formula: {source: "/type", conditions: "==", value: "ベジェモディファイア"},
                                    true: [
                                        {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                        {type: "input", label: "最大頂点数", withObject: {object: "", parameter: "MAX_POINTS"}, options: {type: "number"}, custom: {visual: "1"}},
                                        {type: "input", label: "頂点数", withObject: {object: "", parameter: "pointNum"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                        {type: "input", label: "アニメーション最大数", withObject: {object: "", parameter: "MAX_ANIMATIONS"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                    ],
                                    false: [
                                        {type: "if", formula: {source: "/type", conditions: "==", value: "アーマチュア"},
                                            true: [
                                                {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                                {type: "input", label: "最大ボーン数", withObject: {object: "", parameter: "MAX_BONES"}, options: {type: "number"}, custom: {visual: "1"}},
                                                {type: "input", label: "ボーン数", withObject: {object: "", parameter: "boneNum"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                            ],
                                            false: [
                                                {type: "input", label: "対象オブジェクト", withObject: {object: "targetObject", parameter: "name"}, options: {type: "text"}},
                                                {type: "input", label: "対象値", withObject: {object: "", parameter: "targetValue"}, options: {type: "text"}},
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]}
                ]},
                {type: "path", sourceObject: "scene/state/activeObject", updateEventTarget: "アクティブオブジェクト", children: [
                    {type: "section", name: "アニメーション", children: [
                        {type: "input", label: "アニメーション最大数", withObject: {object: "", parameter: "MAX_ANIMATIONS"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                        {type: "list", appendEvent: () => {
                            appendAnimationToObject(app.scene.state.activeObject, "新規");
                        }, deleteEvent: (animations) => {
                            for (const animation of animations) {
                                deleteAnimationToObject(app.scene.state.activeObject, animation);
                            }
                        }, withObject: {object: "animationBlock/list"}, options: {type: "min", selectSource: {
                            function: (index, object) => {
                            },
                            getFunction: (object) => {
                            }
                        }, activeSource: {
                            function: (index, object) => {
                                changeParameter(app.scene.state.activeObject.animationBlock, "activeAnimationIndex", index);
                            },
                            getFunction: (object) => {
                                console.log(object)
                                return object.belongObject.animationBlock.activeAnimation == object;
                            }
                        }}, liStruct:[
                            {type: "gridBox", axis: "c", allocation: "50% 1fr 10% 20px", children: [
                                {type: "dbInput", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                {type: "padding", size: "10px"},
                                {type: "input", withObject: {object: "", parameter: "weight"}, options: {type: "number", min: 0, max: 1, step: 0.01}, custom: {visual: "1"}},
                                {type: "hasKeyframeCheck", targetObject: "/keyframeBlockManager/blocksMap/weight"}
                            ]},
                        ]}
                    ]}
                ]}
            ],
            utility: {
                "testTest": {}
            }
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