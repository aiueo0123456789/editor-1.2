import { app } from "../../../../../main.js";
import { InputManager } from "../../../../app/inputManager/inputManager.js";
import { SelectOnlyKeyframeCommand } from "../../../../commands/utile/selectKeyframe.js";
import { Keyframe } from "../../../../core/objects/keyframeBlock.js";
import { ToolPanelOperator } from "../../../../operators/toolPanelOperator.js";
import { MathVec2 } from "../../../../utils/mathVec.js";
import { OutlinerTag } from "../../../../utils/ui/customTags/outlinerTag.js";
import { resizeObserver } from "../../../../utils/ui/resizeObserver.js";
import { createID, managerForDOMs, rgbToRgba } from "../../../../utils/ui/util.js";
import { calculateLocalMousePosition, changeParameter, errorCut, isPointInEllipse } from "../../../../utils/utility.js";
import { KeyDelete } from "../../../tools/KeyDelete.js";
import { KeyframeResize } from "../../../tools/KeyframeResize.js";
import { KeyframeTranslate } from "../../../tools/KeyframeTranslate.js";
import { TimelineSpaceData } from "../Timeline/area_TimelineSpaceData.js";

const targetValueToColor = {
    "x": "rgb(0, 0, 255)",
    "y": "rgb(0, 255, 0)",
    "sx": "rgb(255, 255, 0)",
    "sy": "rgb(0, 255, 255)",
    "r": "rgb(255, 0, 0)",
    "l": "rgb(247, 104, 237)",
}

