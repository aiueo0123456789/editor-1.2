import { InputManager } from "./app/InputManager.js";
import { Scene } from "./app/Scene.js";
import { Viewer } from "./area/viewer/viewer.js";
import { AutoGrid } from "./UI/grid.js";
import { CreatorForUI } from "./area/補助/UIの自動生成.js";
import { createIcon, createID, createTag } from "./UI/制御.js";
import { Hierarchy } from "./app/Hierarchy.js";
import { Operator } from "./機能/オペレーター/オペレーター.js";
import { Area_Hierarchy } from "./area/hierarchy/hierarchy.js";

// モードごとに使えるツールの管理
class WorkSpaceTool {
    constructor() {
        this.toolRegistry = {
            object: ["move", "scale", "rotate"],
            vertexEdit: ["move", "scale", "rotate"],
        }
    }

    getAvailableTools(mode) {
        return this.toolRegistry[mode] || [];
    }
}

// アプリの設定
class AppConfig {
    constructor() {
        this.workSpaceTool = new WorkSpaceTool;

        this.MAX_GRAPHICMESH = 100; // グラフィックメッシュの最大数
        this.MAX_VERTICES_PER_GRAPHICMESH = 500; // グラフィックメッシュあたりの最大頂点数
        this.MAX_ANIMATIONS_PER_GRAPHICMESH = 10; // グラフィックメッシュあたりの最大アニメーション数

        this.MAX_BONEMODIFIER = 10; // ボーンモディファイアの最大数
        this.MAX_VERTICES_PER_BONEMODIFIER = 100; // ボーンモディファイアあたりの最大頂点数
        this.MAX_ANIMATIONS_PER_BONEMODIFIER = 10; // ボーンモディファイアあたりの最大アニメーション数
    }
}

export class Application { // 全てをまとめる
    constructor(dom) {
        this.dom = dom; // エディターが作られるdom

        this.appConfig = new AppConfig();

        this.areas = [];
        this.scene = new Scene(this);
        this.animationPlayer = new AnimationPlayer(this);
        this.hierarchy = new Hierarchy(this);
        this.input = new InputManager(this);
        this.operator = new Operator(this);
    }

    async getSaveData() {
        const result = {};
        result.hierarchy = this.hierarchy.getSaveData();
        result.scene = await this.scene.getSaveData();
        return result;
    }

    createArea(axis, target = this.dom) { // エリアの作成
        const area = new AutoGrid(createID(), target, axis, 50);
        return area;
    }

    setAreaType(area, type) {
        const area_dom = document.createElement("div");
        area_dom.style.width = "100%";
        area_dom.style.height = "100%";
        this.areas.push(new Area(type,area_dom));
        area.append(area_dom);
    }

    deleteArea(/** @type {Area} */area) {
        const tag = area.target.parentElement;
        const b = tag.parentElement.children[2];
        tag.parentElement.parentElement.parentElement.append(b);
    }

    async update() {
        // await stateMachine.stateUpdate();
        // 表示順番の再計算
        this.scene.updateRenderingOrder(100);
        if (true) {
            this.scene.updateAnimation(this.scene.frame_current);
        }
        this.scene.updateAnimationCollectors();
        // this.hierarchy.runHierarchy();
        this.scene.update();
        // // 編集中のobjectを特別処理
        // if (stateMachine.state.data.selectAnimation) {
            //     // console.log("特別処理")
            //     updateObjectFromAnimation(stateMachine.state.data.activeObject, stateMachine.state.data.selectAnimation);
            // }
            for (const object of this.scene.allObject) {
            object.isChange = false;
        }
        // this.animationPlayer.update(1 / 60);
        this.animationPlayer.update(0.2);
        // ビューの更新
        this.areas.forEach((area) => {
            area.update();
        })
        // renderingParameters.updateKeyfarameCount();
        this.operator.update();
    }
}

// UIのエリア管理
class Area {
    constructor(type, /** @type {HTMLElement} */ dom) {
        this.type = type;

        this.target = dom;
        this.target.classList.add("area");

        this.header = document.createElement("div");
        this.header.classList.add("header");
        /** @type {HTMLElement} */
        const deleteButton = createTag(this.header, "span", {className: "square_btn"}); // バツボタン
        deleteButton.addEventListener("click", () => {
            app.deleteArea(this);
        })
        createIcon(this.header, "グラフィックメッシュ"); // アイコン
        createTag(this.header, "div", {textContent: type}); // タイトル

        this.main = document.createElement("div");
        this.main.classList.add("main");
        this.target.append(this.header, this.main);

        if (type == "Viewer") {
            this.struct = "View";
            this.viewer = new Viewer(this.main);
        } else if (type == "Hierarchy") {
            this.struct = "";
            this.creatorForUI = new Area_Hierarchy(this.main);
        } else {
            this.struct = "";
            this.creatorForUI = new CreatorForUI();
        }
    }

    update() {
        if (this.type == "Viewer") {
            this.viewer.update();
        }
    }
}

// アニメーションのコントローラー
class AnimationPlayer {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.isPlaying = true;
        this.speed = 1.0;
    }

    update(dt) {
        if (this.isPlaying) {
            this.app.scene.frame_current += dt * this.speed;
        }
        this.app.scene.frame_current = this.app.scene.frame_start + (this.app.scene.frame_current - this.app.scene.frame_start) % (this.app.scene.frame_end - this.app.scene.frame_start); // フレームスタートを下回ったらエンドに戻す
    }
}

export const app = new Application(document.getElementById("app"));

const area1 = app.createArea("w");
const area2 = app.createArea("w", area1.child2);
const area3 = app.createArea("h", area2.child2);
const area4 = app.createArea("w", area3.child1);
app.setAreaType(area1.child1,"Viewer");
app.setAreaType(area2.child1,"Hierarchy");
app.setAreaType(area4.child1,"Viewer");
app.setAreaType(area3.child2,"Inspector");
app.setAreaType(area4.child2,"Property");
// app.setAreaType(area3.child1,"Viewer");
// app.setAreaType(area3.child2,"Viewer");
// app.setAreaType(area2.child1,"Inspector");
// app.setAreaType(area3.child2,"Hierarchy");
// app.setAreaType(area3.child1,"Hierarchy");
// app.setAreaType(area3.child2,"Property");

function appUpdate() {
    app.update();
    requestAnimationFrame(appUpdate);
}

appUpdate();