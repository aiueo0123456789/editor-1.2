import { app } from "../../../../app/app.js";

export class Area_NodeEditor {
    constructor(area) {
        this.dom = area.main;
        this.spaceData = app.appConfig.areasConfig["Timeline"];

        this.camera = [0,0];
        // this.zoom = [1,1];
        this.zoom = [5,5];

        this.selectedOnly = false;

        this.spaceData.mode = "select";
        this.spaceData.mode = "move";

        this.frameBarDrag = false;

        this.struct = {
            inputObject: {"areasConifg": app.appConfig.areasConfig, "h": app.hierarchy, "scene": app.scene, "animationPlayer": app.animationPlayer},
            DOM: [
                {type: "textarea", source: "scene/objects/particles/0/updatePipelineCode"}
            ],
            utility: {
                "testTest": {}
            }
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct, {padding: false});
    }
}