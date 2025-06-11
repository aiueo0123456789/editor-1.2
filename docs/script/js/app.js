import { FaileIOManager } from "./app/FaileIOManager.js";
import { Scene } from "./app/Scene.js";
import { AutoGrid } from "./UI/grid.js";
import { createIcon, createID, createTag, managerForDOMs } from "./UI/制御.js";
import { Hierarchy } from "./app/Hierarchy.js";
import { Operator } from "./機能/オペレーター/オペレーター.js";
import { Area_Viewer } from "./area/Viewer/area_Viewer.js";
import { Area_Hierarchy } from "./area/Hierarchy/area_Hierarchy.js";
import { Area_Inspector } from "./area/Inspector/area_Inspector.js";
import { Area_Preview } from "./area/Preview/area_Preview.js";
import { Area_Timeline } from "./area/Timeline/area_Timeline.js";
import { ViewerSpaceData } from "./area/Viewer/area_ViewerSpaceData.js";
import { TimelineSpaceData } from "./area/Timeline/area_TimelineSpaceData.js";
import { InputManager } from "./app/InputManager.js";
import { changeParameter, createArrayFromHashKeys, indexOfSplice } from "./utility.js";
import { SelectTag } from "./area/補助/カスタムタグ.js";
import { ContextmenuOperator } from "./app/ContextmenuOperator.js";
import { HierarchySpaceData } from "./area/Hierarchy/area_HierarchySpaceData.js";

class AppOptions {
    constructor(app) {
        this.app = app;
        this.primitives = {
            "bone": {
                "normal": {
                    baseVertices: [
                        0,-100, 0,100,
                    ],
                    relationship: [{
                        index: 0,
                        children: [],
                    }],
                    animationKeyDatas: [],
                    editor: {
                        boneColor: [0,0,0,1]
                    }
                },
                "body": {
                    baseVertices: [
                        0,-100, 0,100,
                        100,150, 200, 250
                    ],
                    relationship: [{
                        index: 0,
                        children: [
                            {
                                index: 1,
                                children: [],
                            }
                        ],
                    }],
                    animationKeyDatas: [],
                    editor: {
                        boneColor: [0,0,0,1]
                    }
                }
            }
        }
    }

    getPrimitiveData(objectType, name) {
        try {
            return this.primitives[objectType][name];
        } catch {
            return null;
        }
    }
}

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
    constructor(app) {
        this.app = app;
        this.workSpaceTool = new WorkSpaceTool();

        this.MASKTEXTURESIZE = [1024,1024];

        this.MAX_GRAPHICMESH = 100; // グラフィックメッシュの最大数
        this.MAX_VERTICES_PER_GRAPHICMESH = 500; // グラフィックメッシュあたりの最大頂点数
        this.MAX_MESHES_PER_GRAPHICMESH = 700; // グラフィックメッシュあたりの最大頂メッシュ数
        this.MAX_ANIMATIONS_PER_GRAPHICMESH = 10; // グラフィックメッシュあたりの最大アニメーション数

        this.MAX_BONEMODIFIER = 32; // ボーンモディファイアの最大数
        this.MAX_VERTICES_PER_BONEMODIFIER = 100; // ボーンモディファイアあたりの最大頂点数
        this.MAX_ANIMATIONS_PER_BONEMODIFIER = 10; // ボーンモディファイアあたりの最大アニメーション数

        this.MAX_BEZIERMODIFIER = 32; // ベジェモディファイアの最大数
        this.MAX_VERTICES_PER_BEZIERMODIFIER = 10; // ベジェモディファイアあたりの最大頂点数
        this.MAX_ANIMATIONS_PER_BEZIERMODIFIER = 10; // ベジェモディファイアあたりの最大アニメーション数

        this.areasConfig = {};
        for (const keyName in useClassFromAreaType) {
            this.areasConfig[keyName] = new useClassFromAreaType[keyName]["areaConfig"]();
        }

        this.contextmenusItems = {
            "Viewer": {
                "オブジェクト": [
                    {label: "オブジェクトを追加", children: [
                        {label: "グラフィックメッシュ", eventFn: app.scene.createObject.bind(app.scene, {type: "グラフィックメッシュ"})},
                        {label: "モディファイア", eventFn: app.scene.createObject.bind(app.scene, {type: "モディファイア"})},
                        {label: "ベジェモディファイア", eventFn: app.scene.createObject.bind(app.scene, {type: "ベジェモディファイア"})},
                        {label: "ボーンモディファイア", eventFn: app.scene.createObject.bind(app.scene, {type: "ボーンモディファイア"})}
                    ]},
                    {label: "test"},
                ]
            },
            "Hierarchy": {
                "オブジェクト": [
                    {label: "オブジェクトを追加", children: [
                        {label: "グラフィックメッシュ"},
                        {label: "モディファイア"}
                    ]},
                    {label: "test"},
                ]
            }
        }
    }

    getContextmenuItems(type, mode) {
        return this.contextmenusItems[type][mode];
    }
}

class AreaOperator {
    constructor(app) {
        this.app = app;
        this.areaMap = new Map();
    }

    setArea() {

    }
}

