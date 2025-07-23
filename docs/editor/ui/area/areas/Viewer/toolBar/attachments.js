import { app } from "../../../../../app/app.js";

export class BoneAttachmentsModal {
    constructor() {
        this.name = "ボーンアタッチメント";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"areasConifg": app.appConfig.areasConfig, "h": app.hierarchy, "scene": app.scene, "values": this.values},
            DOM: [
                {type: "div", class: "sideBar-shelfe", children: [
                    {type: "section", name: "ボーンアタッチメント", children: [
                        {type: "path", sourceObject: "scene/runtimeData/armatureData/getSelectBone", updateEventTarget: "ボーン選択", children: [
                            // {type: "dbInput", withObject: {object: "0", parameter: "index"}, options: {type: "text"}},
                            {type: "select", label: "", writeObject: null, sourceObject: ["物理"], options: {initValue: "アタッチメントの追加", submitEvent: (value) => {
                                app.scene.state.getSelectBone()[0].attachments.append(value);
                            }}},
                            {type: "list", appendEvent: () => {
                                // appendAnimationToObject(app.scene.state.activeObject, "新規");
                            }, deleteEvent: (animations) => {
                                for (const animation of animations) {
                                    // deleteAnimationToObject(app.scene.state.activeObject, animation);
                                }
                            }, withObject: "/0/attachments/list", options: {}, liStruct:[
                                {type: "if", formula: {source: "/type", conditions: "==", value: "物理アタッチメント"},
                                    true: [
                                        {type: "section", name: "物理アタッチメント", children: [
                                            {type: "input", label: "x", withObject: "/x", options: {type: "number", min: 0, max: 1, step: 0.01}},
                                            {type: "input", label: "y", withObject: "/y", options: {type: "number", min: 0, max: 1, step: 0.01}},
                                            {type: "input", label: "rotate", withObject: "/rotate", options: {type: "number", min: 0, max: 1, step: 0.01}},
                                            {type: "input", label: "scaleX", withObject: "/scaleX", options: {type: "number", min: 0, max: 1, step: 0.01}},
                                            {type: "input", label: "inertia", withObject: "/inertia", options: {type: "number", min: 0, max: 10, step: 0.01}},
                                            {type: "input", label: "strength", withObject: "/strength", options: {type: "number", min: 0, max: 100, step: 0.01}},
                                            {type: "input", label: "damping", withObject: "/damping", options: {type: "number", min: 0, max: 1, step: 0.01}},
                                            {type: "input", label: "mass", withObject: "/mass", options: {type: "number", min: 0, max: 1000, step: 0.01}},
                                            {type: "input", label: "wind", withObject: "/wind", options: {type: "number", min: -100, max: 100, step: 0.01}},
                                            {type: "input", label: "gravity", withObject: "/gravity", options: {type: "number", min: -100, max: 100, step: 0.01}},
                                            {type: "input", label: "mix", withObject: "/mix", options: {type: "number", min: 0, max: 1, step: 0.01}},
                                        ]}
                                    ],
                                    false: [
                                        {type: "section", name: "カスタム", children: [
                                        ]}
                                    ]
                                }
                            ]}
                        ]},
                    ]}
                ]}
            ]
        };
    }
}