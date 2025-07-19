import { app } from "../../../../app/app.js";
import { appendAnimationToObject, deleteAnimationToObject } from "../../../../utils/objects/util.js";
import { changeParameter } from "../../../../utils/utility.js";

export class Area_Inspector {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"h": app.hierarchy, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Hierarchy"]},
            DOM: [
                {type: "section", name: "基本情報", children: [
                    {type: "section", name: "基本情報", options: {min: true}, children: [
                        {type: "section", name: "基本情報", options: {min: true}, children: [
                            {type: "section", name: "基本情報", options: {min: true}, children: [
                            ]},
                        ]},
                    ]},
                    {type: "path", sourceObject: "scene/state/activeObject", updateEventTarget: "アクティブオブジェクト", children: [
                        {type: "if", formula: {source: "/type", conditions: "==", value: "グラフィックメッシュ"},
                            true: [
                                {type: "input", label: "名前", withObject: "/name", options: {type: "text"}},
                                {type: "input", label: "親", withObject: "/parent/name", options: {type: "text"}},
                                {type: "input", label: "表示順番", withObject: "/zIndex", options: {type: "number", min: 0, max: 1000, step: 1}},
                                {type: "input", label: "最大頂点数", withObject: "/MAX_VERTICES", options: {type: "number"}, custom: {visual: "1"}},
                                {type: "input", label: "頂点数", withObject: "/verticesNum", options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                {type: "input", label: "アニメーション最大数", withObject: "/MAX_ANIMATIONS", options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                {type: "input", label: "自動のウェイト", withObject: "/autoWeight", options: {type: "checkbox", look: "defo"}},
                            ],
                            false: [
                                {type: "if", formula: {source: "/type", conditions: "==", value: "ベジェモディファイア"},
                                    true: [
                                        {type: "input", label: "名前", withObject: "/name", options: {type: "text"}},
                                        {type: "input", label: "最大頂点数", withObject: "/MAX_POINTS", options: {type: "number"}, custom: {visual: "1"}},
                                        {type: "input", label: "頂点数", withObject: "/pointNum", options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                        {type: "input", label: "アニメーション最大数", withObject: "/MAX_ANIMATIONS", options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                    ],
                                    false: [
                                        {type: "if", formula: {source: "/type", conditions: "==", value: "アーマチュア"},
                                            true: [
                                                {type: "input", label: "名前", withObject: "/name", options: {type: "text"}},
                                                {type: "input", label: "最大ボーン数", withObject: "/MAX_BONES", options: {type: "number"}, custom: {visual: "1"}},
                                                {type: "input", label: "ボーン数", withObject: "/boneNum", options: {type: "number"}, custom: {collision: false, visual: "1"}},
                                            ],
                                            false: [
                                                {type: "input", label: "対象オブジェクト", withObject: "/targetObjec/name", options: {type: "text"}},
                                                {type: "input", label: "対象値", withObject: "/targetValue", options: {type: "text"}},
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
                        {type: "input", label: "アニメーション最大数", withObject: "/MAX_ANIMATIONS", options: {type: "number"}, custom: {collision: false, visual: "1"}},
                        {type: "list", appendEvent: () => {
                            appendAnimationToObject(app.scene.state.activeObject, "新規");
                        }, deleteEvent: (animations) => {
                            for (const animation of animations) {
                                deleteAnimationToObject(app.scene.state.activeObject, animation);
                            }
                        }, withObject: "/animationBlock/list", options: {type: "min", selectSource: {
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
                            {type: "gridBox", axis: "c", allocation: "50% 1fr 50px 20px", children: [
                                {type: "dbInput", withObject: "/name", options: {type: "text"}},
                                {type: "padding", size: "10px"},
                                {type: "input", withObject: "/weight", options: {type: "number", min: 0, max: 1, step: 0.01}, custom: {visual: "1"}},
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