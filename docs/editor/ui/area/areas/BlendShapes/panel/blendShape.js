import { app } from "../../../../../../main.js";
import { AppendBlendShapePointCommand, AppendShapeKeyInBlendShapeCommand, DeleteShapeKeyInBlendShapeCommand } from "../../../../../commands/mesh/shapeKey.js";

export class BlendShapePanel {
    constructor() {
        this.struct = {
            inputObject: {"context": app.context, "areaConfig": app.appConfig.areasConfig["BlendShape"], "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "panel", name: "ブレンドシェイプ", children: [
                        {tagType: "path", sourceObject: "areaConfig/activeBlendShape", updateEventTarget: {path: "areaConfig/%activeBlendShape"}, children: [
                            {tagType: "input", label: "名前", value: "/name", type: "text"},
                            {tagType: "input", label: "minX", value: "/min/0", type: "number"},
                            {tagType: "input", label: "minY", value: "/min/1", type: "number"},
                            {tagType: "input", label: "maxX", value: "/max/0", type: "number"},
                            {tagType: "input", label: "maxY", value: "/max/1", type: "number"},
                            {tagType: "input", label: "valueX", value: "/value/0", type: "number"},
                            {tagType: "hasKeyframeCheck", src: "/keyframeBlockManager/keyframeBlocks/0", value: "/value/0"},
                            {tagType: "input", label: "valueY", value: "/value/1", type: "number"},
                            {tagType: "hasKeyframeCheck", src: "/keyframeBlockManager/keyframeBlocks/1", value: "/value/1"},

                            {tagType: "button", textContent: "追加", submitFunction: (object) => {
                                app.operator.appendCommand(new AppendBlendShapePointCommand(object.normal));
                                app.operator.execute();
                            }},
                            {tagType: "dualListbox", available: "scene/objects/shapeKeys", selected: "/shapeKeys",
                                appendEvent: (shapeKey) => {
                                    app.operator.appendCommand(new AppendShapeKeyInBlendShapeCommand(app.appConfig.areasConfig["BlendShape"].activeBlendShape, shapeKey));
                                    app.operator.execute();
                                },
                                deleteEvent: (shapeKey) => {
                                    app.operator.appendCommand(new DeleteShapeKeyInBlendShapeCommand(app.appConfig.areasConfig["BlendShape"].activeBlendShape, shapeKey));
                                    app.operator.execute();
                                }
                                , liStruct: [
                                {tagType: "gridBox", axis: "c", allocation: "1fr", children: [
                                    {tagType: "dblClickInput", value: "/name"},
                                ]},
                            ]}
                        ]}
                    ]}
                ]}
            ]
        };
    }
}