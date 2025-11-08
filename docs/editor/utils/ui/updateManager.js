import { indexOfSplice, isNumber, isPlainObject } from "../utility.js";
import { managerForDOMs } from "./util.js";

export class updateManager_DataBlock {
    constructor(object, groupID, id, flag, fn, others) {
        this.object = object;
        this.groupID = groupID;
        this.id = id;
        this.fn = fn;
        this.others = others;
        this.flag = flag;
    }

    remove(maxDepth = 2) {
        // 全てループしてメモリ解放
        // const fn = (data, depth = 0) => {
        //     if (maxDepth <= depth) return ;
        //     if (data instanceof HTMLElement) { // HTMLElementなら削除
        //         data.remove();
        //     } else if (data?.customTag) { // カスタムタグなら削除
        //         data.remove();
        //     } else if (isPlainObject(data)) { // 連想配列なら中身をループ
        //         for (const key in data) {
        //             fn(data[key], depth + 1);
        //         }
        //     } else if (Array.isArray(data)) { // 配列なら中身をループ
        //         for (const value of data) {
        //             fn(value, depth + 1);
        //         }
        //     }
        // }
        // fn(this.dom);
        // fn(this.others);
        // indexOfSplice(managerForDOMs.flags.get(this.flag), this);
        // const o = managerForDOMs.objectsMap.get(this.object);
        // if (o) {
        //     const i = o.get(this.id);
        //     if (i) {
        //         const g = i.get(this.groupID);
        //         if (g) {
        //             indexOfSplice(g, this);
        //         }
        //     }
        // }
    }
}
const getFn = (map, key) => {
    if (key == "~@all") {
        return [...map.values()].flat();
    } else {
        const result = [];
        if (map.has(key)) {
            result.push(...map.get(key));
        }
        if (map.has("&all")) {
            result.push(...map.get("&all"));
        }
        return result;
    }
}

export class updateManager {
    constructor() {
        this.objects = new Map();
        this.groups = new Map();
        this.ids = new Map();
        this.flags = new Map();
    }

    get(IDs) {
        if (!("o" in IDs)) IDs.o = "~@all";
        if (!("i" in IDs)) IDs.i = "~@all";
        if (!("g" in IDs)) IDs.g = "~@all";
        if (!("f" in IDs)) IDs.f = "~@all";
        /** @type {Array} */
        const o = getFn(this.objects,IDs.o);
        /** @type {Array} */
        const g = getFn(this.groups,IDs.g);
        /** @type {Array} */
        const i = getFn(this.ids,IDs.i);
        /** @type {Array} */
        const f = getFn(this.flags,IDs.f);
        return o.filter(item => g.includes(item)).filter(item => i.includes(item)).filter(item => f.includes(item));
    }

    deleteDataBlock(deleteData) {
        this.objects.forEach((list, object) => {
            list = list.filter(data => deleteData != data);
            if (list.length == 0) {
                this.objects.delete(object);
            }
        })
        this.groups.forEach((list, group) => {
            list = list.filter(data => deleteData != data);
            if (list.length == 0) {
                this.groups.delete(group);
            }
        })
        this.ids.forEach((list, id) => {
            list = list.filter(data => deleteData != data);
            if (list.length == 0) {
                this.ids.delete(id);
            }
        })
        this.flags.forEach((list, flag) => {
            list = list.filter(data => deleteData != data);
            if (list.length == 0) {
                this.flags.delete(flag);
            }
        })
    }

    delete(IDs) {
        if (!("o" in IDs)) IDs.o = "~@all";
        if (!("i" in IDs)) IDs.i = "~@all";
        if (!("g" in IDs)) IDs.g = "~@all";
        if (!("f" in IDs)) IDs.f = "~@all";
        /** @type {Array} */
        const o = IDs.o == "~@all" ? [...this.objects.values()].flat() : this.objects.has(IDs.o) ? this.objects.get(IDs.o) : [];
        /** @type {Array} */
        const g = IDs.g == "~@all" ? [...this.groups.values()].flat() : this.groups.has(IDs.g) ? this.groups.get(IDs.g) : [];
        /** @type {Array} */
        const i = IDs.i == "~@all" ? [...this.ids.values()].flat() : this.ids.has(IDs.i) ? this.ids.get(IDs.i) : [];
        /** @type {Array} */
        const f = IDs.f == "~@all" ? [...this.flags.values()].flat() : this.flags.has(IDs.f) ? this.flags.get(IDs.f) : [];
        // &allをどう扱うか
        // /** @type {Array} */
        // const o = getFn(this.objects,IDs.o);
        // /** @type {Array} */
        // const g = getFn(this.groups,IDs.g);
        // /** @type {Array} */
        // const i = getFn(this.ids,IDs.i);
        // /** @type {Array} */
        // const f = getFn(this.flags,IDs.f);
        const deleteObjects = o.filter(item => g.includes(item)).filter(item => i.includes(item)).filter(item => f.includes(item));
        this.objects.forEach((list, object) => {
            list = list.filter(data => !deleteObjects.includes(data));
            if (list.length == 0) {
                this.objects.delete(object);
            }
        })
        this.groups.forEach((list, group) => {
            list = list.filter(data => !deleteObjects.includes(data));
            if (list.length == 0) {
                this.groups.delete(group);
            }
        })
        this.ids.forEach((list, id) => {
            list = list.filter(data => !deleteObjects.includes(data));
            if (list.length == 0) {
                this.ids.delete(id);
            }
        })
        this.flags.forEach((list, flag) => {
            list = list.filter(data => !deleteObjects.includes(data));
            if (list.length == 0) {
                this.flags.delete(flag);
            }
        })
    }

    set(IDs, updateFn, others = null) {
        if (!("i" in IDs)) IDs.i = "defo";
        if (!("g" in IDs)) IDs.g = "defo";
        if (!("f" in IDs)) IDs.f = "defo";
        const object = IDs.o;
        const groupID = IDs.g;
        const ID = IDs.i;
        const flag = IDs.f;
        const dataBlock = new updateManager_DataBlock(object, groupID, ID, flag, updateFn, others);
        // o
        let o = this.objects.get(object);
        if (!this.objects.has(object)) {
            o = [];
            this.objects.set(object, o);
        }
        o.push(dataBlock);
        // g
        let g = this.groups.get(groupID);
        if (!this.groups.has(groupID)) {
            g = [];
            this.groups.set(groupID, g);
        }
        g.push(dataBlock);
        // i
        let i = this.ids.get(ID);
        if (!this.ids.has(ID)) {
            i = [];
            this.ids.set(ID, i);
        }
        i.push(dataBlock);
        // f
        let f = this.flags.get(flag);
        if (!this.flags.has(flag)) {
            f = [];
            this.flags.set(flag, f);
        }
        f.push(dataBlock);
        return dataBlock;
    }

    submitFn(dataBlocks) {
        for (const element of dataBlocks) {
            if (typeof element.fn === 'function') {
                // console.log("送信", object, groupID, element);
                element.fn(element.object, element.groupID, element.others);
            }
        }
    }

    update(IDs) {
        // console.log(this);
        const dataBlocks = this.get(IDs);
        this.submitFn(dataBlocks);
    }

    allUpdate() {
        const dataBlocks = this.get({});
        this.submitFn(dataBlocks);
    }
}