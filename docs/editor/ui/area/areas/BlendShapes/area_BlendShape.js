import { app } from "../../../../../main.js";
import { InputManager } from "../../../../app/inputManager/inputManager.js";
import { CreateObjectCommand } from "../../../../commands/object/object.js";
import { ChangeParameterCommand } from "../../../../commands/utile/utile.js";
import { ToolPanelOperator } from "../../../../operators/toolPanelOperator.js";
import { ToolsBarOperator } from "../../../../operators/toolsBarOperator.js";
import { MathVec2 } from "../../../../utils/mathVec.js";
import { calculateLocalMousePosition, changeParameter, copyToArray } from "../../../../utils/utility.js";
import { Area_BlendShapeSpaceData } from "./area_BlendShapeSpaceData.js";
import { BlendShapePanel } from "./panel/blendShape.js";
import { BlendShapePointPanel } from "./panel/blendShapePoint.js";

export class Area_BlendShape {
    constructor(area) {
        this.dom = area.main;

        this.pixelDensity = 4;

        /** @type {Area_BlendShapeSpaceData} */
        this.areaConfig = app.appConfig.areasConfig["BlendShape"];

        this.struct = {
            inputObject: {"scene": app.scene, "areaConfig": this.areaConfig, "app": app},
            DOM: [
                {tagType: "gridBox", style: "width: 100%; height: 100%;", axis: "r", allocation: "auto 1fr", children: [
                    {tagType: "option", name: "情報", children: [
                        {tagType: "gridBox", axis: "c", allocation: "auto 1fr auto", children: [
                            {tagType: "select", label: "",
                                value: (value) => {
                                    changeParameter(this.areaConfig, "activeBlendShape", app.scene.objects.getObjectFromID(value));
                                },
                                sourceObject: () => {
                                    return app.scene.objects.blendShapes.map(blendShape => {return {name: blendShape.name, id: blendShape.id}});
                                }, options: {initValue: ""}
                            },
                            {tagType: "button", textContent: "追加", submitFunction: () => {
                                app.operator.appendCommand(new CreateObjectCommand({type: "ブレンドシェイプ", name: "名称未設定", dimension: 2, max: [10,10], min: [-10,-10], points: [], shapeKeys: []}));
                                app.operator.execute();
                            }},
                        ]}
                    ]},
                    {tagType: "box", id: "main", style: "width: 100%; height: 100%; position: relative;", children: [
                        {tagType: "box", id: "canvasContainer", style: "position: absolute; width: 100%; height: 100%; display: flex; justifyContent: center; alignItems: center; backgroundColor: rgb(55, 55, 55);", children: [
                            {tagType: "html", tag: "canvas", id: "renderingCanvas", style: "backgroundColor: rgb(208, 208, 208);"},
                        ]}
                    ]},
                ]}
            ],
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct);

        this.sideBarOperator = new ToolsBarOperator(this.creatorForUI.getDOMFromID("main").element, {});
        this.sideBarOperator.changeShelfes({"BlendShap": BlendShapePanel, "BlendShapePointPanel": BlendShapePointPanel});
        this.toolPanelOperator = new ToolPanelOperator(this.creatorForUI.getDOMFromID("main").element, {});

        this.box = this.creatorForUI.getDOMFromID("canvasContainer").element;
        /** @type {HTMLCanvasElement} */
        this.canvas = this.creatorForUI.getDOMFromID("renderingCanvas");
        this.context = this.canvas.getContext("2d");

        this.isMouseContentAndMouseDown = false;

        this.canvasResize();
    }

    canvasResize() {
        if (!this.activeBlendShape) return ;
        const size = MathVec2.subR(this.activeBlendShape.max,this.activeBlendShape.min);
        const ratio = size[0] / size[1];
        const rect = this.box.getBoundingClientRect();
        let targetWidth, targetHeight;
        // 親に合わせてまずは大きさを決定
        if (rect.width / rect.height > ratio) {
            // 親が横に広い → 高さ基準
            targetHeight = rect.height;
            targetWidth = targetHeight * ratio;
        } else {
            // 親が縦に広い → 幅基準
            targetWidth = rect.width;
            targetHeight = targetWidth / ratio;
        }
        // CSSサイズ（表示サイズ）
        this.canvas.style.width = `${targetWidth}px`;
        this.canvas.style.height = `${targetHeight}px`;
        // 内部描画サイズ（ぼやけ防止）
        this.canvas.width = Math.round(targetWidth) * this.pixelDensity;
        this.canvas.height = Math.round(targetHeight) * this.pixelDensity;
    }

