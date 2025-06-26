import { app } from "../../app.js";
import { createID, managerForDOMs } from "../../UI/制御.js";
import { calculateLocalMousePosition, errorCut, isPointInEllipse } from "../../utility.js";
import { AnimationCollector } from "../../オブジェクト/アニメーションコレクター.js";
import { vec2 } from "../../ベクトル計算.js";
import { resizeObserver } from "../補助/canvasResizeObserver.js";
import { ModalOperator } from "../補助/ModalOperator.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";
import { KeyResize } from "./tools/KeyResize.js";
import { KeyRotate } from "./tools/KeyRotate.js";
import { KeyTranslate } from "./tools/KeyTranslate.js";

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
        const decimalOffset = vec2.modR(vec2.subR([0,0],leftDown), gap);
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
    const bigGap = vec2.scaleR(gap, 5);

    gridRender(gap, [0,0], 8, "rgb(40,40,40)");
    gridRender(bigGap, [0,0], 8, "rgb(20,20,20)", true);

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
    // let offset = 0;
    // for (const keyframeBlock of app.scene.objects.keyframeBlocks) {
    if (app.scene.state.activeObject) {
        if (app.scene.state.activeObject.type == "アーマチュア") {
            for (const bone of app.scene.state.activeObject.getSelectBones()) {
                for (const keyframeBlock of bone.keyframeBlockManager.blocks) {
                    if (keyframeBlock.visible) {
                        o.context.strokeStyle = targetValueToColor[keyframeBlock.targetValue];
                        o.context.lineWidth = 10;
                        let lastData = keyframeBlock.keys[0];
                        for (const keyData of keyframeBlock.keys.slice(1)) {
                            // ベジェ曲線を描く
                            o.context.beginPath();
                            o.context.moveTo(...o.worldToCanvas(lastData.point));
                            o.context.bezierCurveTo(
                                ...o.worldToCanvas(lastData.wRightHandle),
                                ...o.worldToCanvas(keyData.wLeftHandle),
                                ...o.worldToCanvas(keyData.point)
                            );
                            o.context.strokeStyle = o.strokeStyle;
                            o.context.stroke();
                            lastData = keyData;
                        }
                        for (const keyData of keyframeBlock.keys) {
                            lastData = keyData;
                            // 制御点と線
                            const getColor = (b) => {
                                return b ? "rgb(255, 255, 255)" : "rgb(0,0,0)";
                            }
                            circle(o.worldToCanvas(keyData.point), 20, getColor(keyData.pointSelected));
                            circleStroke(o.worldToCanvas(keyData.wLeftHandle), 15, getColor(keyData.leftHandleSelected), 7);
                            circleStroke(o.worldToCanvas(keyData.wRightHandle), 15, getColor(keyData.rightHandleSelected), 7);
                        }
                    }
                }
            }
        }
    }
    // offset ++;
    circle(o.worldToCanvas(o.inputs.position), 20, "rgb(255, 0, 0)");
}

