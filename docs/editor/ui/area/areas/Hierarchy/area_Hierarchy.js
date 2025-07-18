import { app } from "../../../../app/app.js";

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
                {type: "hierarchy", name: "hierarchy", options: {arrange: true, clickEventFn: (event, object) => {
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
                    activeSource: {object: "scene/state", parameter: "activeObject"}, selectSource: {object: "scene/state/selectedObject"}}, withObject: "h/root", loopTarget: "children/objects", structures: [
                    {type: "gridBox", axis: "c", allocation: "auto auto 50% 1fr 20%", children: [
                        {type: "input", name: "visibleCheck", withObject: "/visible", options: {type: "checkbox", look: "eye-icon"}},
                        {type: "icon-img", name: "icon", withObject: "/type"},
                        {type: "dbInput", withObject: "/name", options: {type: "text"}},
                        {type: "padding", size: "10px"},
                        {type: "input", withObject: "/zIndex", options: {type: "number", min: 0, max: 100, step: 1}, custom: {visual: "1"}},
                    ]},
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
        for (const object of app.hierarchy.root) {
            const div = document.createElement("div");
            div.textContent = object.name;
        }
    }
}