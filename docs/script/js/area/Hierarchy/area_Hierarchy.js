import { app } from "../../app.js";
import { appendAnimationToObject, deleteAnimationToObject } from "../../オブジェクト/オブジェクトで共通の処理.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";

export class Area_Hierarchy {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"h": app.hierarchy, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Hierarchy"]},
            DOM: [
                {type: "option", name: "情報", children: [
                    {type: "gridBox", axis: "c", allocation: "1fr auto auto auto auto auto 1fr", children: [
                        {type: "padding", size: "10px"},

                        {type: "flexBox", interval: "5px", name: "", children: [
                            {type: "button", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                            {type: "button", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                            {type: "button", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                        ]},

                        {type: "separator", size: "10px"},

                        {type: "flexBox", interval: "5px", name: "", children: [
                            {type: "buttons", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                        ]},

                        {type: "separator", size: "10px"},

                        {type: "flexBox", interval: "5px", name: "", children: [
                            {type: "radios", name: "aa", icon: "test", label: "test", options: {textContent: "test"}},
                        ]},

                        {type: "padding", size: "10px"},
                    ]}
                ]},
                {type: "input", options: {type: "text"}},
                    {type: "hierarchy", name: "hierarchy", options: {arrange: true, clickEventFn: (event, object) => {
                        app.scene.state.setSelectedObject(object, app.input.keysDown["Ctrl"]);
                        app.scene.state.setActiveObject(object);
                        event.stopPropagation();
                    }, rangeSelectEventFn: (event, array, startIndex, endIndex) => {
                        let minIndex = Math.min(startIndex, endIndex);
                        let maxIndex = Math.max(startIndex, endIndex);
                        for (let i = minIndex; i < maxIndex; i ++) {
                            app.scene.state.setSelectedObject(array[i], true);
                        }
                        app.scene.state.setActiveObject(array[endIndex]);
                    },
                    activeSource: {object: "scene/state", parameter: "activeObject"}, selectSource: {object: "scene/state/selectedObject"}}, withObject: {object: "h/root"}, loopTarget: "children/objects", structures: [
                    {type: "gridBox", axis: "c", allocation: "auto auto 50% 1fr 20%", children: [
                        {type: "input", name: "visibleCheck", withObject: {object: "", parameter: "visible"}, options: {type: "checkbox", look: "eye-icon"}},
                        {type: "icon-img", name: "icon", withObject: "/type"},
                        {type: "dbInput", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                        {type: "padding", size: "10px"},
                        {type: "input", withObject: {object: "", parameter: "zIndex"}, options: {type: "number", min: 0, max: 100, step: 1}, custom: {visual: "1"}},
                    ]},
                ]},
                // {type: "section", name: "基本情報", children: [
                //     {type: "path", sourceObject: {object: "scene/state/activeObject"}, updateEventTarget: "アクティブオブジェクト", children: [
                //         {type: "if", formula: {source: {object: "", parameter: "type"}, conditions: "==", value: "グラフィックメッシュ"},
                //             true: [
                //                 {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                //                 {type: "input", label: "表示順番", withObject: {object: "", parameter: "zIndex"}, options: {type: "number", min: 0, max: 1000, step: 1}},
                //                 {type: "input", label: "最大頂点数", withObject: {object: "", parameter: "MAX_VERTICES"}, options: {type: "number"}, custom: {visual: "1"}},
                //                 {type: "input", label: "頂点数", withObject: {object: "", parameter: "verticesNum"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                //             ],
                //             false: [
                //                 {type: "if", formula: {source: {object: "", parameter: "type"}, conditions: "==", value: "ベジェモディファイア"},
                //                     true: [
                //                         {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                //                     ],
                //                     false: [
                //                         {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                //                         {type: "input", label: "最大ボーン数", withObject: {object: "", parameter: "MAX_BONES"}, options: {type: "number"}, custom: {visual: "1"}},
                //                         {type: "input", label: "ボーン数", withObject: {object: "", parameter: "boneNum"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                //                     ]
                //                 }
                //             ]
                //         }
                //     ]}
                // ]},
                // {type: "path", sourceObject: {object: "scene/state/activeObject"}, updateEventTarget: "アクティブオブジェクト", children: [
                //     {type: "section", name: "アニメーション", children: [
                //         {type: "input", label: "アニメーション最大数", withObject: {object: "", parameter: "MAX_ANIMATIONS"}, options: {type: "number"}, custom: {collision: false, visual: "1"}},
                //         {type: "list", appendEvent: () => {
                //             appendAnimationToObject(app.scene.state.activeObject, "新規");
                //         }, deleteEvent: (animations) => {
                //             for (const animation of animations) {
                //                 deleteAnimationToObject(app.scene.state.activeObject, animation);
                //             }
                //         }, withObject: {object: "animationBlock/list"}, options: {type: "min", selectSource: {object: "areaConfig/selectAnimations"}, activeSource: {object: "areaConfig", parameter: "activeAnimation"}}, liStruct:[
                //             // {type: "gridBox", axis: "c", allocation: "auto 50% 1fr", children: [
                //             {type: "gridBox", axis: "c", allocation: "50% 1fr", children: [
                //                 // {type: "icon-img", name: "icon", withObject: {object: "", parameter: "type"}},
                //                 {type: "dbInput", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                //                 {type: "padding", size: "10px"},
                //             ]},
                //         ]}
                //     ]}
                // ]}
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