import { Application } from "../app.js";

export class InputManager {
    constructor(/** @type {Application} **/app) {
        this.app = app;
        this.mousedown = false;
        this.position = [0,0];
        this.click = true;
        this.clickPosition = [0,0];
        this.movement = [0,0];

        this.wheelDelta = [0,0];

        this.mouseButtonType = -1;

        this.keysPush = {};
        this.keysDown = {};

        // マウス
        app.dom.addEventListener("mousedown", (e) => {
            if (!(e.target instanceof HTMLCanvasElement)) return ;
            this.mouseButtonType = e.button;
            if (this.mouseButtonType == 0) {
                this.click = true;
                this.mousedown = true;
                this.clickPosition[0] = e.clientX;
                this.clickPosition[1] = e.clientY;
                this.position[0] = e.clientX;
                this.position[1] = e.clientY;
                if (app.activeArea.uiModel.mousedown) {
                    app.activeArea.uiModel.mousedown(this);
                }
            }
        })
        app.dom.addEventListener("mouseup", (e) => {
            if (!(e.target instanceof HTMLCanvasElement)) return ;
            if (this.mouseButtonType == 0) {
                this.mousedown = false;
                this.position[0] = e.clientX;
                this.position[1] = e.clientY;
                if (app.activeArea.uiModel.mouseup) {
                    app.activeArea.uiModel.mouseup(this);
                }
            }
            this.mouseButtonType = -1;
        })
        app.dom.addEventListener("mousemove", (e) => {
            if (!(e.target instanceof HTMLCanvasElement)) return ;
            if (this.mouseButtonType == 2) { // 右クリック
                this.position[0] = e.clientX;
                this.position[1] = e.clientY;
                this.movement[0] = e.movementX;
                this.movement[1] = e.movementY;
                if (app.activeArea.uiModel.mousemove) {
                    app.activeArea.uiModel.mousemove(this);
                }
            } else if (this.mouseButtonType == 1) {
                this.wheelDelta[0] = e.movementX;
                this.wheelDelta[1] = e.movementY;
                app.activeArea.uiModel?.wheel(this);
            } else {
                this.position[0] = e.clientX;
                this.position[1] = e.clientY;
                this.movement[0] = e.movementX;
                this.movement[1] = e.movementY;
                if (app.activeArea.uiModel.mousemove) {
                    app.activeArea.uiModel.mousemove(this);
                }
            }
        })

        // ホイール操作
        app.dom.addEventListener('wheel', (e) => {
            if (!(e.target instanceof HTMLCanvasElement)) return ;
            this.wheelDelta[0] = e.deltaX;
            this.wheelDelta[1] = e.deltaY;
            if (app.activeArea.uiModel.wheel) {
                app.activeArea.uiModel.wheel(this);
            }
            e.preventDefault();
        }, { passive: false });

        // キーイベント管理
        document.addEventListener("keydown", (e) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            console.log(e.key,"down")
            if (isCtrlOrCmd && e.key === 'z') {
                if (e.shiftKey) {
                    app.operator.stack.redo();
                } else {
                    app.operator.stack.undo();
                }
                e.preventDefault(); // デフォルトの動作を防ぐ場合
            } else if (isCtrlOrCmd && e.key == "s") {
                app.fileIO.save();
                e.preventDefault(); // デフォルトの動作を防ぐ場合
            } else {
                this.keysPush[e.key] = true;
                this.keysDown[e.key] = true;
                if (e.key === "Tab" || e.key === "Shift" || e.key === "Meta") {
                    // デフォルト動作を無効化
                    e.preventDefault();
                    console.log(e.key,"のデフォルト動作を無効化しました");
                }
                if (app.activeArea.uiModel.keyInput) {
                    app.activeArea.uiModel.keyInput(this);
                }
            }
        });
        document.addEventListener("keyup",(eveet) => {
            this.keysDown[eveet.key] = false;
            console.log(eveet.key,"up")
        });
        document.addEventListener("contextmenu", (eveet) => {
            app.contextmenu.showContextmenu([eveet.clientX,eveet.clientY]);
            eveet.stopPropagation();
        })
    }

    consumeKeys(keys) {
        let b = true;
        for (const key of keys) { // 全てのキーが押されているか
            if (!this.keysPush[key]) b = false;
        }
        let sub = 0;
        // for (const key in this.keysPush) {
        //     for (const key_ of keys) { // 全てのキーが押されているか
        //         if (key != key_ && this.keysPush[key]) sub ++;
        //     }
        // }
        if (sub == 0 && b) { // 押されていた場合全てをリセット
            for (const key of keys) {
                this.keysPush[key] = false;
            }
            return true;
        } else {
            return false;
        }
    }
}