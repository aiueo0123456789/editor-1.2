import { createTag } from "../../UI/制御.js";

export class SelectTag {
    constructor(t, list = []) {
        console.log("セレクトの生成", t, list);
        const container = createTag(t, "div");
        const select = createTag(container, "input", {style: "display: none;"});
        // const listContainer = createTag(container,"ul");
        container.classList.add("custom-select");
        const value = createTag(container, "p", {textContent: "選択されていません"});
        const isOpen = createTag(container, "span", {class: "downArrow"});
        container.addEventListener("click", (e) => {
            const rect = container.getBoundingClientRect();
            const listContainer = document.getElementById("custom-select-items");
            listContainer.style.left = `${rect.left}px`;
            listContainer.style.top = `${rect.top + 15}px`;
            listContainer.replaceChildren();
            listContainer.classList.remove("hidden");
            function removeFn() {
                listContainer.replaceChildren();
                listContainer.classList.add("hidden");
                document.removeEventListener("click", removeFn); // ドキュメントからイベントリスナーを削除
            }
            for (const item of list) {
                const option = createTag(listContainer, "li");
                const inner = createTag(option, "p", {textContent: item});
                option.addEventListener("click", () => {
                    select.value = item;
                    // change イベントを手動で発火させる
                    select.dispatchEvent(new Event("input", { bubbles: true }));
                    value.textContent = item;
                    removeFn();
                })
            }
            document.addEventListener("click", removeFn); // セレクト以外がクリックされたら(ドキュメント)非表示
            e.stopPropagation();
        })

        this.element = container;
        this.input = select;
    }

    remove() {
        this.element.remove();
    }
}