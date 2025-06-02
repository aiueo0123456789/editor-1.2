import { app } from "../../app.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";

export class Area_Inspector {
    constructor(/** @type {HTMLElement} */dom) {
        this.dom = dom;

        this.inputObject = {"h": app.hierarchy, "scene": app.scene};

        this.struct = {
            DOM: [
                {type: "section", name: "情報", children: [
                    {type: "path", sourceObject: {object: "scene/state/activeObject"}, updateEventTarget: "アクティブオブジェクト", children: [
                        {type: "if", formula: {source: {object: "", parameter: "type"}, comparison: "グラフィックメッシュ"},
                            true: [
                                {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                {type: "input", label: "表示順番", withObject: {object: "", parameter: "zIndex"}, options: {type: "number"}},
                                {type: "input", label: "最大頂点数", withObject: {object: "", parameter: "MAX_VERTICES"}, options: {type: "number"}},
                                {type: "input", label: "頂点数", withObject: {object: "", parameter: "verticesNum"}, options: {type: "number"}},
                            ],
                            false: [
                                {type: "if", formula: {source: {object: "", parameter: "type"}, comparison: "ベジェモディファイア"},
                                    true: [
                                        {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                    ],
                                    false: [
                                        {type: "input", label: "名前", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                        {type: "input", label: "ボーン数", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                    ]
                                }
                            ]
                        }
                    ]}
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };

        this.creator = new CreatorForUI();
        this.creator.create(dom, this);

        this.update();
    }

    update() {
        for (const object of app.hierarchy.root) {
            const div = document.createElement("div");
            div.textContent = object.name;
        }
    }
}