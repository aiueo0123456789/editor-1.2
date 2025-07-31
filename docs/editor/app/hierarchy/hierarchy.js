import { managerForDOMs } from "../../utils/ui/util.js";
import { Application } from "../app.js";

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
    constructor(app) {
        this.app = app;
        this.root = [];
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
        this.root.push(group);
        return group;
    }

    appendLayer(parent, object) {
        if (parent == "") {
            this.root.push(object);
            object.editor.layerParent = "";
        } else {
            parent.appendChild(object);
        }
        this.allLayers.push(object);
    }

    deleteLayer(object) {
        if (object.editor.layerParent == "") {
            this.root.splice(this.root.indexOf(object), 1);
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
                    const layer = this.app.scene.searchObjectFromID(object);
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
    constructor(app) {
        this.app = app;
        this.layer = new Layer(app);
    }
}

export class Hierarchy {
    constructor(/** @type {Application} */ app) {
        this.app = app;

        this.root = [];

        this.editor = new Editor(app);

        managerForDOMs.update(this.root);
    }

    // 全てのオブジェクトをgc対象にしてメモリ解放
    destroy() {
        this.root.length = 0;
    }

    updateParent(object) {
        if (object.type == "グラフィックメッシュ") {
            this.app.scene.runtimeData.graphicMeshData.updateAllocationData(object);
        } else if (object.type == "ベジェモディファイア") {
            this.app.scene.runtimeData.bezierModifierData.updateAllocationData(object);
        }
    }

    getSaveData() {
        const allObject = this.getAllObject();
        const saveData = [];
        for (const object of allObject) {
            if (object.type != "アニメーションコレクター") {
                // [[親の情報: [name,type], 自分の情報: [name,type]],...]
                if (object.parent == "") {
                    saveData.push(["",object.id]);
                } else {
                    saveData.push([object.parent.id,object.id]);
                }
            }
        }
        return saveData;
    }

    getAllObject() {
        const getLoopChildren = (children, result = []) => {
            for (const child of children) {
                result.push(child);
                if (child.children) { // 子要素がある場合ループする
                    getLoopChildren(child.children.objects, result);
                }
            }
            return result;
        }
        return getLoopChildren(this.root);
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

    setHierarchy(setData) {
        for (const [parentID, myID] of setData) {
            const parent = parentID == "" ? "" : this.app.scene.searchObjectFromID(parentID);
            const child = this.app.scene.searchObjectFromID(myID);
            this.addHierarchy(parent, child);
            if (child.type == "グラフィックメッシュ") {
                this.app.scene.runtimeData.graphicMeshData.updateAllocationData(child);
            } else if (child.type == "ベジェモディファイア") {
                this.app.scene.runtimeData.bezierModifierData.updateAllocationData(child);
            }
        }
        setData = null;
    }

    addHierarchy(parentObject, addObject) { // ヒエラルキーに追加
        if (parentObject == "") {
            this.root.push(addObject);
            addObject.parent = "";
        } else {
            addObject.parent = parentObject;
            parentObject.children.addChild(addObject);
        }
        this.updateParent(addObject);
        managerForDOMs.update(this.root)
    }

    sortHierarchy(newParentObject, object) { // ヒエラルキーの並び替え
        this.removeHierarchy(object);
        if (newParentObject == "") {
            this.root.push(object);
            object.parent = "";
        } else {
            object.parent = newParentObject;
            newParentObject.children.addChild(object);
            if (object.type == "グラフィックメッシュ") {
                this.app.scene.runtimeData.graphicMeshData.updateAllocationData(object);
            } else if (object.type == "ベジェモディファイア") {
                this.app.scene.runtimeData.bezierModifierData.updateAllocationData(object);
            }
            if (object.autoWeight) {
                this.app.options.assignWeights(object);
            }
        }
        this.updateParent(object);
        managerForDOMs.update(this.root)
    }

    removeHierarchy(object) { // ヒエラルキーから削除
        if (object.parent) {
            object.parent.children.deleteChild(object);
        } else {
            this.root.splice(this.root.indexOf(object), 1);
        }
        if (object.children) {
            // 削除対象の子要素を削除対象の親要素の子要素にする
            while (object.children.length > 0) {
                this.addHierarchy(object.parent, object.children.pop());
            }
        }
        console.log(this)
        managerForDOMs.update(this.root)
    }
}