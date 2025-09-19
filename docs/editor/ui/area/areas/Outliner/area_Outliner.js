import { app } from "../../../../app/app.js";

export class Area_Outliner {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"outliner": app.scene.outliner, "scene": app.scene, "areaConfig": app.appConfig.areasConfig["Outliner"]},
            DOM: [
                {type: "outliner", name: "outliner", options: {arrange: true, clickEventFn: (event, object) => {
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
                    activeSource: {object: "scene/state", parameter: "activeObject"}, selectSource: {object: "scene/state/selectedObject"}}, withObject: "outliner/root", loopTarget: "children", structures: [
                        {
                            type: "if",
                            formula: {source: "/", conditions: "in", value: "name"},
                            true: [
                                {
                                    type: "if",
                                    formula: {source: "/", conditions: "in", value: "zIndex"},
                                    true: [
                                        {type: "gridBox", axis: "c", allocation: "auto 50% 1fr auto 20%", children: [
                                            {type: "icon-img", name: "icon", withObject: "/type"},
                                            {type: "dbInput", withObject: "/name", options: {type: "text"}},
                                            {type: "padding", size: "10px"},
                                            {type: "input", name: "visibleCheck", withObject: "/visible", options: {type: "checkbox", look: "eye-icon"}},
                                            {type: "input", withObject: "/zIndex", options: {type: "number", min: 0, max: 100, step: 1}, custom: {visual: "1"}},
                                        ]},
                                    ],
                                    false: [
                                        {type: "gridBox", axis: "c", allocation: "auto 50% 1fr", children: [
                                            {type: "icon-img", name: "icon", withObject: "/type"},
                                            {type: "dbInput", withObject: "/name", options: {type: "text"}},
                                            {type: "padding", size: "10px"},
                                        ]},
                                    ]
                                }
                            ],
                            false: [
                                {type: "gridBox", axis: "c", allocation: "50% 1fr", children: [
                                    {type: "dbInput", withObject: "/type", options: {type: "text"}},
                                    {type: "padding", size: "10px"},
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