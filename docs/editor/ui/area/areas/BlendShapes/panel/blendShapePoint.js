import { app } from "../../../../../../main.js";

export class BlendShapePointPanel {
    constructor() {
        this.struct = {
            inputObject: {"context": app.context, "areaConfig": app.appConfig.areasConfig["BlendShape"], "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "panel", name: "ブレンドシェイプポイント", children: [
                        {tagType: "path", sourceObject: "areaConfig/activeBlendShape", updateEventTarget: {path: "areaConfig/%activeBlendShape"}, children: [
                            {tagType: "path", sourceObject: "/activePoint", updateEventTarget: {path: "/%activePoint"}, children: [
                                {tagType: "input", label: "x", value: "/co/0", type: "number"},
                                {tagType: "input", label: "y", value: "/co/1", type: "number"},
                                {tagType: "list", label: "重み", src: "/weights", isPrimitive: true, notUseActiveAndSelect: true, liStruct: [
                                    {tagType: "gridBox", axis: "c", allocation: "1fr 1fr", children: [
                                        {tagType: "dblClickInput", value: "areaConfig/activeBlendShape/shapeKeys/{!index}/name"},
                                        {tagType: "input", value: "areaConfig/activeBlendShape/activePoint/weights/%{!index}", type: "number", min: 0, max: 1, step: 0.0001, custom: {visual: "rangeOnly"}},
                                    ]}
                                ]}
                            ]}
                        ]}
                    ]}
                ]}
            ]
        };
    }
}