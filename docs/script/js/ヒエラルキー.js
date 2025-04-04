import { GraphicMesh } from "./オブジェクト/グラフィックメッシュ.js";
import { Modifier } from "./オブジェクト/モディファイア.js";
import { BezierModifier } from "./オブジェクト/ベジェモディファイア.js";
import { RotateModifier } from "./オブジェクト/回転モディファイア.js";
import { AnimationCollector } from "./オブジェクト/アニメーションコレクター.js";
import { updateObject,setParentModifierWeight, searchAnimation } from "./オブジェクト/オブジェクトで共通の処理.js";
import { createID, managerForDOMs, updateDataForUI } from "./UI/制御.js";
import { BoneModifier } from "./オブジェクト/ボーンモディファイア.js";
import { renderingParameters } from "./レンダリングパラメーター.js";

export function changeObjectName(object, newName) {
    object.name = newName;
    managerForDOMs.update(object);
}

class Group {
    constructor(name = "グループ", id = null) {
        this.type = "グループ";
        this.id = id ? id : createID();
        this.name = name;
        this.children = [];
        this.editor = {layerParent: ""};
    }

    getChildren(option) {
        if (option) {
            const result = [];
            for (const object of this.children) {
                if (object.type != "グループ") {
                    result.push(object);
                }
            }
            return result;
        } else {
            return this.children;
        }
    }

    appendChild(child) {
        this.children.push(child);
        child.editor.layerParent = this;
    }

    deleteChild(child) {
        this.children.splice(this.children.indexOf(child), 1);
        child.editor.layerParent = null;
    }
}

class Layer {
    constructor() {
        this.surface = [];
        this.allLayers = [];
    }

    searchLayerFromName(name) {
        for (const layer of this.allLayers) {
            if (layer.name == name) {
                return layer;
            }
        }
        return null;
    }

    createGroup(parent) {
        const group = new Group();
        this.surface.push(group);
        return group;
    }

    appendLayer(parent, object) {
        if (parent == "") {
            this.surface.push(object);
            object.editor.layerParent = "";
        } else {
            parent.appendChild(object);
        }
        this.allLayers.push(object);
    }

    deleteLayer(object) {
        if (object.editor.layerParent == "") {
            this.surface.splice(this.surface.indexOf(object), 1);
            object.editor.layerParent = null;
        } else {
            object.editor.layerParent.deleteChild(object);
        }
    }

    insertLayer(parent, object) {
        this.deleteLayer(object);
        this.appendLayer(parent, object);
    }

    setSaveData(data) {
        const fn = (objects, parent = "") => {
            for (const object of objects) {
                if (object.name) {
                    const group = new Group(object.name,object.id);
                    fn(object.children, group);
                    this.allLayers.push(group);
                    this.appendLayer(parent,group);
                } else {
                    const layer = hierarchy.searchObjectFromID(object);
                    if (layer) {
                        this.insertLayer(parent,layer);
                    }
                }
            }
        }
        fn(data);
    }
}

class Editor {
    constructor() {
        this.layer = new Layer();
    }
}

class Hierarchy {
    constructor() {
        this.animationCollectors = [];
        this.modifiers = [];
        this.bezierModifiers = [];
        this.rotateModifiers = [];
        this.graphicMeshs = [];
        this.boneModifiers = [];
        this.surface = [];
        this.renderingOrder = [];
        this.allObject = [];
        this.isChangeObjectsZindex = true;

        this.editor = new Editor();

        function hierarchyUpdate() {
            managerForDOMs.update("ヒエラルキー")
            managerForDOMs.update("レイヤー")
        }
        managerForDOMs.set(this, "ヒエラルキー", null, hierarchyUpdate);
    }

    // 全てのオブジェクトをgc対象にしてメモリ解放
    destroy() {
        this.renderingOrder.length = 0;
        this.allObject.forEach(object => {
            object.destroy();
        });
        this.graphicMeshs.length = 0;
        this.modifiers.length = 0;
        this.bezierModifiers.length = 0;
        this.rotateModifiers.length = 0;
        this.animationCollectors.length = 0;
        this.allObject.length = 0;
        this.surface.length = 0;
    }

    searchObject(object) {
        if (object.type == "グラフィックメッシュ") {
            return [this.graphicMeshs, this.graphicMeshs.indexOf(object)];
        } else if (object.type == "モディファイア") {
            return [this.modifiers, this.modifiers.indexOf(object)];
        } else if (object.type == "ベジェモディファイア") {
            return [this.bezierModifiers, this.bezierModifiers.indexOf(object)];
        } else if (object.type == "回転モディファイア") {
            return [this.rotateModifiers, this.rotateModifiers.indexOf(object)];
        } else if (object.type == "ボーンモディファイア") {
            return [this.boneModifiers, this.boneModifiers.indexOf(object)];
        } else if (object.type == "アニメーションコレクター") {
            return [this.animationCollectors, this.animationCollectors.indexOf(object)];
        }
    }

