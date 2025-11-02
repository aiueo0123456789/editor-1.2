import { app } from "../../../../../main.js";
import { AppendBlendShapePointCommand, AppendShapeKeyInBlendShapeCommand } from "../../../../commands/mesh/shapeKey.js";
import { CreateObjectCommand, DeleteObjectCommand } from "../../../../commands/object/object.js";
import { BlendShape } from "../../../../core/objects/blendShape.js";
import { mathVec2 } from "../../../../utils/mathVec.js";
import { calculateLocalMousePosition, objectInit } from "../../../../utils/utility.js";

export class Area_Property {
    constructor(area) {
        this.dom = area.main;

        this.pixelDensity = 4;

        this.struct = {
            inputObject: {"scene": app.scene, "areaConfig": app.appConfig.areasConfig["Outliner"], "app": app},
            DOM: [
                {tagType: "section", name: "アニメーション", children: [
                    {tagType: "input", label: "開始", value: "scene/frame_start", type: "number", min: 0, max: 500, step: 1, custom: {visual: "range"}},
                    {tagType: "input", label: "終了", value: "scene/frame_end", type: "number", min: 0, max: 500, step: 1, custom: {visual: "range"}},
                    {tagType: "input", label: "再生速度", value: "scene/frame_speed", type: "number", min: 0, max: 10, step: 0.1, custom: {visual: "range"}},
                ]},
                {tagType: "section", name: "マスク", children: [
                    {tagType: "list", label: "マスク", appendEvent: () => {
                        app.operator.appendCommand(new CreateObjectCommand({type: "マスクテクスチャ", name: "名称未設定"}));
                        app.operator.execute();
                    }, deleteEvent: (masks) => {
                        app.operator.appendCommand(new DeleteObjectCommand(masks));
                        app.operator.execute();
                    }, src: "scene/objects/maskTextures", type: "min", liStruct:[
                        {tagType: "gridBox", axis: "c", allocation: "1fr", children: [
                            {tagType: "dblClickInput", value: "/name", options: {tagType: "text"}},
                        ]},
                    ]}
                ]},
                // {tagType: "section", name: "パラメーターコレクター", children: [
                //     {tagType: "list", appendEvent: () => {
                //         // appendAnimationToObject(app.context.activeObject, "新規");
                //     }, deleteEvent: (animations) => {
                //         for (const animation of animations) {
                //             // deleteAnimationToObject(app.context.activeObject, animation);
                //         }
                //     }, src: "scene/objects/parameterManagers", options: {}, liStruct:[
                //         {tagType: "nodeFromFunction", source: "/getNodeData"}
                //     ]}
                // ]},
                {tagType: "section", name: "カメラ", children: [
                    {tagType: "input", label: "表示範囲x", value: "scene/objects/renderingCamera/displayRange/0", type: "number", min: 1, max: 2048, step: 1, custom: {visual: "range"}},
                    {tagType: "input", label: "表示範囲y", value: "scene/objects/renderingCamera/displayRange/1", type: "number", min: 1, max: 2048, step: 1, custom: {visual: "range"}},
                ]},
                // {tagType: "section", name: "ブレンドアニメーション", children: [
                //     {tagType: "list", label: "ブレンドアニメーション", appendEvent: () => {
                //         app.operator.appendCommand(new CreateObjectCommand({type: "ブレンドシェイプ", name: "名称未設定", dimension: 2, max: [10,10], min: [-10,-10], points: [], shapeKeys: []}));
                //         app.operator.execute();
                //     }, deleteEvent: (blendShape) => {
                //         app.operator.appendCommand(new DeleteObjectCommand(blendShape));
                //         app.operator.execute();
                //     }, src: "scene/objects/blendShapes", liStruct:[
                //         {tagType: "box", children: [
                //             {tagType: "gridBox", axis: "c", allocation: "100px 1fr 20px 100px", style: "maxHeight: 100px; height: 100px;", children: [
                //                 {tagType: "dblClickInput", value: "/name", options: {tagType: "text"}},
                //                 {tagType: "canvas", color: "rgb(211, 211, 211)", draw: (/** @type {HTMLCanvasElement} */cvs, /** @type {BlendShape} */object) => {
                //                 }, init: (/** @type {HTMLCanvasElement} */cvs, /** @type {BlendShape} */object) => {
                //                     const ctx = cvs.getContext("2d");
                //                     let isClick = false;
                //                     const getCanvasPositionByValue = (value) => {
                //                         return mathVec2.mulR([cvs.width, cvs.height], mathVec2.divR(mathVec2.subR(value, object.min), mathVec2.subR(object.max, object.min)));
                //                     }
                //                     const getValueByLocalMousePosition = (localMousePosition) => {
                //                         return mathVec2.addR(mathVec2.mulR(mathVec2.subR(object.max, object.min), mathVec2.divR(mathVec2.scaleR(localMousePosition, this.pixelDensity), [cvs.width, cvs.height])), object.min);
                //                     }
                //                     cvs.addEventListener("mousedown",() => {
                //                         for (const point of object.points) {
                //                             if (mathVec2.distanceR(point.co, getValueByLocalMousePosition(calculateLocalMousePosition(cvs, app.input.position, 1))) < 2) {
                //                                 object.activePoint = point;
                //                                 return ;
                //                             }
                //                         }
                //                         isClick = true;
                //                         mathVec2.set(object.value, getValueByLocalMousePosition(calculateLocalMousePosition(cvs, app.input.position, 1)));
                //                     })
                //                     cvs.addEventListener("mouseup",() => {
                //                         isClick = false;
                //                         mathVec2.set(object.value, getValueByLocalMousePosition(calculateLocalMousePosition(cvs, app.input.position, 1)));
                //                     })
                //                     cvs.addEventListener("mousemove",() => {
                //                         if (isClick) mathVec2.set(object.value, getValueByLocalMousePosition(calculateLocalMousePosition(cvs, app.input.position, 1)));
                //                     })

                //                     const line = (p1,p2,thick,color) => {
                //                         ctx.beginPath();            // 新しいパスを作成
                //                         ctx.lineWidth = thick * this.pixelDensity;      // 線の太さ
                //                         ctx.strokeStyle = color;    // 線の色
                //                         ctx.moveTo(...p1);          // 線の開始座標
                //                         ctx.lineTo(...p2);          // 線の終了座標
                //                         ctx.stroke();               // 輪郭を描画
                //                     }

                //                     const circle = (p, radius, color) => {
                //                         ctx.fillStyle = color;
                //                         ctx.beginPath();
                //                         ctx.arc(...p, radius * this.pixelDensity, 0, Math.PI * 2);
                //                         ctx.fill();
                //                     }

                //                     const update = () => {
                //                         const size = mathVec2.subR(object.max, object.min);
                //                         const ratio = size[0] / size[1];
                //                         const rect = cvs.parentElement.getBoundingClientRect();
                //                         let targetWidth, targetHeight;
                //                         // 親に合わせてまずは大きさを決定
                //                         if (rect.width / rect.height > ratio) {
                //                             // 親が横に広い → 高さ基準
                //                             targetHeight = rect.height;
                //                             targetWidth = targetHeight * ratio;
                //                         } else {
                //                             // 親が縦に広い → 幅基準
                //                             targetWidth = rect.width;
                //                             targetHeight = targetWidth / ratio;
                //                         }
                //                         // CSSサイズ（表示サイズ）
                //                         cvs.style.width = `${targetWidth}px`;
                //                         cvs.style.height = `${targetHeight}px`;

                //                         // 内部描画サイズ（ぼやけ防止）
                //                         cvs.width = Math.round(targetWidth) * this.pixelDensity;
                //                         cvs.height = Math.round(targetHeight) * this.pixelDensity;

                //                         ctx.clearRect(0, 0, cvs.width, cvs.height);

                //                         for (const triangle of object.triangles) {
                //                             line(getCanvasPositionByValue(triangle[0].co), getCanvasPositionByValue(triangle[1].co), 1, "rgb(0, 0, 0)");
                //                             line(getCanvasPositionByValue(triangle[1].co), getCanvasPositionByValue(triangle[2].co), 1, "rgb(0, 0, 0)");
                //                             line(getCanvasPositionByValue(triangle[2].co), getCanvasPositionByValue(triangle[0].co), 1, "rgb(0, 0, 0)");
                //                         }

                //                         for (const point of object.points) {
                //                             circle(getCanvasPositionByValue(point.co), 3, "rgb(0, 0, 0)");
                //                             circle(getCanvasPositionByValue(point.co), 2, object.activePoint == point ? "rgb(216, 255, 62)" : "rgb(62, 255, 85)");
                //                         }

                //                         circle(getCanvasPositionByValue(object.value), 4, "rgb(255, 0, 0)");
                //                         requestAnimationFrame(update);
                //                     }
                //                     update();
                //                 }},
                //                 {tagType: "box", children: [
                //                     {tagType: "button", textContent: "追加", submitFunction: (object) => {
                //                         app.operator.appendCommand(new AppendBlendShapePointCommand(object));
                //                         app.operator.execute();
                //                     }},
                //                 ]},
                //                 {tagType: "box", children: [
                //                     {tagType: "input", label: "max", value: "/max/0", type: "number"},
                //                     {tagType: "input", label: "max", value: "/max/1", type: "number"},
                //                     {tagType: "input", label: "min", value: "/min/0", type: "number"},
                //                     {tagType: "input", label: "min", value: "/min/1", type: "number"},
                //                     {tagType: "input", label: "value", value: "/value/0", type: "number"},
                //                     {tagType: "input", label: "value", value: "/value/1", type: "number"},
                //                 ]}
                //             ]},
                //             {tagType: "gridBox", axis: "c", allocation: "1fr", style: "maxHeight: 100px; height: 100px;", children: [
                //                 {tagType: "list", appendEvent: (object) => {
                //                     app.operator.appendCommand(new AppendShapeKeyInBlendShapeCommand(object));
                //                     app.operator.execute();
                //                 }, deleteEvent: (blendShape) => {
                //                     // app.operator.appendCommand(new DeleteObjectCommand(blendShape));
                //                     // app.operator.execute();
                //                 }, src: "/shapeKeys", liStruct:[
                //                     {tagType: "dblClickInput", value: "/name", options: {tagType: "text"}},
                //                 ]}
                //             ]},
                //         ]},
                //     ]}
                // ]}
            ],
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct);
    }
}