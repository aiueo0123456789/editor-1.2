import { app } from "../../../../../main.js";
import { ChangeParentCommand } from "../../../../commands/object/object.js";
import { ChangeParameterCommand } from "../../../../commands/utile/utile.js";
import { appendAnimationToObject, deleteAnimationToObject } from "../../../../utils/objects/util.js";
import { changeParameter } from "../../../../utils/utility.js";

export class Area_Inspector {
    constructor(area) {
        this.dom = area.main;

        this.struct = {
            inputObject: {"context": app.context,"scene": app.scene, "areaConfig": app.appConfig.areasConfig["Outliner"]},
            DOM: [
                {tagType: "path", sourceObject: "context/activeObject", updateEventTarget: "アクティブオブジェクト", children: [
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
                                        {tagType: "input", label: "頂点数", value: "/pointNum", type: "number", custom: {collision: false, visual: "1"}},
                                    ],
                                    false: [
                                        {tagType: "if", formula: {source: "/type", conditions: "==", value: "アーマチュア"},
                                            true: [
                                                {tagType: "input", label: "名前", value: "/name", type: "text"},
                                                {tagType: "input", label: "最大ボーン数", value: "/boneNum", type: "number", custom: {visual: "1"}},
                                                {tagType: "input", label: "ボーン数", value: "/boneNum", type: "number", custom: {collision: false, visual: "1"}},
                                            ],
                                            false: [
                                                {tagType: "if", formula: {source: "/type", conditions: "==", value: "テクスチャ"},
                                                    true: [
                                                        {tagType: "input", label: "名前", value: "/name", type: "text"},
                                                        {tagType: "viewr", label: "テクスチャ", value: "/texture"},
                                                    ],
                                                    false: [
                                                        {tagType: "input", label: "対象オブジェクト", value: "/targetObjec/name", type: "text"},
                                                        {tagType: "input", label: "対象値", value: "/targetValue", type: "text"},
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]}
                ], errorChildren: [
                    {tagType: "section", name: "基本情報", children: []}
                ]},
                {tagType: "path", sourceObject: "context/activeObject", updateEventTarget: "アクティブオブジェクト", children: [
                    // {tagType: "if", formula: {source: "/", conditions: "in", value: "MAX_ANIMATIONS"},
                    //     true: [
                    //         {tagType: "section", name: "アニメーション", children: [
                    //             {tagType: "input", label: "アニメーション最大数", value: "/MAX_ANIMATIONS", options: {tagType: "number"}, custom: {collision: false, visual: "1"}},
                    //             {tagType: "list", name: "アニメーション", appendEvent: () => {
                    //                 appendAnimationToObject(app.context.activeObject, "新規");
                    //             }, deleteEvent: (animations) => {
                    //                 for (const animation of animations) {
                    //                     deleteAnimationToObject(app.context.activeObject, animation);
                    //                 }
                    //             }, withObject: "/animationBlock/animations", options: {type: "min", selectSource: {
                    //                 function: (index, object) => {
                    //                 },
                    //                 getFunction: (object) => {
                    //                 }
                    //             }, activeSource: {
                    //                 function: (index, object) => {
                    //                     changeParameter(app.context.activeObject.animationBlock, "activeAnimationIndex", index);
                    //                 },
                    //                 getFunction: (object) => {
                    //                     return object.user.animationBlock.activeAnimation == object;
                    //                 }
                    //             }}, liStruct:[
                    //                 {tagType: "gridBox", axis: "c", allocation: "50% 1fr 50px 20px", children: [
                    //                     {tagType: "dblClickInput", value: "/name", options: {tagType: "text"}},
                    //                     {tagType: "padding", size: "10px"},
                    //                     {tagType: "input", value: "/weight", options: {tagType: "number", min: 0, max: 1, step: 0.01}, custom: {visual: "1"}},
                    //                     {tagType: "hasKeyframeCheck", targetObject: "/keyframeBlockManager/blocksMap/weight"}
                    //                 ]},
                    //             ]},
                    //             {tagType: "path", sourceObject: "context/activeObject/animationBlock/activeAnimation", updateEventTarget: {path: "context/activeObject/animationBlock/activeAnimationIndex"}, children :[
                    //                 {tagType: "input", label: "名称", value: "/name", options: {tagType: "text"}},
                    //                 // {tagType: "padding", size: "10px"},
                    //                 {tagType: "input", label: "重み", value: "/weight", options: {tagType: "number", min: 0, max: 1, step: 0.01}, custom: {visual: "1"}},
                    //                 {tagType: "hasKeyframeCheck", label: "キーフレーム", targetObject: "/keyframeBlockManager/blocksMap/weight"}
                    //             ]}
                    //         ]}
                    //     ], false: [
                    //     ]
                    // }
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