import { app } from "../../../../../main.js";
import { CreateShapeKeyCommand, DeleteShapeKeyCommand } from "../../../../commands/mesh/shapeKey.js";
import { ChangeParentCommand } from "../../../../commands/object/object.js";
import { ChangeParameterCommand } from "../../../../commands/utile/utile.js";
import { BMeshShapeKey } from "../../../../core/edit/objects/BMeshShapeKey.js";
import { changeParameter } from "../../../../utils/utility.js";

export class Area_Inspector {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"context": app.context,"scene": app.scene, "areaConfig": app.appConfig.areasConfig["Outliner"]},
            DOM: [
                {tagType: "path", sourceObject: "context/activeObject", updateEventTarget: {path: "context/%activeObject"}, children: [
                    {tagType: "section", name: "基本情報", children: [
                        {tagType: "if", formula: {source: "/type", conditions: "==", value: "グラフィックメッシュ"},
                            true: [
                                {tagType: "input", label: "名前", value: "/name", type: "text"},
                                {tagType: "select", label: "親",
                                    value: (value) => {
                                        app.operator.appendCommand(new ChangeParentCommand([app.context.activeObject], app.scene.objects.getObjectFromID(value)));
                                        app.operator.execute();
                                    },
                                    sourceObject: () => {
                                        return app.scene.objects.getObjectsFromeTypes(["ベジェモディファイア", "アーマチュア"]).map(object => {return {name: object.name, id: object.id}});
                                    },
                                    options: {initValue: {path: "context/activeObject/parent/name"}}
                                },
                                {tagType: "input", label: "表示順番", value: "/zIndex", type: "number", min: 0, max: 1000, step: 1},
                                {tagType: "input", label: "頂点数", value: "/verticesNum", type: "number", custom: {collision: false, visual: "1"}},
                                {tagType: "input", label: "編集", type: "checkbox", checked: "/editRock", look: {check: "rock", uncheck: "unrock"}},
                                {tagType: "select", label: "テクスチャ",
                                    value: (value) => {
                                        app.operator.appendCommand(new ChangeParameterCommand(app.context.activeObject, "texture", app.scene.objects.getObjectFromID(value), (o,p,v) => {o.changeTexture(v)}));
                                        app.operator.execute();
                                    },
                                    sourceObject: () => {
                                        return app.scene.objects.textures.map(texture => {return {name: texture.name, id: texture.id}});
                                    },
                                    options: {initValue: {path: "context/activeObject/texture/name"}}
                                },
                                {tagType: "path", sourceObject: "/texture", updateEventTarget: {path: "/%texture"}, children: [
                                    {tagType: "texture", label: "プレビュー", sourceTexture: "/texture"},
                                ]},
                                {tagType: "select", label: "マスク",
                                    value: (value) => {
                                        app.context.activeObject.changeClippingMask(app.scene.objects.getObjectFromID(value));
                                    },
                                    sourceObject: () => {
                                        return app.scene.objects.maskTextures.map(texture => {return {name: texture.name, id: texture.id}});
                                    },
                                    options: {initValue: {path: "context/activeObject/clippingMask/name"}}
                                },
                                {tagType: "select", label: "レンダリング",
                                    value: (value) => {
                                        app.context.activeObject.changeRenderingTarget(app.scene.objects.getObjectFromID(value));
                                    },
                                    sourceObject: () => {
                                        return [{name: "", id: null}].concat(app.scene.objects.maskTextures.map(texture => {return {name: texture.name, id: texture.id}}));
                                    },
                                    options: {initValue: {path: "context/activeObject/renderingTarget/name"}}
                                },
                                {tagType: "input", label: "自動のウェイト", type: "checkbox", checked:  "/autoWeight", look: {check: "check", uncheck: "uncheck"}},
                                {tagType: "input", label: "表示/非表示", type: "checkbox", checked:  "/visible", look: {check: "display", uncheck: "hide"}},
                            ],
                            false: [
                                {tagType: "if", formula: {source: "/type", conditions: "==", value: "ベジェモディファイア"},
                                    true: [
                                        {tagType: "input", label: "名前", value: "/name", type: "text"},
                                        {tagType: "select", label: "親",
                                            value: (value) => {
                                                app.operator.appendCommand(new ChangeParentCommand([app.context.activeObject], app.scene.objects.getObjectFromID(value)));
                                                app.operator.execute();
                                            },
                                            sourceObject: () => {
                                                return app.scene.objects.getObjectsFromeTypes(["ベジェモディファイア", "アーマチュア"]).map(object => {return {name: object.name, id: object.id}});
                                            },
                                            options: {initValue: {path: "context/activeObject/parent/name"}}
                                        },
                                        {tagType: "input", label: "ポイント数", value: "/pointsNum", type: "number", custom: {collision: false, visual: "1"}},
                                        {tagType: "input", label: "自動のウェイト", type: "checkbox", checked:  "/autoWeight", look: {check: "check", uncheck: "uncheck"}},
                                        {tagType: "input", label: "表示/非表示", type: "checkbox", checked:  "/visible", look: {check: "display", uncheck: "hide"}},
                                    ],
                                    false: [
                                        {tagType: "if", formula: {source: "/type", conditions: "==", value: "アーマチュア"},
                                            true: [
                                                {tagType: "input", label: "名前", value: "/name", type: "text"},
                                                {tagType: "input", label: "ボーン数", value: "/bonesNum", type: "number", custom: {collision: false, visual: "1"}},
                                                {tagType: "input", label: "表示/非表示", type: "checkbox", checked:  "/visible", look: {check: "display", uncheck: "hide"}},
                                            ],
                                            false: [
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]},
                    {tagType: "section", name: "シェイプキー", children: [
                        {tagType: "list", label: "シェイプキー", appendEvent: () => {
                            // app.operator.appendCommand(new CreateShapeKeyCommand("名称未設定"));
                            // app.operator.execute();
                        }, deleteEvent: (shapeKeys) => {
                            // app.operator.appendCommand(new DeleteShapeKeyCommand(shapeKeys));
                            // app.operator.execute();
                        }, activeEvent: (object) => {
                            // /** @type {BMeshShapeKey} */
                            // const bms = app.scene.editData.getEditObjectByObject(app.context.activeObject);
                            // changeParameter(bms, "activeShapeKey", object);
                            // bms.updateGPUData();
                        }, src: "/shapeKeyMetaDatas", type: "min", liStruct:[
                            {tagType: "gridBox", axis: "c", allocation: "1fr", children: [
                                {tagType: "dblClickInput", value: "/name"},
                            ]},
                        ]}
                    ]},
                ], errorChildren: [
                    {tagType: "section", name: "基本情報", children: []}
                ]},
                {tagType: "path", sourceObject: "scene/editData/editObjects/{context/activeObject/id}", updateEventTarget: "changeEditMode", children: [
                    {
                        tagType: "if", formula: {source: "/constructor/name", conditions: "==", value: "BMeshShapeKey"},
                        true: [
                            {tagType: "section", name: "シェイプキー", children: [
                                {tagType: "list", label: "シェイプキー", appendEvent: () => {
                                    app.operator.appendCommand(new CreateShapeKeyCommand("名称未設定"));
                                    app.operator.execute();
                                }, deleteEvent: (shapeKeys) => {
                                    app.operator.appendCommand(new DeleteShapeKeyCommand(shapeKeys));
                                    app.operator.execute();
                                }, activeEvent: (object) => {
                                    /** @type {BMeshShapeKey} */
                                    const bms = app.scene.editData.getEditObjectByObject(app.context.activeObject);
                                    changeParameter(bms, "activeShapeKey", object);
                                    bms.updateGPUData();
                                }, src: "/shapeKeys", type: "min", liStruct:[
                                    {tagType: "gridBox", axis: "c", allocation: "1fr", children: [
                                        {tagType: "dblClickInput", value: "/name"},
                                    ]},
                                ]}
                            ]},
                        ],
                        false: [
                            {
                                tagType: "if", formula: {source: "/constructor/name", conditions: "==", value: "BBezierShapeKey"},
                                true: [
                                    {tagType: "section", name: "シェイプキー", children: [
                                        {tagType: "list", label: "シェイプキー", appendEvent: () => {
                                            app.operator.appendCommand(new CreateShapeKeyCommand("名称未設定"));
                                            app.operator.execute();
                                        }, deleteEvent: (shapeKeys) => {
                                            app.operator.appendCommand(new DeleteShapeKeyCommand(shapeKeys));
                                            app.operator.execute();
                                        }, activeEvent: (object) => {
                                            /** @type {BMeshShapeKey} */
                                            const bms = app.scene.editData.getEditObjectByObject(app.context.activeObject);
                                            changeParameter(bms, "activeShapeKey", object);
                                            bms.updateGPUData();
                                        }, src: "/shapeKeys", type: "min", liStruct:[
                                            {tagType: "gridBox", axis: "c", allocation: "1fr", children: [
                                                {tagType: "dblClickInput", value: "/name"},
                                            ]},
                                        ]}
                                    ]},
                                ],
                                false: [
                                ]
                            }
                        ]
                    }
                ]},
                {tagType: "section", name: "詳細設定", children: [

                ]}
            ],
            utility: {
                "testTest": {}
            }
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct);
    }
}