    deleteObject(object) {
        this.allObject.splice(this.allObject.indexOf(object),1);
        const [array, indexe] = this.searchObject(object);
        array.splice(indexe, 1);
        this.deleteHierarchy(object);
        console.log("削除",object)
        object.destroy();
    }

    getSaveData() {
        const result = []; // [[親の情報: [name,type], 自分の情報: [name,type]],...]
        for (const object of this.allObject) {
            if (object.type != "アニメーションコレクター") {
                if (object.parent == "") {
                    result.push(["",object.id]);
                } else {
                    result.push([object.parent.id,object.id]);
                }
            }
        }
        return result;
    }

    updateRenderingOrder(fineness) {
        if (!this.isChangeObjectsZindex) return ;
        const createEmptyArray = (length) => {
            const result = [];
            for (let i = 0; i < length; i ++) {
                result.push([]);
            }
            return result;
        }
        const supportFn = (graphicMeshs) => {
            const belongChunk = Math.floor(graphicMeshs.zIndex / chunkRate);
            for (let i = 0; i < chunks[belongChunk].length; i ++) {
                if (chunks[belongChunk][i][1] > graphicMeshs.zIndex) {
                    chunks[belongChunk].splice(i,0,[graphicMeshs, graphicMeshs.zIndex]);
                    return ;
                }
            }
            chunks[belongChunk].push([graphicMeshs, graphicMeshs.zIndex]);
            return ;
        }
        const chunkRate = 1000 / fineness;
        const chunks = createEmptyArray(fineness);
        this.graphicMeshs.forEach(graphicMesh => {
            supportFn(graphicMesh);
        });
        this.renderingOrder.length = 0;
        for (const datas of chunks) {
            for (const data of datas) {
                this.renderingOrder.push(data[0]);
            }
        }
        this.isChangeObjectsZindex = false;
        managerForDOMs.update("表示順番");
    }

    updateZindex(graphicMesh, zIndexForNew) {
        graphicMesh.zIndex = zIndexForNew;
        this.isChangeObjectsZindex = true;
    }

    searchObjectFromName(name, type) {
        if (type == "グラフィックメッシュ") {
            for (const graphicMesh of this.graphicMeshs) {
                if (graphicMesh.name == name) return graphicMesh;
            }
            console.warn("グラフィックメッシュが見つかりませんでした")
        } else if (type == "モディファイア") {
            for (const modifier of this.modifiers) {
                if (modifier.name == name) return modifier;
            }
            console.warn("モディファイアが見つかりませんでした")
        } else if (type == "ベジェモディファイア") {
            for (const modifier of this.bezierModifiers) {
                if (modifier.name == name) return modifier;
            }
            console.warn("ベジェモディファイアが見つかりませんでした")
        } else if (type == "回転モディファイア") {
            for (const modifier of this.rotateModifiers) {
                if (modifier.name == name) return modifier;
            }
            console.warn("回転モディファイアが見つかりませんでした")
        } else if (type == "ボーンモディファイア") {
            for (const modifier of this.boneModifiers) {
                if (modifier.name == name) return modifier;
            }
            console.warn("ボーンモディファイアが見つかりませんでした")
        } else if (type == "アニメーションコレクター") {
            for (const anmationManager of this.animationCollectors) {
                if (anmationManager.name == name) return anmationManager;
            }
            console.warn("アニメーションコレクターが見つかりませんでした")
        }
        return null;
    }

    searchObjectFromID(id) {
        for (const object of this.allObject) {
            if (object.id == id) {
                return object;
            }
        }
        return null;
    }

    setAnimationCollectorLink(animationCollector, animationKey) { // アニメーションコレクターとアニメーションを関係付ける
        this.deleteAnimationCollectorLink(animationKey); // 前に関連付けられていたアニメーションコレクターとの関係を切る
        animationCollector.containedAnimations.push(animationKey);
        animationKey.belongAnimationCollector = animationCollector;
    }

    deleteAnimationCollectorLink(deleteAnimationKey) { // 関連付けられていたアニメーションコレクターとの関係を切る
        if (!deleteAnimationKey.belongAnimationCollector) return ;
        const resource = deleteAnimationKey.belongAnimationCollector.containedAnimations;
        resource.splice(resource.indexOf(deleteAnimationKey), 1);
        deleteAnimationKey.belongAnimationCollector = null;
    }

    findUnusedName(name) {
        if (name in this.modifiers || name in this.graphicMeshs) {
            let run = true;
            let count = 0;
            while (run) {
                count ++;
                if (name + count in this.modifiers) {
                } else if (name + count in this.graphicMeshs) {
                } else {
                    run = false;
                }
            }
            return name + count;
        } else {
            return name;
        }
    }

