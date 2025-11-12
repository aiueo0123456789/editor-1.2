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
                    {tagType: "panel", name: "ボーン", children: [
                        {tagType: "path", sourceObject: "scene/editData/editObjects/{context/activeObject/id}/activeBone", updateEventTarget: "ボーン選択", children: [
                            {tagType: "dblClickInput", label: "ボーンの名前", value: "/name"},
                            {tagType: "panel", name: "ヘッド", children: [
                                {tagType: "input", label: "x", value: "/headVertex/0", type: "number"},
                                {tagType: "input", label: "y", value: "/headVertex/1", type: "number"},
                            ]},
                            {tagType: "panel", name: "テール", children: [
                                {tagType: "input", label: "x", value: "/tailVertex/0", type: "number"},
                                {tagType: "input", label: "y", value: "/tailVertex/1", type: "number"},
                            ]},
                            {tagType: "panel", name: "アニメーション", children: [
                                {tagType: "input", label: "x", value: "/animationLocalBoneData/x", type: "number", submitEvent: updateGPUData},
                                {tagType: "hasKeyframeCheck", src: "/keyframeBlockManager/keyframeBlocks/0"},
                                {tagType: "input", label: "y", value: "/animationLocalBoneData/y", type: "number", submitEvent: updateGPUData},
                                {tagType: "hasKeyframeCheck", src: "/keyframeBlockManager/keyframeBlocks/1"},
                                {tagType: "input", label: "sx", value: "/animationLocalBoneData/sx", type: "number", submitEvent: updateGPUData},
                                {tagType: "hasKeyframeCheck", src: "/keyframeBlockManager/keyframeBlocks/2"},
                                {tagType: "input", label: "sy", value: "/animationLocalBoneData/sy", type: "number", submitEvent: updateGPUData},
                                {tagType: "hasKeyframeCheck", src: "/keyframeBlockManager/keyframeBlocks/3"},
                                {tagType: "input", label: "r", value: "/animationLocalBoneData/r", type: "number", submitEvent: updateGPUData},
                                {tagType: "hasKeyframeCheck", src: "/keyframeBlockManager/keyframeBlocks/4"},
                                {tagType: "input", label: "l", value: "/animationLocalBoneData/l", type: "number", submitEvent: updateGPUData},
                                {tagType: "hasKeyframeCheck", src: "/keyframeBlockManager/keyframeBlocks/5"},
                            ]},
                            {tagType: "panel", name: "物理アタッチメント", children: [
                                {tagType: "parameterManager", targets: ["/physics/0", "/physics/1", "/physics/2", "/physics/3", "/physics/4", "/physics/5", "/physics/6", "/physics/7", "/physics/8", "/physics/9", "/physics/10", "/physics/11", "/physics/12"]},
                                {tagType: "input", label: "x", value: "/physics/0", type: "number", min: 0, max: 1, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "y", value: "/physics/1", type: "number", min: 0, max: 1, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "rotate", value: "/physics/2", type: "number", min: 0, max: 1, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "scaleX", value: "/physics/3", type: "number", min: 0, max: 1, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "shearX", value: "/physics/4", type: "number", min: 0, max: 1, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "inertia", value: "/physics/5", type: "number", min: 0, max: 3, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "strength", value: "/physics/6", type: "number", min: 0, max: 100, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "damping", value: "/physics/7", type: "number", min: 0, max: 1, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "mass", value: "/physics/8", type: "number", min: 0, max: 1000, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "wind", value: "/physics/9", type: "number", min: -100, max: 100, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "gravity", value: "/physics/10", type: "number", min: -100, max: 100, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "mix", value: "/physics/11", type: "number", min: 0, max: 1, step: 0.01, custom: {visual: "range"}},
                                {tagType: "input", label: "limit", value: "/physics/12", type: "number", min: 0, max: 500, step: 0.01, custom: {visual: "range"}},
                            ]}
                        ]},
                    ]}
                ]}
            ]
        };
    }
}