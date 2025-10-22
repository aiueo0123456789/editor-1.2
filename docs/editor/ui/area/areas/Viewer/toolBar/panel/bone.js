import { app } from "../../../../../../../main.js";

function updateGPUData() {
    app.scene.editData.getEditObjectByObject(app.context.activeObject).updateGPUData();
}

export class ActiveBonePanel {
    constructor() {
        this.struct = {
            inputObject: {"context": app.context, "areasConifg": app.appConfig.areasConfig, "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "section", name: "ボーン", children: [
                        {tagType: "path", sourceObject: "scene/editData/editObjects/{context/activeObject/id}/activeBone", updateEventTarget: "ボーン選択", children: [
                            {tagType: "dblClickInput", label: "ボーンの名前", value: "/name", type: "text"},
                            {tagType: "section", name: "ヘッド", children: [
                                {tagType: "input", label: "x", value: "/headVertex/0", type: "number"},
                                {tagType: "input", label: "y", value: "/headVertex/1", type: "number"},
                            ]},
                            {tagType: "section", name: "テール", children: [
                                {tagType: "input", label: "x", value: "/tailVertex/0", type: "number"},
                                {tagType: "input", label: "y", value: "/tailVertex/1", type: "number"},
                            ]},
                            {tagType: "section", name: "アニメーション", children: [
                                {tagType: "input", label: "x", value: "/animationLocalBoneData/x", type: "number", submitEvent: updateGPUData, custom: {visual: "1"}},
                                {tagType: "input", label: "y", value: "/animationLocalBoneData/y", type: "number", submitEvent: updateGPUData, custom: {visual: "1"}},
                                {tagType: "input", label: "sx", value: "/animationLocalBoneData/sx", type: "number", submitEvent: updateGPUData, custom: {visual: "1"}},
                                {tagType: "input", label: "sy", value: "/animationLocalBoneData/sy", type: "number", submitEvent: updateGPUData, custom: {visual: "1"}},
                                {tagType: "input", label: "r", value: "/animationLocalBoneData/r", type: "number", submitEvent: updateGPUData, custom: {visual: "1"}},
                                {tagType: "input", label: "l", value: "/animationLocalBoneData/l", type: "number", submitEvent: updateGPUData, custom: {visual: "1"}},
                            ]},
                            {tagType: "section", name: "物理アタッチメント", children: [
                                {tagType: "input", label: "x", value: "/physics/0", type: "number", min: 0, max: 1, step: 0.01},
                                {tagType: "input", label: "y", value: "/physics/1", type: "number", min: 0, max: 1, step: 0.01},
                                {tagType: "input", label: "rotate", value: "/physics/2", type: "number", min: 0, max: 1, step: 0.01},
                                {tagType: "input", label: "scaleX", value: "/physics/3", type: "number", min: 0, max: 1, step: 0.01},
                                {tagType: "input", label: "inertia", value: "/physics/4", type: "number", min: 0, max: 3, step: 0.01},
                                {tagType: "input", label: "strength", value: "/physics/5", type: "number", min: 0, max: 100, step: 0.01},
                                {tagType: "input", label: "damping", value: "/physics/6", type: "number", min: 0, max: 1, step: 0.01},
                                {tagType: "input", label: "mass", value: "/physics/7", type: "number", min: 0, max: 1000, step: 0.01},
                                {tagType: "input", label: "wind", value: "/physics/8", type: "number", min: -100, max: 100, step: 0.01},
                                {tagType: "input", label: "gravity", value: "/physics/9", type: "number", min: -100, max: 100, step: 0.01},
                                {tagType: "input", label: "mix", value: "/physics/10", type: "number", min: 0, max: 1, step: 0.01},
                                {tagType: "input", label: "limit", value: "/physics/11", type: "number", min: 0, max: 500, step: 0.01},
                            ]}
                        ]},
                    ]}
                ]}
            ]
        };
    }
}