    get activeBlendShape() {
        return this.areaConfig.activeBlendShape;
    }

    getCanvasPositionByValue(value) {
        return MathVec2.mulR([this.canvas.width, this.canvas.height], MathVec2.divR(MathVec2.subR(value, this.activeBlendShape.min), MathVec2.subR(this.activeBlendShape.max, this.activeBlendShape.min)));
    }
    getValueByLocalMousePosition(localMousePosition) {
        return MathVec2.addR(MathVec2.mulR(MathVec2.subR(this.activeBlendShape.max, this.activeBlendShape.min), MathVec2.divR(localMousePosition, [this.canvas.width, this.canvas.height])), this.activeBlendShape.min);
    }

    mousedown(inputManager) {
        for (const point of this.activeBlendShape.points) {
            if (MathVec2.distanceR(this.getCanvasPositionByValue(point.co), calculateLocalMousePosition(this.canvas, inputManager.position, this.pixelDensity)) < 5 * this.pixelDensity) {
                app.operator.appendCommand(new ChangeParameterCommand(this.activeBlendShape, "activePoint", point));
                app.operator.execute();
                return ;
            }
        }
        this.isMouseContentAndMouseDown = true;
        copyToArray(this.activeBlendShape.value,this.getValueByLocalMousePosition(calculateLocalMousePosition(this.canvas, inputManager.position, this.pixelDensity)));
    }

    mousemove(/** @type {InputManager} */ inputManager) {
        if (this.isMouseContentAndMouseDown) copyToArray(this.activeBlendShape.value,this.getValueByLocalMousePosition(calculateLocalMousePosition(this.canvas, inputManager.position, this.pixelDensity)));
    }

    mouseup(inputManager) {
        this.isMouseContentAndMouseDown = false;
        copyToArray(this.activeBlendShape.value,this.getValueByLocalMousePosition(calculateLocalMousePosition(this.canvas, inputManager.position, this.pixelDensity)));
    }

    update() {
        if (!this.activeBlendShape) return ;
        this.canvasResize();
        const line = (p1,p2,thick,color) => {
            this.context.beginPath();            // 新しいパスを作成
            this.context.lineWidth = thick * this.pixelDensity;      // 線の太さ
            this.context.strokeStyle = color;    // 線の色
            this.context.moveTo(...p1);          // 線の開始座標
            this.context.lineTo(...p2);          // 線の終了座標
            this.context.stroke();               // 輪郭を描画
        }

        const circle = (p, radius, color) => {
            this.context.fillStyle = color;
            this.context.beginPath();
            this.context.arc(...p, radius * this.pixelDensity, 0, Math.PI * 2);
            this.context.fill();
        }

        for (const triangle of this.activeBlendShape.triangles) {
            line(this.getCanvasPositionByValue(triangle[0].co), this.getCanvasPositionByValue(triangle[1].co), 1, "rgb(0, 0, 0)");
            line(this.getCanvasPositionByValue(triangle[1].co), this.getCanvasPositionByValue(triangle[2].co), 1, "rgb(0, 0, 0)");
            line(this.getCanvasPositionByValue(triangle[2].co), this.getCanvasPositionByValue(triangle[0].co), 1, "rgb(0, 0, 0)");
        }
        for (const point of this.activeBlendShape.points) {
            circle(this.getCanvasPositionByValue(point.co), 5, "rgb(0, 0, 0)");
            circle(this.getCanvasPositionByValue(point.co), 4, this.activeBlendShape.activePoint === point ? "rgb(255, 247, 0)" : "rgb(17, 255, 0)");
        }
        circle(this.getCanvasPositionByValue(this.activeBlendShape.value), 5, "rgb(255, 0, 0)");
    }
}