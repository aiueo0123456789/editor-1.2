import { app } from "../../../../../main.js";
import { InputManager } from "../../../../app/inputManager/inputManager.js";
import { ToolPanelOperator } from "../../../../operators/toolPanelOperator.js";
import { MathVec2 } from "../../../../utils/mathVec.js";
import { resizeObserver } from "../../../../utils/ui/resizeObserver.js";
import { createID, managerForDOMs } from "../../../../utils/ui/util.js";
import { calculateLocalMousePosition, changeParameter, errorCut, isPointInEllipse } from "../../../../utils/utility.js";
import { KeyDelete } from "../../../tools/KeyDelete.js";
import { KeyframeResize } from "../../../tools/KeyframeResize.js";
import { KeyframeRotate } from "../../../tools/KeyframeRotate.js";
import { KeyframeTranslate } from "../../../tools/KeyframeTranslate.js";

const targetValueToColor = {
    "x": "rgb(0, 0, 255)",
    "y": "rgb(0, 255, 0)",
    "sx": "rgb(255, 255, 0)",
    "sy": "rgb(0, 255, 255)",
    "r": "rgb(255, 0, 0)",
}

function update(object, groupID, others, DOMs) {
    const o = others.object;
    // キャンバスの一部を消去
    o.context.clearRect(0, 0, o.canvas.width, o.canvas.height);

    // 直線表示関数
    const line = (p1,p2,thick,color) => {
        o.context.beginPath();            // 新しいパスを作成
        o.context.lineWidth = thick;      // 線の太さ
        o.context.strokeStyle = color;    // 線の色
        o.context.moveTo(...p1);          // 線の開始座標
        o.context.lineTo(...p2);          // 線の終了座標
        o.context.stroke();               // 輪郭を描画
    }

    const text = (p, string, size, color, align = 'left', baseline = 'alphabetic') => {
        // フォントスタイルを設定
        o.context.font = `${size}px Arial`;

        // 文字の色を設定
        o.context.fillStyle = color;
        // 配置を指定
        o.context.textAlign = align;       // 'left', 'center', 'right', 'start', 'end'
        o.context.textBaseline = baseline; // 'top', 'middle', 'bottom', 'alphabetic', 'hanging'

        // キャンバス上に文字を描画（x=50, y=50）
        o.context.fillText(string, ...p);
    }

    const gridRender = (gap, offset, width, color, string = false) => {
        const leftDown = o.canvasToWorld([0,o.canvasSize[1]]);
        const decimalOffset = MathVec2.modR(MathVec2.subR([0,0],leftDown), gap);
        for (let x = 0; x < o.canvas.width / o.zoom[0]; x += gap[0]) {
            const wx = o.worldToCanvas([x + leftDown[0] + decimalOffset[0] + offset[0],0])[0];
            line([wx, o.canvas.height], [wx,0], width, color);
        }
        for (let y = 0; y < o.canvas.height / o.zoom[1]; y += gap[1]) {
            const wy = o.worldToCanvas([0,y + leftDown[1] + decimalOffset[1] + offset[1]])[1];
            line([o.canvas.width, wy], [0, wy], width, color);
        }
        if (string) {
            for (let y = 0; y < o.canvas.height / o.zoom[1]; y += gap[1]) {
                const wy = o.worldToCanvas([0, y + leftDown[1] + decimalOffset[1]])[1];
                line([0, wy], [40, wy], 10, "rgb(255,255,255)");
                text([50, wy], `${errorCut(y + leftDown[1] + decimalOffset[1])}`, 70, "rgb(255, 255, 255)", "left", "middle");
            }
            for (let x = 0; x < o.canvas.width / o.zoom[0]; x += gap[0]) {
                const wx = o.worldToCanvas([x + leftDown[0] + decimalOffset[0], 0])[0];
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

    const gap = [getGridStep(o.zoom[0]),getGridStep(o.zoom[1])];
    const bigGap = MathVec2.scaleR(gap, 5);

    gridRender(gap, [0,0], 4, "rgb(72, 72, 72)");
    gridRender(bigGap, [0,0], 5, "rgb(18, 18, 18)", true);

    if (true) {
        const wx = o.worldToCanvas([app.scene.frame_current,0]);
        line([wx[0], o.canvas.height],[wx[0], 0],5,"rgb(185, 185, 185)");
    }

    const circle = (p, radius, color) => {
        o.context.fillStyle = color;
        o.context.beginPath();
        o.context.arc(...p, radius, 0, Math.PI * 2);
        o.context.fill();
    }
    const circleStroke = (p, radius, color, lineWidth) => {
        o.context.strokeStyle = color;
        o.context.lineWidth = lineWidth;
        o.context.beginPath();
        o.context.arc(...p, radius, 0, Math.PI * 2);
        // object.context.fill();
        o.context.stroke();
    }
    for (const keyframeBlock of o.spaceData.getAllKeyframeBlock) {
        if (keyframeBlock.visible) {
            o.context.strokeStyle = targetValueToColor[keyframeBlock.targetValue];
            o.context.lineWidth = 10;
            let lastData = keyframeBlock.keys[0];
            for (const keyData of keyframeBlock.keys.slice(1)) {
                // ベジェ曲線を描く
                o.context.beginPath();
                o.context.moveTo(...o.worldToCanvas(lastData.point.worldPosition));
                o.context.bezierCurveTo(
                    ...o.worldToCanvas(lastData.rightHandle.worldPosition),
                    ...o.worldToCanvas(keyData.leftHandle.worldPosition),
                    ...o.worldToCanvas(keyData.point.worldPosition)
                );
                o.context.strokeStyle = o.strokeStyle;
                o.context.stroke();
                lastData = keyData;
            }
            for (const keyData of keyframeBlock.keys) {
                lastData = keyData;
                // 制御点と線
                const getColor = (b) => {
                    // return b ? "rgb(255, 255, 255)" : "rgb(0,0,0)";
                    return b ? "rgb(255, 255, 255)" : targetValueToColor[keyframeBlock.targetValue];
                }
                circle(o.worldToCanvas(keyData.point.worldPosition), 20, getColor(keyData.pointSelected));
                circleStroke(o.worldToCanvas(keyData.leftHandle.worldPosition), 15, getColor(keyData.leftHandle.selected), 7);
                circleStroke(o.worldToCanvas(keyData.rightHandle.worldPosition), 15, getColor(keyData.rightHandle.selected), 7);
            }
        }
    }
    circle(o.worldToCanvas(o.inputs.position), 20, "rgb(255, 0, 0)");
}

export class Area_Timeline {
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
            inputObject: {"context": app.context, "areasConifg": app.appConfig.areasConfig, "scene": app.scene},
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
                                {tagType: "input", name: "isPlaying", type: "checkbox", checked: "scene/isReversePlaying", look: {check: "stop", uncheck: "reverse"}},
                                {tagType: "input", name: "isPlaying", type: "checkbox", checked: "scene/isPlaying", look: {check: "stop", uncheck: "playing"}},
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
                        // {tagType: "outliner", name: "outliner", id: "overview",
                        //     updateEventTarget: "選択物",
                        //     options: {
                        //         arrange: false,
                        //         clickEventFn: (event, object) => {
                        //             // app.context.setSelectedObject(object, app.input.keysDown["Ctrl"]);
                        //             // app.context.setActiveObject(object);
                        //             event.stopPropagation();
                        //         }, rangeSelectEventFn: (event, array, startIndex, endIndex) => {
                        //             // let minIndex = Math.min(startIndex, endIndex);
                        //             // let maxIndex = Math.max(startIndex, endIndex);
                        //             // for (let i = minIndex; i < maxIndex; i ++) {
                        //             //     app.context.setSelectedObject(array[i], true);
                        //             // }
                        //             // app.context.setActiveObject(array[endIndex]);
                        //         },
                        //         activeSource: {object: "context", parameter: "activeObject"}, selectSource: {object: "context/selectedObjects"}
                        //     },
                        //     withObject: "context/getSelcetInSelectedObject",
                        //     updateEventTarget: ["頂点選択","ボーン選択"],
                        //     loopTarget: {
                        //         parameter: "type",
                        //         loopTargets: {
                        //             "アーマチュア": ["/allBone"],
                        //             "ボーン": ["/keyframeBlockManager/blocks"],
                        //             "ベジェモディファイア": ["/allPoint"],
                        //             "ポイント": ["/basePoint/keyframeBlockManager/blocks", "/baseLeftControlPoint/keyframeBlockManager/blocks", "/baseRightControlPoint/keyframeBlockManager/blocks"],
                        //             "キーフレームブロックマネージャー": ["/blocks"],
                        //             others: ["/keyframeBlockManager/blocks"]
                        //         }
                        //     },
                        //     structures: [
                        //         {tagType: "if", formula: {source: "/type", conditions: "==", value: "キーフレームブロック"},
                        //             true: [
                        //                 {tagType: "gridBox", axis: "c", allocation: "auto auto 1fr 50%", children: [
                        //                     {tagType: "icon", src: {path: "/type"}},
                        //                     {tagType: "input", type: "checkbox", checked: "/visible", look: {check: "display", uncheck: "hide"}},
                        //                     {tagType: "padding", size: "10px"},
                        //                     {tagType: "dblClickInput", value: "/targetValue"},
                        //                 ]}
                        //             ],
                        //             false: [
                        //                 {tagType: "if", formula: {source: "/type", conditions: "==", value: "ボーン"},
                        //                     true: [
                        //                         {tagType: "gridBox", axis: "c", allocation: "auto 1fr 50%", children: [
                        //                             {tagType: "icon", src: {path: "/type"}},
                        //                             {tagType: "padding", size: "10px"},
                        //                             {tagType: "dblClickInput", value: "/name"},
                        //                         ]}
                        //                     ],
                        //                     false: [
                        //                         {tagType: "gridBox", axis: "c", allocation: "auto 1fr 50%", children: [
                        //                             {tagType: "icon", src: {path: "/type"}},
                        //                             {tagType: "padding", size: "10px"},
                        //                             {tagType: "dblClickInput", value: "/name"},
                        //                         ]}
                        //                     ]
                        //                 }
                        //             ]
                        //         }
                        //     ]
                        // },
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

        this.modalOperator = new ToolPanelOperator(this.creatorForUI.getDOMFromID("canvasContainer").element, {"g": KeyframeTranslate, "r": KeyframeRotate, "s": KeyframeResize, "x": KeyDelete});

        /** @type {HTMLElement} */
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
            update("タイムライン-canvas", this.groupID, {object: this});
        });

        this.groupID = createID();

        // managerForDOMs.set({o: "タイムライン-canvas", g: this.groupID}, update, {object: this});
        // managerForDOMs.set({o: "ボーン選択", g: this.groupID}, update, {object: this});
        // managerForDOMs.set({o: "頂点選択", g: this.groupID}, update, {object: this});
        // managerForDOMs.set({o: app.scene, i: "frame_current", g: this.groupID}, update, {object: this});
        // managerForDOMs.update({o: "タイムライン-canvas", g: this.groupID});
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
        let consumed = await this.modalOperator.keyInput(inputManager); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
        if (inputManager.consumeKeys(["a"])) {
            for (const key of this.spaceData.getAllKeyframe) {
                key.pointSelected = true;
            }
        }
    }

    async mousedown(inputManager) {
        const local = calculateLocalMousePosition(this.canvas, inputManager.position, this.pixelDensity);
        const world = this.canvasToWorld(local);
        this.inputs.position = world;
        if (Math.abs(world[0] - app.scene.frame_current) < 1) {
            this.frameBarDrag = true;
            return ;
        }
        let consumed = await this.modalOperator.mousedown(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
        if (!inputManager.keysDown["Shift"]) {
            for (const keyData of this.spaceData.getAllKeyframe) {
                keyData.pointSelected = false;
                keyData.rightHandleSelected = false;
                keyData.leftHandleSelected = false;
            }
            this.spaceData.selectVertices.length = 0;
        }
        if (inputManager.keysDown["c"]) {
            for (const keyData of this.spaceData.getAllKeyframe) {
                if (isPointInEllipse(world, keyData.point.worldPosition, MathVec2.divR([10,10],this.zoom))) {
                    keyData.pointSelected = true;
                }
                if (isPointInEllipse(world, keyData.leftHandle.worldPosition, MathVec2.divR([10,10],this.zoom))) {
                    keyData.leftHandleSelected = true;
                }
                if (isPointInEllipse(world, keyData.rightHandle.worldPosition, MathVec2.divR([10,10],this.zoom))) {
                    keyData.rightHandleSelected = true;
                }
            }
        } else {
            let minDist = Infinity;
            let minKey = null;
            let minPoint = null;
            for (const keyData of this.spaceData.getAllKeyframe) {
                let dist = MathVec2.distanceR(world, keyData.point.worldPosition);
                if (dist < minDist) {
                    minDist = dist;
                    minKey = keyData;
                    minPoint = "point";
                }
                dist = MathVec2.distanceR(world, keyData.wLeftHandle);
                if (dist < minDist) {
                    minDist = dist;
                    minKey = keyData;
                    minPoint = "leftHandle";
                }
                dist = MathVec2.distanceR(world, keyData.wRightHandle);
                if (dist < minDist) {
                    minDist = dist;
                    minKey = keyData;
                    minPoint = "rightHandle";
                }
            }
            if (minPoint == "point") {
                minKey.pointSelected = true;
                if (!this.spaceData.selectVertices.includes(minKey.point.worldPosition)) {
                    this.spaceData.selectVertices.push(minKey.point.worldPosition);
                }
            } else if (minPoint == "leftHandle") {
                minKey.leftHandleSelected = true;
                if (!this.spaceData.selectVertices.includes(minKey.wLeftHandle)) {
                    this.spaceData.selectVertices.push(minKey.wLeftHandle);
                }
            } else if (minPoint == "rightHandle") {
                minKey.rightHandleSelected = true;
                if (!this.spaceData.selectVertices.includes(minKey.wRightHandle)) {
                    this.spaceData.selectVertices.push(minKey.wRightHandle);
                }
            }
        }
        managerForDOMs.update({o: "タイムライン-canvas", g: this.groupID});
    }
    async mousemove(inputManager) {
        const local = MathVec2.scaleR(calculateLocalMousePosition(this.canvas, inputManager.position), this.pixelDensity);
        const world = this.canvasToWorld(local);
        this.inputs.lastPosition = [...this.inputs.position];
        MathVec2.sub(this.inputs.movement, world, this.inputs.position);
        this.inputs.position = world;

        if (this.frameBarDrag) {
            app.scene.frame_current += this.inputs.movement[0];
            managerForDOMs.update({o: "タイムライン-canvas", g: this.groupID});
            document.body.style.cursor = "col-resize";
            return ;
        }

        let consumed = await this.modalOperator.mousemove(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        managerForDOMs.update({o: "タイムライン-canvas", g: this.groupID});
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
            this.zoom[1] += inputManager.wheelDelta[1] / 25;
            this.zoom[0] = Math.max(0.1,this.zoom[0]);
            this.zoom[1] = Math.max(0.1,this.zoom[1]);
        } else {
            this.camera[0] += inputManager.wheelDelta[0] / this.zoom[0];
            this.camera[1] -= inputManager.wheelDelta[1] / this.zoom[1];
        }
        managerForDOMs.update({o: "タイムライン-canvas", g: this.groupID});
    }
}