export class Area_Timeline2 {
    constructor(area) {
        this.dom = area.main;
        /** @type {TimelineSpaceData} */
        this.spaceData = app.appConfig.areasConfig["Timeline"];

        this.camera = [0,0];
        // this.zoom = [1,1];
        this.zoom = [5,1];

        this.selectedOnly = false;

        this.spaceData.mode = "select";
        this.spaceData.mode = "move";

        this.frameBarDrag = false;

        this.struct = {
            inputObject: {"colorData": targetValueToColor, "context": app.context, "spaceData": this.spaceData, "areasConifg": app.appConfig.areasConfig, "scene": app.scene},
            DOM: [
                {tagType: "gridBox", style: "width: 100%; height: 100%;", axis: "r", allocation: "auto 1fr", children: [
                    {tagType: "option",style: "height: 25px;", name: "情報", children: [
                        {tagType: "gridBox", style: "width: 100%; height: 100%;", axis: "c", allocation: "1fr auto 1fr", children: [
                            {tagType: "gridBox", style: "width: 100%; height: 100%;", axis: "c", allocation: "auto auto auto 1fr", children: [
                                {tagType: "input", label: "現在", name: "frame_current", value: "scene/frame_current", type: "number", max: 500, min: -500},
                                {tagType: "input", label: "開始", name: "frame_start", value: "scene/frame_start", type: "number", max: 500, min: -500},
                                {tagType: "input", label: "終了", name: "frame_end", value: "scene/frame_end", type: "number", max: 500, min: -500},
                                {tagType: "padding", size: "10px"},
                            ]},
                            {tagType: "box", class: "boxs", children: [
                                {tagType: "button", icon: "reverseSkip", submitFunction: () => {
                                    changeParameter(app.scene, "frame_current", app.scene.frame_start);
                                }},
                                {tagType: "input", name: "isPlaying", type: "checkbox", checked: "scene/isReversePlaying", look: {check: "stop", uncheck: "reverse"}, useCommand: false},
                                {tagType: "input", name: "isPlaying", type: "checkbox", checked: "scene/isPlaying", look: {check: "stop", uncheck: "playing"}, useCommand: false},
                                {tagType: "button", icon: "skip", submitFunction: () => {
                                    changeParameter(app.scene, "frame_current", app.scene.frame_end);
                                }},
                            ]},
                            {tagType: "gridBox", style: "width: 100%; height: 100%;", axis: "c", allocation: "1fr auto auto auto", children: [
                                {tagType: "padding", size: "10px"},
                                {tagType: "input", label: "現在", name: "frame_current", value: "scene/frame_current", type: "number", max: 500, min: -500},
                                {tagType: "input", label: "開始", name: "frame_start", value: "scene/frame_start", type: "number", max: 500, min: -500},
                                {tagType: "input", label: "終了", name: "frame_end", value: "scene/frame_end", type: "number", max: 500, min: -500},
                            ]}
                        ]},
                    ]},
                    {tagType: "grid", axis: "c", child1: [
                        {tagType: "outliner", name: "outliner", id: "overview",
                            updateEventTarget: "選択物",
                            options: {
                                arrange: false,
                                clickEventFn: (event, object) => {
                                    // app.context.setSelectedObject(object, app.input.keysDown["Ctrl"]);
                                    // app.context.setActiveObject(object);
                                    event.stopPropagation();
                                }, rangeSelectEventFn: (event, array, startIndex, endIndex) => {
                                    // let minIndex = Math.min(startIndex, endIndex);
                                    // let maxIndex = Math.max(startIndex, endIndex);
                                    // for (let i = minIndex; i < maxIndex; i ++) {
                                    //     app.context.setSelectedObject(array[i], true);
                                    // }
                                    // app.context.setActiveObject(array[endIndex]);
                                },
                                activeSource: {object: "context", parameter: "activeObject"}, selectSource: {object: "context/selectedObjects"}
                            },
                            withObject: "spaceData/outlineData",
                            updateEventTarget: ["頂点選択","ボーン選択","オブジェクト選択"],
                            loopTarget: {
                                parameter: "type",
                                loopTargets: {
                                    // "キーフレームブロックマネージャー": ["blocks"],
                                    others: ["/children"],
                                }
                            },
                            structures: [
                                {tagType: "if", formula: {source: "/type", conditions: "==", value: "キーフレームブロック"},
                                    true: [
                                        {tagType: "gridBox", id: {path: "/pathID"}, axis: "c", style: "marginTop: 1px; marginBottom: 1px", allocation: "10px auto auto 1fr", children: [
                                            {tagType: "html", tag: "div", children: [
                                                {tagType: "color", src: "colorData/{/parameter}"},
                                            ]},
                                            {tagType: "icon", src: {path: "/type"}},
                                            {tagType: "input", type: "checkbox", checked: "/visible", look: {check: "display", uncheck: "hide"}},
                                            {tagType: "dblClickInput", value: "/parameter"},
                                        ]}
                                    ],
                                    false: [
                                        {tagType: "gridBox", id: {path: "/id"}, axis: "c", allocation: "auto 1fr", children: [
                                            {tagType: "icon", src: {path: "/type"}},
                                            {tagType: "dblClickInput", value: "/name"},
                                        ]}
                                    ]
                                }
                            ]
                        },
                    ],child2: [
                        {tagType: "box", id: "canvasContainer", style: "width: 100%; height: 100%; position: relative;", children: [
                            {tagType: "html", tag: "canvas", id: "timelineCanvasForGrid", style: "width: 100%; height: 100%; position: absolute; backgroundColor: var(--sub3Color);"},
                        ]},
                    ]}
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };

        this.creatorForUI = area.creatorForUI;
        this.creatorForUI.create(area.main, this.struct, {padding: false});

        this.toolPanelOperator = new ToolPanelOperator(this.creatorForUI.getDOMFromID("canvasContainer").element, {"g": KeyframeTranslate, "s": KeyframeResize, "x": KeyDelete});

        /** @type {OutlinerTag} */
        this.overview = this.creatorForUI.getDOMFromID("overview");
        // this.overview.scrollable.addEventListener("scroll", () => {

        // })
        console.log(this.overview)
        this.canvas = this.creatorForUI.getDOMFromID("timelineCanvasForGrid");
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.context = this.canvas.getContext("2d");//2次元描画

        this.canvasSize = [this.canvas.width,this.canvas.height];

        this.inputs = {click: [0,0], position: [0,0], movement: [0,0], clickPosition: [0,0], lastPosition: [0,0]};

        this.pixelDensity = 5;

        resizeObserver.push(this.canvas, () => {
            this.canvasRect = this.canvas.getBoundingClientRect();
            this.canvas.width = this.canvasRect.width * this.pixelDensity;
            this.canvas.height = this.canvasRect.height * this.pixelDensity;
            this.canvasSize = [this.canvas.width,this.canvas.height];
        });

        this.groupID = createID();
    }

    update() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // 直線表示関数
        const line = (p1,p2,thick,color) => {
            this.context.beginPath();            // 新しいパスを作成
            this.context.lineWidth = thick;      // 線の太さ
            this.context.strokeStyle = color;    // 線の色
            this.context.moveTo(...p1);          // 線の開始座標
            this.context.lineTo(...p2);          // 線の終了座標
            this.context.stroke();               // 輪郭を描画
        }

        const text = (p, string, size, color, align = 'left', baseline = 'alphabetic') => {
            // フォントスタイルを設定
            this.context.font = `${size}px Arial`;

            // 文字の色を設定
            this.context.fillStyle = color;
            // 配置を指定
            this.context.textAlign = align;       // 'left', 'center', 'right', 'start', 'end'
            this.context.textBaseline = baseline; // 'top', 'middle', 'bottom', 'alphabetic', 'hanging'

            // キャンバス上に文字を描画（x=50, y=50）
            this.context.fillText(string, ...p);
        }

        const gridRender = (gap, offset, width, color, string = false) => {
            const leftDown = this.canvasToWorld([0,this.canvasSize[1]]);
            const decimalOffset = MathVec2.modR(MathVec2.subR([0,0],leftDown), gap);
            for (let x = 0; x < this.canvas.width / this.zoom[0]; x += gap[0]) {
                const wx = this.worldToCanvas([x + leftDown[0] + decimalOffset[0] + offset[0],0])[0];
                line([wx, this.canvas.height], [wx,0], width, color);
            }
            if (string) {
                for (let x = 0; x < this.canvas.width / this.zoom[0]; x += gap[0]) {
                    const wx = this.worldToCanvas([x + leftDown[0] + decimalOffset[0], 0])[0];
                    line([wx, 0], [wx, 40], 10, "rgb(255,255,255)");
                    text([wx, 50], `${errorCut(x + leftDown[0] + decimalOffset[0])}`, 70, "rgb(255, 255, 255)", "center", "top");
                }
            }
        }

        function getGridStep(zoom) {
            const baseSteps = [1, 2, 3];
            const invZoom = 1 / zoom;
            const logZoom = Math.log10(invZoom);
            const power = Math.floor(logZoom);
            const base = Math.pow(10, power);

            const fraction = logZoom - power;
            let index = 0;
            if (fraction >= Math.log10(5)) {
                index = 2;
            } else if (fraction >= Math.log10(2)) {
                index = 1;
            } else {
                index = 0;
            }

            return (base * baseSteps[index]) * 20;
        }

        const gap = [getGridStep(this.zoom[0]),getGridStep(this.zoom[1])];
        const bigGap = MathVec2.scaleR(gap, 5);

        this.spaceData.outlineKefyframeData.forEach((keyframeBlock, index) => {
            const displayHeight = this.getKeyFrameBlockDisplayTop(keyframeBlock.pathID);
            // line([0, displayHeight], [o.canvasSize[0], displayHeight], 15 * o.pixelDensity - 1 * o.pixelDensity, targetValueToColor[keyframeBlock.parameter]);
            // line([0, displayHeight], [this.canvasSize[0], displayHeight], 15 * this.pixelDensity - 1 * this.pixelDensity, "rgb(65, 65, 65)");
        })

        // gridRender(gap, [0,0], 4, "rgb(72, 72, 72)");
        gridRender(bigGap, [0,0], 5, "rgb(18, 18, 18)", true);

        if (true) {
            const wx = this.worldToCanvas([app.scene.frame_current,0]);
            line([wx[0], this.canvas.height],[wx[0], 0],5,"rgb(185, 185, 185)");
        }

        const circle = (p, radius, color) => {
            this.context.fillStyle = color;
            this.context.beginPath();
            this.context.arc(...p, radius, 0, Math.PI * 2);
            this.context.fill();
        }
        this.spaceData.outlineKefyframeData.forEach((keyframeBlock, index) => {
            const displayHeight = this.getKeyFrameBlockDisplayTop(keyframeBlock.pathID);
            for (const keyframe of keyframeBlock.object.keys) {
                // 制御点と線
                const getColor = (b) => {
                    return b ? "rgb(255, 174, 0)" : "rgb(200, 200, 200)";
                }
                circle([this.getKeyframeDisplayLeft(keyframe), displayHeight], 15, getColor(keyframe.selectedPoint));
            }
        })
        circle(this.worldToCanvas(this.inputs.position), 20, "rgb(255, 0, 0)");
    }

    // キーフレームブロックの表示高さ
    getKeyFrameBlockDisplayTop(keyframeBlockPathID) {
        const overviewBoundingbox = this.overview.scrollableContainer.getBoundingClientRect();
        const tag = this.creatorForUI.getDOMFromID(keyframeBlockPathID);
        const boundingbox = tag.element.getBoundingClientRect();
        return (boundingbox.top + boundingbox.height - overviewBoundingbox.top + 7.5) * this.pixelDensity;
    }

    getKeyframeDisplayLeft(keyframe) {
        return this.worldToCanvas([keyframe.point[0], 0])[0];
    }

    getKeyframeDisplayPosition(keyframeBlockPathID, keyframe) {
        return [this.getKeyframeDisplayLeft(keyframe), this.getKeyFrameBlockDisplayTop(keyframeBlockPathID)];
    }

    clipToCanvas(p) {
        return MathVec2.mulR([p[0] / 2 + 0.5, 1 - (p[1] / 2 + 0.5)], this.canvasSize); // -1 ~ 1を0 ~ 1にしてyを0 ~ 1から1 ~ 0にしてcanvasSizeをかける
    }

    worldToCamera(p) {
        return MathVec2.mulR(MathVec2.subR(p, this.camera), MathVec2.scaleR(this.zoom, this.pixelDensity)); // (p - camera) * (zoom * pixelDensity)
    }

    cameraToWorld(p) {
        return MathVec2.addR(MathVec2.divR(p, MathVec2.scaleR(this.zoom,this.pixelDensity)), this.camera); // p / (zoom * pixelDensity) + camera
    }

    worldToClip(p) {
        return MathVec2.divR(this.worldToCamera(p), MathVec2.reverseScaleR(this.canvasSize, 2)); // worldToCamera(p) / (canvasSize / 2)
    }

    clipToWorld(p) {
        return this.cameraToWorld(MathVec2.mulR(p, MathVec2.reverseScaleR(this.canvasSize, 2))); // cameraToWorld(y * (canvasSize / 2)) = p
    }

    canvasToClip(p) {
        const a = MathVec2.divR(p,this.canvasSize);
        a[1] = 1 - a[1];
        return MathVec2.subR(MathVec2.scaleR(a, 2), [1,1]); // canvasで割ってyを1 ~ 0から 0 ~ 1にして-1 ~ 1
    }

    canvasToWorld(p) {
        return this.clipToWorld(this.canvasToClip(p));
    }

    worldToCanvas(p) {
        return this.clipToCanvas(this.worldToClip(p));
    }

    async keyInput(/** @type {InputManager} */inputManager) {
        let consumed = await this.toolPanelOperator.keyInput(inputManager); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
    }

    async mousedown(inputManager) {
        const mouseLocalPoint = calculateLocalMousePosition(this.canvas, inputManager.position, this.pixelDensity);
        const world = this.canvasToWorld(mouseLocalPoint);
        this.inputs.position = world;
        let consumed = await this.toolPanelOperator.mousedown(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
        app.operator.appendCommand(new SelectOnlyKeyframeCommand(mouseLocalPoint, !inputManager.keysDown["Shift"], this));
        app.operator.execute();
        if (Math.abs(world[0] - app.scene.frame_current) < 1) {
            this.frameBarDrag = true;
            return ;
        }
    }
    async mousemove(inputManager) {
        const local = MathVec2.scaleR(calculateLocalMousePosition(this.canvas, inputManager.position), this.pixelDensity);
        const world = this.canvasToWorld(local);
        this.inputs.lastPosition = [...this.inputs.position];
        MathVec2.sub(this.inputs.movement, world, this.inputs.position);
        this.inputs.position = world;

        if (this.frameBarDrag) {
            app.scene.frame_current += this.inputs.movement[0];
            document.body.style.cursor = "col-resize";
            return ;
        }

        let consumed = await this.toolPanelOperator.mousemove(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
    }
    mouseup(inputManager) {
        if (this.frameBarDrag) {
            this.frameBarDrag = false;
            document.body.style.cursor = "default";
        }
    }

    wheel(inputManager) {
        if (app.input.keysDown["Alt"]) {
            this.zoom[0] -= inputManager.wheelDelta[0] / 25;
            this.zoom[0] = Math.max(0.1,this.zoom[0]);
        } else {
            this.camera[0] += inputManager.wheelDelta[0] / this.zoom[0];
            this.camera[1] = -this.overview.scrollable.scrollTop;
        }
    }
}