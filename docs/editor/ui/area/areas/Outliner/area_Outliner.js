import { app } from "../../../../../main.js";

export class Area_Outliner {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"outliner": app.scene.outliner, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Outliner"]},
            DOM: [
                {tagType: "outliner", name: "outliner", options: {arrange: true, clickEventFn: (event, object) => {
                        if (app.scene.state.currentMode == "オブジェクト") {
                            app.scene.state.setSelectedObject(object, app.input.keysDown["Ctrl"]);
                            app.scene.state.setActiveObject(object);
                            event.stopPropagation();
                        }
                    }, rangeSelectEventFn: (event, array, startIndex, endIndex) => {
                        if (app.scene.state.currentMode == "オブジェクト") {
                            let minIndex = Math.min(startIndex, endIndex);
                            let maxIndex = Math.max(startIndex, endIndex);
                            for (let i = minIndex; i < maxIndex; i ++) {
                                app.scene.state.setSelectedObject(array[i], true);
                            }
                            app.scene.state.setActiveObject(array[endIndex]);
                        }
                    },
                    activeSource: {object: "scene/state", parameter: "activeObject"}, selectSource: {object: "scene/state/selectedObject"}}, withObject: "scene/objects/rootObjects", updateEventTarget: "changeParent", loopTarget: "children", structures: [
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
                                            {tagType: "dbInput", value: "/name", options: {tagType: "text"}},
                                            {tagType: "padding", size: "10px"},
                                            {tagType: "input", value: "/visible", type: "checkbox", look: {check: "display", uncheck: "hide"}},
                                            {tagType: "input", value: "/zIndex", type: "number", min: 0, max: 100, step: 1, custom: {visual: "1"}},
                                        ]},
                                    ],
                                    false: [
                                        {tagType: "gridBox", axis: "c", allocation: "auto 50% 1fr", children: [
                                            {tagType: "icon", src: {path: "/type"}},
                                            {tagType: "dbInput", value: "/name", options: {tagType: "text"}},
                                            {tagType: "padding", size: "10px"},
                                        ]},
                                    ]
                                }
                            ],
                            false: [
                                {tagType: "gridBox", axis: "c", allocation: "50% 1fr", children: [
                                    {tagType: "dbInput", value: "/type", options: {tagType: "text"}},
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

        this.update();
    }

    update() {
        for (const object of app.scene.outliner.root) {
            const div = document.createElement("div");
            div.textContent = object.name;
        }
    }
}