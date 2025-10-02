import { app } from "../../../../../../main.js";

export class BoneAttachmentsModal {
    constructor() {
        this.name = "ボーンアタッチメント";
        this.values = [0,0,0,0];
        this.struct = {
            inputObject: {"areasConifg": app.appConfig.areasConfig, "outliner": app.scene.outliner, "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "section", name: "ボーンアタッチメント", children: [
                        {tagType: "path", sourceObject: "scene/runtimeData/armatureData/getSelectBones", updateEventTarget: "ボーン選択", children: [
                            {tagType: "select", label: "", writeObject: null, sourceObject: ["物理"], options: {initValue: "アタッチメントの追加", writeObject: (value) => {
                                app.scene.state.getSelectBones[0].attachments.append(value);
                            }}},
                            {tagType: "list", appendEvent: () => {
                                // appendAnimationToObject(app.scene.state.activeObject, "新規");
                            }, deleteEvent: (animations) => {
                                for (const animation of animations) {
                                    // deleteAnimationToObject(app.scene.state.activeObject, animation);
                                }
                            }, withObject: "/0/attachments/list", options: {}, liStruct:[
                                {tagType: "if", formula: {source: "/type", conditions: "==", value: "物理アタッチメント"},
                                    true: [
                                        {tagType: "section", name: "物理アタッチメント", children: [
                                            {tagType: "input", label: "x", value: "/x", type: "number", min: 0, max: 1, step: 0.01},
                                            {tagType: "input", label: "y", value: "/y", type: "number", min: 0, max: 1, step: 0.01},
                                            {tagType: "input", label: "rotate", value: "/rotate", type: "number", min: 0, max: 1, step: 0.01},
                                            {tagType: "input", label: "scaleX", value: "/scaleX", type: "number", min: 0, max: 1, step: 0.01},
                                            {tagType: "input", label: "inertia", value: "/inertia", type: "number", min: 0, max: 3, step: 0.01},
                                            {tagType: "input", label: "strength", value: "/strength", type: "number", min: 0, max: 100, step: 0.01},
                                            {tagType: "input", label: "damping", value: "/damping", type: "number", min: 0, max: 1, step: 0.01},
                                            {tagType: "input", label: "mass", value: "/mass", type: "number", min: 0, max: 1000, step: 0.01},
                                            {tagType: "input", label: "wind", value: "/wind", type: "number", min: -100, max: 100, step: 0.01},
                                            {tagType: "input", label: "gravity", value: "/gravity", type: "number", min: -100, max: 100, step: 0.01},
                                            {tagType: "input", label: "mix", value: "/mix", type: "number", min: 0, max: 1, step: 0.01},
                                            {tagType: "input", label: "limit", value: "/limit", type: "number", min: 0, max: 500, step: 0.01},
                                        ]}
                                    ],
                                    false: [
                                        {tagType: "section", name: "カスタム", children: [
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