export class Application { // 全てをまとめる
    constructor(/** @type {HTMLElement} **/ dom) {
        this.dom = dom; // エディターが作られるdom

        this.scene = new Scene(this);
        this.appConfig = new AppConfig(this);

        this.options = new AppOptions(this);

        this.areas = [];
        this.areaMap = new Map();
        this.activeArea = null;
        this.animationPlayer = new AnimationPlayer(this);
        this.hierarchy = new Hierarchy(this);
        this.fileIO = new FaileIOManager(this);
        this.input = new InputManager(this);
        this.operator = new Operator(this);

        this.contextmenu = new ContextmenuOperator(this);
    }

    async getSaveData() {
        const result = {};
        result.hierarchy = this.hierarchy.getSaveData();
        result.scene = await this.scene.getSaveData();
        return result;
    }

    createArea(axis, target = this.dom) { // エリアの作成
        const area = new AutoGrid(createID(), target, axis, 50);
        this.areaMap.set(area, []);
        return area;
    }

    setAreaType(/** @type {AutoGrid} */grid, index, type) {
        const area_dom = document.createElement("div");
        area_dom.style.width = "100%";
        area_dom.style.height = "100%";
        const area = new Area(type,area_dom);
        area.grid = grid;
        this.areas.push(area);
        this.areaMap.get(grid).push(area);
        grid[`child${index + 1}`].append(area_dom);
    }

    deleteArea(/** @type {Area} */area) {
        area.target.replaceChildren();
        /** @type {AutoGrid} */
        const grid = area.grid;
        const gridInnner = this.areaMap.get(grid);
        indexOfSplice(gridInnner, area);
        console.log(gridInnner)
        console.log(grid.container);
        console.log(grid.target);
        grid.target.replaceChildren();
        if (gridInnner.length) {
            grid.target.append(gridInnner[0].target);
        }
        indexOfSplice(this.areas, area);
        this.areaMap.delete(area);
    }

    async update() {
        for (const area of this.areas) {
            if ("inputUpdate" in area.uiModel) {
                area.uiModel.inputUpdate();
            }
        }
        // await stateMachine.stateUpdate();
        // 表示順番の再計算
        this.scene.updateRenderingOrder(100);
        if (true) {
            this.scene.updateAnimation(this.scene.frame_current);
        }
        this.scene.updateAnimationCollectors();
        this.scene.update();
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

const useClassFromAreaType = {
    "Viewer": {area: Area_Viewer, areaConfig: ViewerSpaceData},
    "Hierarchy": {area: Area_Hierarchy, areaConfig: HierarchySpaceData},
    "Inspector": {area: Area_Inspector, areaConfig: ViewerSpaceData},
    "Preview": {area: Area_Preview, areaConfig: ViewerSpaceData},
    "Timeline": {area: Area_Timeline, areaConfig: TimelineSpaceData},
};

// UIのエリア管理
class Area {
    constructor(type, /** @type {HTMLElement} */ dom) {
        this.target = dom;
        this.target.classList.add("area");

        this.header = document.createElement("div");
        this.header.classList.add("header");
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

        select.input.addEventListener("change", () => {
            this.setType(select.input.value);
        })

        this.main.addEventListener("mouseover", () => {
            app.activeArea = this;
        });
    }

    setType(type) {
        this.uiModel?.creator?.remove();
        this.title.textContent = type; // タイトル
        this.type = type;
        if (type in useClassFromAreaType) {
            this.uiModel = new useClassFromAreaType[type]["area"](this.main);
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

// アニメーションのコントローラー
class AnimationPlayer {
    constructor(/** @type {Application} */app) {
        this.app = app;
        this.isPlaying = false;
        this.speed = 1.0;
    }

    update(dt) {
        if (this.isPlaying) {
            this.app.scene.frame_current += dt * this.speed;
            managerForDOMs.update("タイムライン-canvas");
        }
        changeParameter(this.app.scene, "frame_current", this.app.scene.frame_start + (this.app.scene.frame_current - this.app.scene.frame_start) % (this.app.scene.frame_end - this.app.scene.frame_start)); // フレームスタートを下回ったらエンドに戻す
    }
}

export const app = new Application(document.getElementById("app"));

// const area1 = app.createArea("w");
// app.setAreaType(area1,0,"Hierarchy");
// app.setAreaType(area1,0,"Viewer");
// app.setAreaType(area1,1,"Hierarchy");
const area1 = app.createArea("w");
const area1_h = app.createArea("h", area1.child1);
const area2 = app.createArea("w", area1.child2);
// const area3 = app.createArea("h", area2.child2);
// const area4 = app.createArea("w", area3.child1);
app.setAreaType(area1_h,0,"Viewer");
app.setAreaType(area2,0,"Hierarchy");
// app.setAreaType(area4,0,"Hierarchy");
// app.setAreaType(area4,0,"Viewer");
// app.setAreaType(area4,0,"Preview");
app.setAreaType(area2,1,"Inspector");
// app.setAreaType(area3,1,"Viewer");
// app.setAreaType(area1_h,1,"Viewer");
app.setAreaType(area1_h,1,"Timeline");
// app.setAreaType(area4,1,"Viewer");
// app.setAreaType(area4,1,"Timeline");
// app.setAreaType(area4,1,"Property");

function appUpdate() {
    app.update();
    requestAnimationFrame(appUpdate);
}

appUpdate();