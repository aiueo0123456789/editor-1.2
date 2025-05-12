import { Application } from "../app.js";

export class InputManager {
    constructor(/** @type {Application} **/app) {
        this.app = app;
        this.mousedown = false;
        this.mousePosition = [0,0];
        this.click = true;
        this.clickPosition = [0,0];
        this.movement = [0,0];

        this.wheelDelta = [0,0];

        this.mouseButtonType = -1;

        // マウス
        app.dom.addEventListener("mousedown", (e) => {
            this.mouseButtonType = e.button;
            if (this.mouseButtonType == 0) {
                this.click = true;
                this.mousedown = true;
                this.clickPosition[0] = e.clientX;
                this.clickPosition[1] = e.clientY;
                this.mousePosition[0] = e.clientX;
                this.mousePosition[1] = e.clientY;
                app.activeArea.uiModel?.mousedown(this);
            }
        })
        app.dom.addEventListener("mouseup", (e) => {
            if (this.mouseButtonType == 0) {
                this.mousedown = false;
                this.mousePosition[0] = e.clientX;
                this.mousePosition[1] = e.clientY;
                app.activeArea.uiModel?.mouseup(this);
            }
            this.mouseButtonType = -1;
        })
        app.dom.addEventListener("mousemove", (e) => {
            if (this.mouseButtonType == 2) { // 右クリック
                this.mousePosition[0] = e.clientX;
                this.mousePosition[1] = e.clientY;
                app.activeArea.uiModel?.mousemove(this);
            } else if (this.mouseButtonType == 1) {
                this.wheelDelta[0] = e.movementX;
                this.wheelDelta[1] = e.movementY;
                app.activeArea.uiModel?.wheel(this);
            } else {
                this.mousePosition[0] = e.clientX;
                this.mousePosition[1] = e.clientY;
                app.activeArea.uiModel?.mousemove(this);
            }
        })

        // ホイール操作
        app.dom.addEventListener('wheel', (event) => {
            this.wheelDelta[0] = event.deltaX;
            this.wheelDelta[1] = event.deltaY;
            app.activeArea.uiModel?.wheel(this);
            event.preventDefault();
        }, { passive: false });
    }
}