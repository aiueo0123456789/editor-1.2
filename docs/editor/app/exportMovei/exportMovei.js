import { Application } from "../app.js";

export class ExportMovei {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.isRunning = false;
    }

    async execute() {
        this.isRunning = false;
        const canvas = document.createElement("canvas");
        const stream = canvas.captureStream(60); // フレームレート 60fps

        const recordedChunks = [];
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm; codecs=vp9' // 他に vp8, h264 も可（環境による）
        });

        mediaRecorder.ondataavailable = function (e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = function () {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            // ダウンロードリンク作成
            const a = document.createElement("a");
            a.href = url;
            a.download = "animation.webm";
            a.click();
        };

        // 録画開始
        mediaRecorder.start();

        // 任意の時間で録画停止（例：5秒後）
        setTimeout(() => {
            mediaRecorder.stop();
        }, 5000);
    }
}