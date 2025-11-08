import { app } from "../../../../../main.js";

export class Area_Outliner {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"context": app.context, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Outliner"]},
            DOM: [
                {tagType: "outliner", name: "outliner", options: {arrange: true, clickEventFn: (event, object) => {
                        if (app.context.currentMode == "オブジェクト") {
                            app.context.setSelectedObject(object, app.input.keysDown["Ctrl"]);
                            app.context.setActiveObject(object);
                            event.stopPropagation();
                        }
                    }, rangeSelectEventFn: (event, array, startIndex, endIndex) => {
                        if (app.context.currentMode == "オブジェクト") {
                            let minIndex = Math.min(startIndex, endIndex);
                            let maxIndex = Math.max(startIndex, endIndex);
                            for (let i = minIndex; i < maxIndex; i ++) {
                                app.context.setSelectedObject(array[i], true);
                            }
                            app.context.setActiveObject(array[endIndex]);
                        }
                    },
                    activeSource: "context/activeObject", selectSource: "context/selectedObjects"}, withObject: "scene/objects/rootObjects", updateEventTarget: "親変更", loopTarget: "/children", structures: [
                        {
                            tagType: "if",
                            formula: {source: "/", conditions: "in", value: "name"},
                            true: [
                                {
                                    tagType: "if",
                                    formula: {source: "/", conditions: "in", value: "zIndex"},
                                    true: [
                                        {tagType: "gridBox", axis: "c", allocation: "auto 50% 1fr auto 20%", children: [
                                            {tagType: "icon", src: {path: "/type"}},
                                            {tagType: "dblClickInput", value: "/name"},
                                            {tagType: "padding", size: "10px"},
                                            {tagType: "input", type: "checkbox", checked: "/visible", look: {check: "display", uncheck: "hide"}},
                                            {tagType: "input", value: "/zIndex", type: "number", min: 0, max: 100, step: 1},
                                        ]},
                                    ],
                                    false: [
                                        {tagType: "gridBox", axis: "c", allocation: "auto 50% 1fr", children: [
                                            {tagType: "icon", src: {path: "/type"}},
                                            {tagType: "dblClickInput", value: "/name"},
                                            {tagType: "padding", size: "10px"},
                                        ]},
                                    ]
                                }
                            ],
                            false: [
                                {tagType: "gridBox", axis: "c", allocation: "50% 1fr", children: [
                                    {tagType: "dblClickInput", value: "/type"},
                                    {tagType: "padding", size: "10px"},
                                ]},
                            ]
                        }
                ]},
            ],
            utility: {
                "testTest": {}
            }
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct);
    }
}