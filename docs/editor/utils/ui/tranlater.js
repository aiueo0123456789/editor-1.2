function clamp(min,max,value) {
    if (value > max) {
        return max;
    }
    if (value < min) {
        return min;
    }
    return value;
}

export class TranslaterForDOM {
    constructor(/** @type {HTMLElement} */target, /** @type {HTMLElement} */translateTarget, /** @type {HTMLElement} */BBoxTarget) {
        console.log(target, translateTarget, BBoxTarget)
        target.style.position = "relative";

        this.translateX = 0;
        this.translateY = 0;
        translateTarget.style.transform = `translate(${this.translateX}px, ${this.translateY}px)`;

        target.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            let isDragging = true;

            // 親要素の最大値
            const maxX = BBoxTarget.clientWidth;
            const maxY = BBoxTarget.clientHeight;
            // 自分の大きさ
            const myW = translateTarget.clientWidth;
            const myH = translateTarget.clientHeight;
            // 要素内でクリックされた位置を記録
            let offsetX = e.clientX;
            let offsetY = e.clientY;

            // 視覚的なフィードバック
            target.style.cursor = "grabbing";

            const onMouseMove = (e) => {
                if (!isDragging) return;
                // 要素の新しい位置を計算
                this.translateX = clamp(0, 1 - (myW / maxX), this.translateX + (e.clientX - offsetX) / maxX);
                this.translateY = clamp(0, 1 - (myH / maxY), this.translateY + (e.clientY - offsetY) / maxY);

                offsetX = e.clientX;
                offsetY = e.clientY;
                // 要素を移動
                translateTarget.style.left = `${this.translateX * 100}%`;
                translateTarget.style.top = `${this.translateY * 100}%`;
            };

            const onMouseUp = () => {
                isDragging = false;
                // マウスイベントのリスナーを解除
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);

                // 視覚的なフィードバックを戻す
                target.style.cursor = "grab";
            };

            // マウスイベントをドキュメント全体に設定
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    }
}