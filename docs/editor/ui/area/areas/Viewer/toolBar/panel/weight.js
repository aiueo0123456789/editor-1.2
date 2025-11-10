import { app } from "../../../../../../../main.js";
import { BArmatureAnimation } from "../../../../../../core/edit/objects/BArmatureAnimation.js";
import { changeParameter } from "../../../../../../utils/utility.js";

export class WeightPaintPanel {
    constructor() {
        this.struct = {
            inputObject: {"context": app.context, "areasConifg": app.appConfig.areasConfig, "scene": app.scene, "values": this.values},
            DOM: [
                {tagType: "div", class: "sideBar-shelfe", children: [
                    {tagType: "panel", name: "ウェイトペイント", children: [
                        {
                            tagType: "list", label: "ボーン",
                            src: "context/activeObject/parent/boneMetaDatas",
                            activeEvent: (object) => {
                                changeParameter(app.appConfig.areasConfig["Viewer"].weightPaintMetaData,"weightBlockIndex",object.index)
                                app.scene.editData.allEditObjects.forEach(editObject => editObject instanceof BArmatureAnimation && (editObject.selectedClear(),editObject.select([object.index])));
                            },
                            type: "min",
                            liStruct:[
                                {
                                    tagType: "gridBox",
                                    axis: "c", allocation: "1fr", children: [
                                        {tagType: "dblClickInput", value: "/name", options: {tagType: "text"}},
                                    ]
                                },
                            ]
                        }
                    ]}
                ]}
            ]
        };
    }
}