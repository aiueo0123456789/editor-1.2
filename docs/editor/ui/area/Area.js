import { app, useClassFromAreaType } from "../../app/app.js";
import { CreatorForUI } from "../../utils/ui/creatorForUI.js";
import { SelectTag } from "../../utils/ui/customTags.js";
import { createIcon, createTag } from "../../utils/ui/util.js";
import { createArrayFromHashKeys } from "../../utils/utility.js";

// UIのエリア管理
export class Area {
    constructor(type, /** @type {HTMLElement} */ dom) {
        this.target = dom;
        this.target.classList.add("area");

        this.header = document.createElement("div");
        this.header.classList.add("header");

        this.creatorForUI = new CreatorForUI();
        const select = new SelectTag(this.header, createArrayFromHashKeys(useClassFromAreaType));
        /** @type {HTMLElement} */
        const deleteButton = createTag(this.header, "span", {className: "square_btn"}); // バツボタン
        deleteButton.addEventListener("click", () => {
            app.deleteArea(this);
        })
        createIcon(this.header, "グラフィックメッシュ"); // アイコン
        this.title = createTag(this.header, "div", {textContent: type}); // タイトル

        this.main = document.createElement("div");
        this.main.classList.add("main");
        this.target.append(this.header, this.main);

        this.setType(type);

        select.input.addEventListener("input", () => {
            this.setType(select.input.value);
        })

        this.main.addEventListener("mouseover", () => {
            app.activeArea = this;
        });
    }

    setType(type) {
        this.creatorForUI.remove();
        this.title.textContent = type; // タイトル
        this.type = type;
        if (type in useClassFromAreaType) {
            this.uiModel = new useClassFromAreaType[type]["area"](this);
        } else {
            this.uiModel = {type: "エラー"};
            console.warn("設定されていないエリアを表示しようとしました",type)
        }
    }

    update() {
        if (this.type == "Viewer" || this.type == "Preview") {
            this.uiModel.update();
        }
    }
}