export class Area_Timeline {
    constructor(/** @type {HTMLElement} */dom) {
        this.dom = dom;
        this.spaceData = app.appConfig.areasConfig["Timeline"];

        this.camera = [0,0];
        // this.zoom = [1,1];
        this.zoom = [5,5];

        this.selectedOnly = false;

        this.inputObject = {"areasConifg": app.appConfig.areasConfig, "h": app.hierarchy, "scene": app.scene, "animationPlayer": app.animationPlayer};

        this.spaceData.mode = "select";
        this.spaceData.mode = "move";

        this.frameBarDrag = false;

        this.struct = {
            DOM: [
                {type: "gridBox", style: "width: 100%; height: 100%;", axis: "r", allocation: "auto 1fr", children: [
                    {type: "option",style: "height: 25px;", name: "情報", children: [
                        {type: "gridBox", style: "height: fit-content;", axis: "c", allocation: "auto 1fr auto", children: [
                            {type: "gridBox", axis: "c", allocation: "auto auto", children: [
                                {type: "input", name: "isPlaying", withObject: {object: "animationPlayer", parameter: "isPlaying"}, options: {type: "checkbox", look: "isPlaying"}},
                                {type: "button", name: "skip", options: {type: "checkbox", look: "skip"}},
                            ]},
                            {type: "padding", size: "10px"},
                            {type: "gridBox", axis: "c", allocation: "auto auto auto", children: [
                                {type: "input", label: "現在", name: "frame_current", withObject: {object: "scene", parameter: "frame_current"}, options: {type: "number", max: 500, min: -500}, custom: {visual: "1"}},
                                {type: "input", label: "開始", name: "frame_start", withObject: {object: "scene", parameter: "frame_start"}, options: {type: "number", max: 500, min: -500}, custom: {visual: "1"}},
                                {type: "input", label: "終了", name: "frame_end", withObject: {object: "scene", parameter: "frame_end"}, options: {type: "number", max: 500, min: -500}, custom: {visual: "1"}},
                            ]},
                        ]}
                    ]},
                    {type: "gridBox", style: "width: 100%; height: 100%; overflow: auto;", axis: "c", allocation: "20% 1fr", name: "", children: [
                        {type: "gridBox", style: "width: 100%; height: 100%; overflow: auto;", axis: "r", allocation: "auto 1fr", name: "", children: [
                            {type: "input", options: {type: "text"}},
                            {type: "path", sourceObject: {function: {object: "scene/runtimeData/armatureData", function: "getSelectBone"}}, updateEventTarget: "ボーン選択", children: [
                                {type: "hierarchy", name: "hierarchy",
                                options: {
                                    arrange: false,
                                    clickEventFn: (event, object) => {
                                        // app.scene.state.setSelectedObject(object, app.input.keysDown["Ctrl"]);
                                        // app.scene.state.setActiveObject(object);
                                        event.stopPropagation();
                                    }, rangeSelectEventFn: (event, array, startIndex, endIndex) => {
                                        // let minIndex = Math.min(startIndex, endIndex);
                                        // let maxIndex = Math.max(startIndex, endIndex);
                                        // for (let i = minIndex; i < maxIndex; i ++) {
                                        //     app.scene.state.setSelectedObject(array[i], true);
                                        // }
                                        // app.scene.state.setActiveObject(array[endIndex]);
                                    },
                                    activeSource: {object: "scene/state", parameter: "activeObject"}, selectSource: {object: "scene/state/selectedObject"}
                                },
                                withObject: {object: ""},
                                loopTarget: {parameter: "type", loopTargets: {"アーマチュア": ["allBone"], "ボーン": ["keyframeBlockManager"], "キーフレームブロックマネージャー": ["blocks"], "others": ["animationBlock/animationBlock","keyframeBlockManager"]}},
                                structures: [
                                    {type: "if", formula: {source: {object: "", parameter: "type"}, conditions: "==", value: "キーフレームブロック"},
                                    true: [
                                        {type: "gridBox", axis: "c", allocation: "auto auto 1fr 50%", children: [
                                            {type: "icon-img", name: "icon", withObject: {object: "", parameter: "type"}},
                                            {type: "input", withObject: {object: "", parameter: "visible"}, options: {type: "checkbox", look: "eye-icon"}},
                                            {type: "padding", size: "10px"},
                                            {type: "dbInput", withObject: {object: "", parameter: "targetValue"}, options: {type: "text"}},
                                        ]}
                                    ],
                                    false: [
                                        {type: "if", formula: {source: {object: "", parameter: "type"}, conditions: "==", value: "ボーン"},
                                        true: [
                                            {type: "gridBox", axis: "c", allocation: "auto 1fr 50%", children: [
                                                {type: "icon-img", name: "icon", withObject: {object: "", parameter: "type"}},
                                                {type: "padding", size: "10px"},
                                                {type: "dbInput", withObject: {object: "", parameter: "index"}, options: {type: "text"}},
                                                // {type: "dbInput", withObject: {object: "", parameter: "id"}, options: {type: "text"}},
                                            ]}
                                        ],
                                        false: [
                                            {type: "gridBox", axis: "c", allocation: "auto 1fr 50%", children: [
                                                {type: "icon-img", name: "icon", withObject: {object: "", parameter: "type"}},
                                                {type: "padding", size: "10px"},
                                                {type: "dbInput", withObject: {object: "", parameter: "name"}, options: {type: "text"}},
                                            ]}
                                        ]}
                                    ]}
                                ]},
                            ]}
                        ]},
                        {type: "box", id: "canvasContainer", style: "width: 100%; height: 100%; position: relative;", children: [
                            {type: "canvas", id: "timelineCanvasForGrid", style: "width: 100%; height: 100%; position: absolute;"},
                        ]},
                    ]}
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };

        this.creator = new CreatorForUI();
        this.creator.create(dom, this, {padding: false});

        this.modalOperator = new ModalOperator(this.creator.getDOMFromID("canvasContainer"), {"g": KeyTranslate, "r": KeyRotate, "s": KeyResize});

        /** @type {HTMLElement} */
        this.canvas = this.creator.getDOMFromID("timelineCanvasForGrid");
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.context = this.canvas.getContext("2d");//2次元描画

        this.canvasSize = [this.canvas.width,this.canvas.height];

        this.inputs = {click: [0,0], position: [0,0], movement: [0,0], clickPosition: [0,0], lastPosition: [0,0]};

        this.pixelDensity = 5;

        resizeObserver.push(this.canvas, () => {
            this.canvasRect = this.canvas.getBoundingClientRect();
            console.log(this.canvasRect, [this.canvas.offsetWidth,this.canvas.offsetHeight])
            this.canvas.width = this.canvasRect.width * this.pixelDensity;
            this.canvas.height = this.canvasRect.height * this.pixelDensity;
            this.canvasSize = [this.canvas.width,this.canvas.height];
            update("タイムライン-canvas", this.groupID, {object: this});
        });

        this.groupID = createID();

        managerForDOMs.set({o: "タイムライン-canvas", g: this.groupID}, {object: this}, update);
        managerForDOMs.updateGroupInObject("タイムライン-canvas", this.groupID);
    }

    clipToCanvas(p) {
        return vec2.mulR([p[0] / 2 + 0.5, 1 - (p[1] / 2 + 0.5)], this.canvasSize); // -1 ~ 1を0 ~ 1にしてyを0 ~ 1から1 ~ 0にしてcanvasSizeをかける
    }

    worldToCamera(p) {
        return vec2.mulR(vec2.subR(p, this.camera), vec2.scaleR(this.zoom, this.pixelDensity)); // (p - camera) * (zoom * pixelDensity)
    }

    cameraToWorld(p) {
        return vec2.addR(vec2.divR(p, vec2.scaleR(this.zoom,this.pixelDensity)), this.camera); // p / (zoom * pixelDensity) + camera
    }

    worldToClip(p) {
        return vec2.divR(this.worldToCamera(p), vec2.reverseScaleR(this.canvasSize, 2)); // worldToCamera(p) / (canvasSize / 2)
    }

    clipToWorld(p) {
        return this.cameraToWorld(vec2.mulR(p, vec2.reverseScaleR(this.canvasSize, 2))); // cameraToWorld(y * (canvasSize / 2)) = p
    }

    canvasToClip(p) {
        const a = vec2.divR(p,this.canvasSize);
        a[1] = 1 - a[1];
        return vec2.subR(vec2.scaleR(a, 2), [1,1]); // canvasで割ってyを1 ~ 0から 0 ~ 1にして-1 ~ 1
    }

    canvasToWorld(p) {
        return this.clipToWorld(this.canvasToClip(p));
    }

    worldToCanvas(p) {
        return this.clipToCanvas(this.worldToClip(p));
    }

    async keyInput(inputManager) {
        let consumed = await this.modalOperator.keyInput(inputManager); // モーダルオペレータがアクションをおこしたら処理を停止
        if (consumed) return ;
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
            for (const keyData of this.spaceData.getAllKeyframe()) {
                keyData.pointSelected = false;
                keyData.rightHandleSelected = false;
                keyData.leftHandleSelected = false;
            }
            this.spaceData.selectVertices.length = 0;
        }
        if (inputManager.keysDown["c"]) {
            for (const keyData of this.spaceData.getAllKeyframe()) {
                if (isPointInEllipse(world, keyData.point, vec2.divR([10,10],this.zoom))) {
                    if (!this.spaceData.selectVertices.includes(keyData.point)) {
                        this.spaceData.selectVertices.push(keyData.point);
                    }
                    keyData.pointSelected = true;
                }
                if (isPointInEllipse(world, keyData.wLeftHandle, vec2.divR([10,10],this.zoom))) {
                    if (!this.spaceData.selectVertices.includes(keyData.wLeftHandle)) {
                        this.spaceData.selectVertices.push(keyData.wLeftHandle);
                    }
                    keyData.leftHandleSelected = true;
                }
                if (isPointInEllipse(world, keyData.wRightHandle, vec2.divR([10,10],this.zoom))) {
                    if (!this.spaceData.selectVertices.includes(keyData.wRightHandle)) {
                        this.spaceData.selectVertices.push(keyData.wRightHandle);
                    }
                    keyData.rightHandleSelected = true;
                }
            }
        } else {
            let minDist = Infinity;
            let minKey = null;
            let minPoint = null;
            for (const keyData of this.spaceData.getAllKeyframe()) {
                let dist = vec2.distanceR(world, keyData.point);
                if (dist < minDist) {
                    minDist = dist;
                    minKey = keyData;
                    minPoint = "point";
                }
                dist = vec2.distanceR(world, keyData.wLeftHandle);
                if (dist < minDist) {
                    minDist = dist;
                    minKey = keyData;
                    minPoint = "leftHandle";
                }
                dist = vec2.distanceR(world, keyData.wRightHandle);
                if (dist < minDist) {
                    minDist = dist;
                    minKey = keyData;
                    minPoint = "rightHandle";
                }
            }
            if (minPoint == "point") {
                minKey.pointSelected = true;
                if (!this.spaceData.selectVertices.includes(minKey.point)) {
                    this.spaceData.selectVertices.push(minKey.point);
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
        managerForDOMs.updateGroupInObject("タイムライン-canvas", this.groupID);
    }
    async mousemove(inputManager) {
        const local = vec2.scaleR(calculateLocalMousePosition(this.canvas, inputManager.position), this.pixelDensity);
        const world = this.canvasToWorld(local);
        this.inputs.lastPosition = [...this.inputs.position];
        vec2.sub(this.inputs.movement, world, this.inputs.position);
        this.inputs.position = world;

        if (this.frameBarDrag) {
            app.scene.frame_current += this.inputs.movement[0];
            managerForDOMs.updateGroupInObject("タイムライン-canvas", this.groupID);
            document.body.style.cursor = "col-resize";
            return ;
        }

        let consumed = await this.modalOperator.mousemove(this.inputs); // モーダルオペレータがアクションをおこしたら処理を停止
        managerForDOMs.updateGroupInObject("タイムライン-canvas", this.groupID);
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
        managerForDOMs.updateGroupInObject("タイムライン-canvas", this.groupID);
    }
}