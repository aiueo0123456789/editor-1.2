import { app } from "../../app.js";
import { keysDown } from "../../main.js";
import { createID, managerForDOMs } from "../../UI/制御.js";
import { calculateLocalMousePosition } from "../../utility.js";
import { vec2 } from "../../ベクトル計算.js";
import { resizeObserver } from "../補助/canvasResizeObserver.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";

function keyClickEventFn(object, dom) {
    app.appConfig.areasConfig["Timeline"].selectKeys.push(object);
    dom.style.backgroundColor = "rgb(255,0,255)";
}

function createTimeline() {
}

function getDecimalPart(num) {
    return num - Math.floor(num);
}

export class Area_Timeline {
    constructor(/** @type {HTMLElement} */dom) {
        this.dom = dom;

        this.scroll = [0,0];
        // this.zoom = [1,1];
        this.zoom = [5,5];

        this.inputObject = {"areasConifg": app.appConfig.areasConfig, "h": app.hierarchy, "scene": app.scene, "animationPlayer": app.animationPlayer};

        app.appConfig.areasConfig["Timeline"].mode = "select";
        app.appConfig.areasConfig["Timeline"].mode = "move";
        const keyMoveStartFn = () => {
            app.appConfig.areasConfig["Timeline"].mode = "move";
        }
        dom.addEventListener("mousemove", () => {
            if (app.appConfig.areasConfig["Timeline"].mode == "move") {
                for (const object of app.scene.animationCollectors) {
                    for (const key of object.keyframe.keys) {
                        const dom = managerForDOMs.getDOMInObjectAndGroupID(key);
                        if (dom) {
                            dom.style.left = `${key.frame}px`;
                        }
                    }
                }
            }
        })
        // const keyMoveMoveFn = () => {
        //     if (keysDown["g"]) {
        //         app.appConfig.areasConfig["Timeline"].mode = "select";
        //     }
        //     object.frame += 1;
        // }

        this.struct = {
            DOM: [
                {type: "option", name: "情報", children: [
                    {type: "input", name: "visibleCheck", withObject: {object: "animationPlayer", parameter: "isPlaying"}, options: {type: "check", look: "isPlaying"}},
                ]},
                {type: "box", style: "width: 100%; height: 100%;",children: [
                    {type: "gridBox", style: "width: 100%; height: 100%;", axis: "c", allocation: "auto 1fr", name: "", children: [
                        {type: "gridBox", axis: "r", allocation: "auto 1fr", name: "", children: [
                            {type: "input", options: {type: "text"}},
                            {type: "list", options: {type: "", select: true}, withObject: {object: "scene/animationCollectors"}, liStruct: [
                                {type: "div", style: "display: flex; height: 20px;", children: [
                                    {type: "icon-img", name: "icon", withObject: {object: "", parameter: "type"}},
                                    {type: "dbInput", withObject: {object: "", parameter: "name"}},
                                ]},
                            ]}
                        ]},
                        {type: "canvas", id: "timelineCanvas", style: "width: 100%; height: 100%; backgroundColor: rgb(52, 52, 52);"}
                    ]}
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };

        this.creator = new CreatorForUI();
        this.creator.create(dom, this);

        /** @type {HTMLElement} */
        this.canvas = this.creator.getDOMFromID("timelineCanvas");
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.context = this.canvas.getContext("2d");//2次元描画

        this.canvasSize = [this.canvas.width,this.canvas.height];

        this.mouseState = {worldPosition: [0,0], movement: [0,0]};

        this.pixelDensity = 5;

        const clipToCanvas = (p) => {
            return vec2.mulR([p[0] / 2 + 0.5, 1 - (p[1] / 2 + 0.5)], this.canvasSize); // -1 ~ 1を0 ~ 1にしてyを0 ~ 1から1 ~ 0にしてcanvasSizeをかける
        }

        const worldToCamera = (p) => {
            return vec2.mulR(vec2.subR(p, this.scroll), vec2.scaleR(this.zoom, this.pixelDensity)); // (p - camera) * (zoom * pixelDensity)
        }

        const cameraToWorld = (p) => {
            return vec2.addR(vec2.divR(p, vec2.scaleR(this.zoom,this.pixelDensity)), this.scroll); // p / (zoom * pixelDensity) + camera
        }

        const worldToClip = (p) => {
            return vec2.divR(worldToCamera(p), vec2.reverseScaleR(this.canvasSize, 2)); // worldToCamera(p) / (canvasSize / 2)
        }

        const clipToWorld = (p) => {
            return cameraToWorld(vec2.mulR(p, vec2.reverseScaleR(this.canvasSize, 2))); // cameraToWorld(y * (canvasSize / 2)) = p
        }

        const canvasToClip = (p) => {
            const a = vec2.divR(p,this.canvasSize);
            a[1] = 1 - a[1];
            return vec2.subR(vec2.scaleR(a, 2), [1,1]); // canvasで割ってyを1 ~ 0から 0 ~ 1にして-1 ~ 1
        }

        const canvasToWorld = (p) => {
            return clipToWorld(canvasToClip(p));
        }

        const worldToCanvas = (p) => {
            return clipToCanvas(worldToClip(p));
        }

        const update = () => {
            // キャンバスの一部を消去
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
                const leftDown = canvasToWorld([0,this.canvasSize[1]]);
                const decimalOffset = vec2.modR(vec2.subR([0,0],leftDown), gap);
                for (let x = 0; x < this.canvas.width / this.zoom[0]; x += gap[0]) {
                    const wx = worldToCanvas([x + leftDown[0] + decimalOffset[0] + offset[0],0])[0];
                    line([wx, this.canvas.height], [wx,0], width, color);
                }
                for (let y = 0; y < this.canvas.height / this.zoom[1]; y += gap[1]) {
                    const wy = worldToCanvas([0,y + leftDown[1] + decimalOffset[1] + offset[1]])[1];
                    line([this.canvas.width, wy], [0, wy], width, color);
                }
                if (string) {
                    for (let y = 0; y < this.canvas.height / this.zoom[1]; y += gap[1]) {
                        const wy = worldToCanvas([0, y + leftDown[1] + decimalOffset[1]])[1];
                        line([0, wy], [40, wy], 10, "rgb(255,255,255)");
                        text([50, wy], `${Math.round(y + leftDown[1] + decimalOffset[1])}`, 70, "rgb(255, 255, 255)", "left", "middle");
                    }
                    for (let x = 0; x < this.canvas.width / this.zoom[0]; x += gap[0]) {
                        const wx = worldToCanvas([x + leftDown[0] + decimalOffset[0], 0])[0];
                        line([wx, 0], [wx, 40], 10, "rgb(255,255,255)");
                        text([wx, 50], `${Math.round(x + leftDown[0] + decimalOffset[0])}`, 70, "rgb(255, 255, 255)", "center", "top");
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
            const bigGap = vec2.scaleR(gap, 5);

            gridRender(gap, [0,0], 8, "rgb(40,40,40)");
            gridRender(bigGap, [0,0], 8, "rgb(20,20,20)", true);

            line(worldToCanvas([app.scene.frame_current,-1000]),worldToCanvas([app.scene.frame_current,1000]),5,"rgb(185, 185, 185)");

            const circle = (p, radius, color) => {
                this.context.fillStyle = color;
                this.context.beginPath();
                this.context.arc(...p, radius, 0, Math.PI * 2);
                this.context.fill();
            }
            const circleStroke = (p, radius, color, lineWidth) => {
                this.context.strokeStyle = color;
                this.context.lineWidth = lineWidth;
                this.context.beginPath();
                this.context.arc(...p, radius, 0, Math.PI * 2);
                // this.context.fill();
                this.context.stroke();
            }
            // let offset = 0;
            for (const AnimationCollector of app.scene.animationCollectors) {
                this.context.strokeStyle = "rgba(62, 62, 255, 0.5)";
                this.context.lineWidth = 10;
                let lastData = AnimationCollector.keyframe.keys[0];
                for (const keyData of AnimationCollector.keyframe.keys.slice(1)) {
                    // ベジェ曲線を描く
                    this.context.beginPath();
                    this.context.moveTo(...worldToCanvas(lastData.point));
                    this.context.bezierCurveTo(
                        ...worldToCanvas(lastData.wRightHandle),
                        ...worldToCanvas(keyData.wLeftHandle),
                        ...worldToCanvas(keyData.point)
                    );
                    this.context.strokeStyle = this.strokeStyle;
                    this.context.stroke();
                    lastData = keyData;
                }
                for (const keyData of AnimationCollector.keyframe.keys) {
                    lastData = keyData;
                    // 制御点と線
                    const check = (vertex) => {
                        return app.appConfig.areasConfig["Timeline"].selectVertices.includes(vertex) ? "rgb(255, 255, 255)" : "rgb(0,0,0)";
                    }
                    circle(worldToCanvas(keyData.point), 20, check(keyData.point));
                    circleStroke(worldToCanvas(keyData.wLeftHandle), 15, check(keyData.leftHandle), 7);
                    circleStroke(worldToCanvas(keyData.wRightHandle), 15, check(keyData.rightHandle), 7);
                }
                // offset ++;
            }
            circle(worldToCanvas(this.mouseState.worldPosition), 20, "rgb(255, 0, 0)");
        }
        resizeObserver.push(this.canvas, () => {
            this.canvas.width = this.canvas.offsetWidth * this.pixelDensity;
            this.canvas.height = this.canvas.offsetHeight * this.pixelDensity;
            this.canvasSize = [this.canvas.width,this.canvas.height];
            this.canvasRect = this.canvas.getBoundingClientRect();
            update();
        });

        this.groupID = createID();

        update();
        managerForDOMs.set("タイムライン-canvas", this.groupID, null, update);

        // this.canvas.addEventListener("mousemove", (event) => {
        //     const mouseX = (event.clientX - this.canvasRect.left) * this.pixelDensity;
        //     const mouseY = (event.clientY - this.canvasRect.top) * this.pixelDensity;
        //     this.mouseState.worldPosition = canvasToWorld([mouseX, mouseY]);
        //     this.mouseState.movement = [event.movementX,event.movementY];
        //     update();
        // })

        // this.canvas.addEventListener("mousedown", (event) => {
        //     const mouseX = (event.clientX - this.canvasRect.left) * this.pixelDensity;
        //     const mouseY = (event.clientY - this.canvasRect.top) * this.pixelDensity;
        //     // this.mouseState.worldPosition = vec2.divR(vec2.addR(vec2.divR(vec2.subR([mouseX, mouseY], [0, 20 * this.pixelDensity]), vec2.scaleR(this.zoom, this.pixelDensity)), this.scroll), [1, this.pixelDensity]);
        //     this.mouseState.worldPosition = canvasToWorld([mouseX, mouseY]);
        //     this.mouseState.movement = [event.movementX,event.movementY];
        //     if (!keysDown["Shift"]) {
        //         app.appConfig.areasConfig["Timeline"].selectKeys.length = 0;
        //         app.appConfig.areasConfig["Timeline"].selectVertices.length = 0;
        //     }
        //     for (const keyframe of app.appConfig.areasConfig["Timeline"].getVisibleKeyFrame()) {
        //         if (vec2.distanceR(keyframe.point, this.mouseState.worldPosition) < 5) {
        //             app.appConfig.areasConfig["Timeline"].activeKey = keyframe;
        //             app.appConfig.areasConfig["Timeline"].selectKeys.push(keyframe);
        //             app.appConfig.areasConfig["Timeline"].selectVertices.push(keyframe.point);
        //         }
        //         if (vec2.distanceR(keyframe.wLeftHandle, this.mouseState.worldPosition) < 5) {
        //             app.appConfig.areasConfig["Timeline"].selectVertices.push(keyframe.leftHandle);
        //         }
        //         if (vec2.distanceR(keyframe.wRightHandle, this.mouseState.worldPosition) < 5) {
        //             app.appConfig.areasConfig["Timeline"].selectVertices.push(keyframe.rightHandle);
        //         }
        //     }
        //     managerForDOMs.update("タイムライン-canvas");
        //     console.log(app.appConfig.areasConfig["Timeline"].selectVertices)
        //     update();
        // })

        // this.canvas.addEventListener("wheel", (event) => {
        //     if (keysDown["Alt"]) {
        //         this.zoom[0] -= event.deltaX / 25;
        //         this.zoom[1] += event.deltaY / 25;
        //         this.zoom[0] = Math.max(0.1,this.zoom[0]);
        //         this.zoom[1] = Math.max(0.1,this.zoom[1]);
        //     } else {
        //         this.scroll[0] += event.deltaX / this.zoom[0];
        //         this.scroll[1] -= event.deltaY / this.zoom[1];
        //     }
        //     managerForDOMs.updateGroupInObject("タイムライン-canvas", this.groupID);
        //     event.preventDefault();
        // }, { passive: false })
    }

    inputUpdate() {
        if (keysDown["g"]) {
            for (const vertex of app.appConfig.areasConfig["Timeline"].selectVertices) {
                vec2.add(vertex, vertex, this.mouseState.movement);
            }
        }
    }

    mousedown(inputManager) {
        const local = vec2.flipY(vec2.scaleR(calculateLocalMousePosition(this.canvas, inputManager.mousePosition), this.pixelDensity), this.canvas.height); // canvasないのlocal座標へ
        this.mouseState.clickPosition = local;
        this.mouseState.position = local;
        this.mouseState.clickPositionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
        this.mouseState.positionForGPU = this.convertCoordinate.screenPosFromGPUPos(this.mouseState.position);
        this.mouseState.hold = true;
        this.mouseState.holdFrameCount = 0;
        this.mouseState.click = true;
        console.log(this.mouseState);
    }
    mousemove(inputManager) {
        const local = vec2.scaleR(calculateLocalMousePosition(this.canvas, inputManager.mousePosition), this.pixelDensity);
        this.mouseState.worldPosition = canvasToWorld(local);
        update();
    }
    mouseup(inputManager) {
        this.mouseState.hold = false;
        this.mouseState.holdFrameCount = 0;
    }

    wheel(inputManager) {
        if (keysDown["Alt"]) {
            this.zoom[0] -= inputManager.wheelDelta[0] / 25;
            this.zoom[1] += inputManager.wheelDelta[1] / 25;
            this.zoom[0] = Math.max(0.1,this.zoom[0]);
            this.zoom[1] = Math.max(0.1,this.zoom[1]);
        } else {
            this.scroll[0] += inputManager.wheelDelta[0] / this.zoom[0];
            this.scroll[1] -= inputManager.wheelDelta[1] / this.zoom[1];
        }
        managerForDOMs.updateGroupInObject("タイムライン-canvas", this.groupID);
    }
}