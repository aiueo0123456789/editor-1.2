export const connectingString = "><-/*+><";

function clamp(min,max,value) {
    if (value > max) {
        return max;
    }
    if (value < min) {
        return min;
    }
    return value;
}

const minGridSize = 50;

export class AutoGrid {
    constructor(id, t, axis, initWidthOrHeight) {
        this.id = id;
        this.target = t;
        this.container = document.createElement("div");
        this.container.id = id;
        this.child1 = document.createElement("div");
        this.child2 = document.createElement("div");
        if (axis) {
            this.container.className = axis === "w" ? "grid-w" : "grid-h";

            this.child1.className = axis === "w" ? "grid-w-left" : "grid-h-top";
            this.child1.id = id + connectingString + "0";

            const resizerDiv = document.createElement("div");
            resizerDiv.className = axis === "w" ? "grid-resizer-w" : "grid-resizer-h";

            resizerDiv.addEventListener("contextmenu", () => {
                console.log("グリッド追加");
                // appendGrid(this.htmlElement, {id: "ui1_1", type: "", children: []},);
            })

            this.child2.className = axis === "w" ? "grid-w-right" : "grid-h-bottom";
            this.child2.id = id + connectingString + "1";

            this.container.append(this.child1,resizerDiv,this.child2);

            if (axis === "w") {
                if (initWidthOrHeight) {
                    this.container.style.gridTemplateColumns = `${initWidthOrHeight}% 4px 1fr`;
                }
                resizerDiv.addEventListener("mousedown", (e) => {
                    e.stopPropagation();
                    this.isResizing = true;
                    // 最大px
                    const maxX = this.container.clientWidth;
                    const rect = this.container.getBoundingClientRect();

                    const onMouseMove = (e) => {
                        // サイズを計算して適用
                        const x = e.pageX - (rect.left + window.scrollX);
                        // const y = e.pageY - (rect.top + window.scrollY);
                        const newWidth = clamp(0.1, 0.9, x / maxX);
                        this.container.style.gridTemplateColumns = `${newWidth * 100}% 4px 1fr`;
                    };
                    const onMouseUp = () => {
                        this.isResizing = false;
                        // イベントリスナーの解除
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                    };
                    // マウスイベントのリスナーを追加
                    document.addEventListener("mousemove", onMouseMove);
                    document.addEventListener("mouseup", onMouseUp);
                });
            } else {
                if (initWidthOrHeight) {
                    this.container.style.gridTemplateRows = `${initWidthOrHeight}% 4px 1fr`;
                }
                resizerDiv.addEventListener("mousedown", (e) => {
                    e.stopPropagation();
                    this.isResizing = true;
                    // 最大px
                    const maxY = this.container.clientHeight;
                    const rect = this.container.getBoundingClientRect();

                    const onMouseMove = (e) => {
                        // サイズを計算して適用
                        const y = e.pageY - (rect.top + window.scrollY);
                        const newHeight = clamp(0.1, 0.9, y / maxY);
                        this.container.style.gridTemplateRows = `${newHeight * 100}% 4px 1fr`;
                    };
                    const onMouseUp = () => {
                        this.isResizing = false;
                        // イベントリスナーの解除
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                    };
                    // マウスイベントのリスナーを追加
                    document.addEventListener("mousemove", onMouseMove);
                    document.addEventListener("mouseup", onMouseUp);
                });
            }
        } else {
            this.container.className = "container";
        }

        t.append(this.container);
    }

    getchildrenTag() {
        return ;
    }
}