    setSaveObject(data) { // オブジェクトの追加
        let object;
        if (!data.type || data.type == "グラフィックメッシュ") {
            object = new GraphicMesh(data.name,data.id);
            object.init(data);
            this.editor.layer.appendLayer("",object);
            this.graphicMeshs.push(object);
            this.renderingOrder.push(object);
            // this.editor.layer.appendLayer("",object);
            this.isChangeObjectsZindex = true;
        } else if (data.type == "モディファイア") {
            object = new Modifier(data.name,data.id);
            object.init(data);
            this.modifiers.push(object);
        } else if (data.type == "回転モディファイア") {
            object = new RotateModifier(data.name,data.id);
            object.init(data);
            this.rotateModifiers.push(object);
        } else if (data.type == "ベジェモディファイア") {
            object = new BezierModifier(data.name,data.id);
            object.init(data);
            this.bezierModifiers.push(object);
        } else if (data.type == "ボーンモディファイア") {
            console.log(data)
            object = new BoneModifier(data.name,data.id);
            object.init(data);
            this.boneModifiers.push(object);
        } else if (data.type == "アニメーションコレクター" || data.type == "am") {
            object = new AnimationCollector(data.name,data.id);
            object.init(data);
            this.animationCollectors.push(object);
        }
        this.allObject.push(object);
        return object;
    }

    addEmptyObject(type) {
        let object;
        if (type == "アニメーションコレクター") {
            object = new AnimationCollector("名称未設定");
            this.animationCollectors.push(object);
            managerForDOMs.update("タイムライン-チャンネル");
            managerForDOMs.update("タイムライン-タイムライン-オブジェクト");
            managerForDOMs.update(this.animationCollectors);
            this.allObject.push(object);
        } else {
            updateDataForUI["オブジェクト"] = true;
            if (type == "グラフィックメッシュ") {
                object = new GraphicMesh("名称未設定");
                this.graphicMeshs.push(object);
                this.isChangeObjectsZindex = true;
            } else if (type == "モディファイア") {
                object = new Modifier("名称未設定");
                this.modifiers.push(object);
            } else if (type == "回転モディファイア") {
                object = new RotateModifier("名称未設定");
                this.rotateModifiers.push(object);
            } else if (type == "ベジェモディファイア") {
                object = new BezierModifier("名称未設定");
                this.bezierModifiers.push(object);
            } else if (type == "ボーンモディファイア") {
                object = new BoneModifier("名称未設定");
                this.boneModifiers.push(object);
            }
            this.allObject.push(object);
            this.addHierarchy("", object);
        }
    }

    changeObjectName(object, newName) {
        object.name = newName;
        if (object.type == "アニメーションコレクター") {
            managerForDOMs.update("タイムライン-チャンネル");
        } else {
            managerForDOMs.update(this);
            updateDataForUI["インスペクタ"] = true;
        }
    }

    setHierarchy(setData) {
        for (const [parentID, myID] of setData) {
            const parent = parentID == "" ? "" : this.searchObjectFromID(parentID);
            const child = this.searchObjectFromID(myID);
            this.addHierarchy(parent, child);
        }
        setData = null;
    }

    addHierarchy(parentObject, addObject) { // ヒエラルキーに追加
        if (parentObject == "") {
            this.surface.push(addObject);
            addObject.parent = "";
        } else {
            parentObject.children.addChild(addObject);
            addObject.parent = parentObject;
            setParentModifierWeight(addObject); // モディファイアの適応
        }
        managerForDOMs.update("ヒエラルキー");
    }

    sortHierarchy(targetObject, object) { // ヒエラルキーの並び替え
        this.deleteHierarchy(object);
        if (targetObject == "") {
            this.surface.push(object);
            object.parent = "";
        } else {
            targetObject.children.addChild(object);
            object.parent = targetObject;
            setParentModifierWeight(object); // モディファイアの適応
        }
        managerForDOMs.update("ヒエラルキー");
    }

    deleteHierarchy(object) { // ヒエラルキーから削除
        if (object.parent) {
            object.parent.children.deleteChild(object);
        } else {
            this.surface.splice(this.surface.indexOf(object), 1);
        }
        if (object.children) {
            // 削除対象の子要素を削除対象の親要素の子要素にする
            for (const child of object.children.objects) {
                this.addHierarchy(object.parent, child);
            }
            object.children.objects.length = 0;
        }
        managerForDOMs.update("ヒエラルキー");
    }

    // フレームを適応
    updateAnimation(frame) {
        for (const object of this.animationCollectors) {
            object.keyframe.update(frame);
        }
    }

    // アニメーションコレクターの適応
    updateManagers() {
        for (const animtionManager of this.animationCollectors) {
            animtionManager.update();
        }
    }

    runHierarchy() { // 伝播の実行
        this.surface.forEach(x => {
            updateObject(x);
            x.children?.run();
        })
    }
}

export const hierarchy = new Hierarchy();