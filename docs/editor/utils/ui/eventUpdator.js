import { indexOfSplice, isPlainObject } from "../utility.js";
import { managerForDOMs } from "./util.js";

export class DataBlock {
    constructor(tag, updateFn, others) {
        this.tag = tag;
        this.updateFn = updateFn;
        this.others = others;
    }
}

export function removeObjectInHTMLElement(object, maxDepth = 10) {
    // 全てループしてメモリ解放
    const fn = (data, depth = 0) => {
        if (maxDepth <= depth) return ;
        if (data instanceof HTMLElement) { // HTMLElementなら削除
            data.remove();
        } else if (data?.customTag) { // カスタムタグなら削除
            data.remove();
        } else if (isPlainObject(data)) { // 連想配列なら中身をループ
            for (const key in data) {
                fn(data[key], depth + 1);
            }
        } else if (Array.isArray(data)) { // 配列なら中身をループ
            for (const value of data) {
                fn(value, depth + 1);
            }
        }
    }
    fn(object);
}

export class DOMsManager_DataBlock {
    constructor(object, groupID, id, flag, dom, fn, others) {
        this.object = object;
        this.groupID = groupID;
        this.id = id;
        this.dom = dom;
        this.fn = fn;
        this.others = others;
        this.flag = flag;
    }

    remove(maxDepth = 2) {
        // 全てループしてメモリ解放
        const fn = (data, depth = 0) => {
            if (maxDepth <= depth) return ;
            if (data instanceof HTMLElement) { // HTMLElementなら削除
                data.remove();
            } else if (data?.customTag) { // カスタムタグなら削除
                data.remove();
            } else if (isPlainObject(data)) { // 連想配列なら中身をループ
                for (const key in data) {
                    fn(data[key], depth + 1);
                }
            } else if (Array.isArray(data)) { // 配列なら中身をループ
                for (const value of data) {
                    fn(value, depth + 1);
                }
            }
        }
        fn(this.dom);
        fn(this.others);
        indexOfSplice(managerForDOMs.flags.get(this.flag), this);
        const o = managerForDOMs.objectsMap.get(this.object);
        if (o) {
            const i = o.get(this.id);
            if (i) {
                const g = i.get(this.groupID);
                if (g) {
                    indexOfSplice(g, this);
                }
            }
        }
    }
}

export class DOMsManager {
    constructor() {
        this.objectsMap = new Map();
        /* {
            object: { o
                defo: { i
                    groupID: [DOM, updateFn, others], g
                    .
                    .
                    .
                },
                ID: { i
                    groupID: [DOM, updateFn, others], g
                    .
                    .
                    .
                },
                .
                .
                .
            }
        } */
        this.flags = new Map();
    }

    set(IDs, DOM, updateFn, others = null) {
        if (!IDs.i) IDs.i = "defo";
        if (!IDs.f) IDs.f = "defo";
        const object = IDs.o;
        const groupID = IDs.g;
        const ID = IDs.i;
        const flag = IDs.f;
        if (!this.objectsMap.has(object)) {
            this.objectsMap.set(object, new Map());
        }
        const o = this.objectsMap.get(object);
        if (!o.has(ID)) {
            o.set(ID, new Map());
        }
        const i = o.get(ID);
        if (!i.has(groupID)) {
            i.set(groupID, []);
        }
        const dataBlock = new DOMsManager_DataBlock(object, groupID, ID, flag, DOM, updateFn, others);
        const g = i.get(groupID).push(dataBlock);
        if (!this.flags.has(flag)) {
            this.flags.set(flag, []);
        }
        this.flags.get(flag).push(dataBlock);
    }

    deleteDOM(object, groupID, ID) {
        const o = this.objectsMap.get(object);
        if (o) {
            const i = o.get(ID);
            if (i) {
                const g = i.get(groupID);
                if (g) {
                    for (const element of g) {
                        element.remove();
                    }
                    i.delete(groupID);
                }
            }
        }
    }

    deleteFlag(flag) {
        console.log(this.flags, flag)
        if (!this.flags.has(flag)) return ;
        for (const data of this.flags.get(flag)) {
            data.remove();
        }
    }

    getFromFlag(flag) {
        return this.flags.get(flag);
    }

    get(object, groupID, ID, flag) {
        const result = [];
    }

    // getDataInObjectAndGroupID(object, groupID) {
    //     const o = this.objectsMap.get(object);
    //     if (o) {
    //         const result = [];
    //         o.forEach((i, id) => {
    //             const g = i.get(groupID);
    //             if (g) {
    //                 result.push(g);
    //             }
    //         });
    //         return result;
    //     }
    //     return [];
    // }

    getGroupAndID(groupID, ID) {
        const result = new Map();
        this.objectsMap.forEach((o, object) => {
            const i = o.get(ID)
            if (i) {
                const g = i.get(groupID);
                if (g) {
                    for (const element of g) {
                        result.set(object,element);
                    }
                }
            }
        });
        return result;
    }

    // getDOMInObjectAndGroupID(object, groupID, ID = "defo") {
    //     const o = this.objectsMap.get(object);
    //     if (o) {
    //         const i = o.get(ID);
    //         if (i) {
    //             const g = i.get(groupID);
    //             if (g) {
    //                 return g;
    //             }
    //         }
    //     }
    //     return null;
    // }

    getObjectAndGroupID(object, groupID, ID = "defo") {
        const o = this.objectsMap.get(object);
        if (o) {
            const i = o.get(ID);
            if (i) {
                const g = i.get(groupID);
                if (g) {
                    return g;
                }
            }
        }
        return [];
    }

    deleteGroup(groupID) {
        this.objectsMap.forEach((o, object) => {
            o.forEach((i, id) => {
                const g = i.get(groupID);
                if (g) {
                    for (const element of g) {
                        element.remove();
                    }
                    i.delete(groupID);
                }
            });
        });
    }

    deleteObject(object) {
        const o = this.objectsMap.get(object);
        if (o) {
            o.forEach((i, id) => {
                i.forEach((g, groupID) => {
                    for (const element of g) {
                        element.remove();
                    }
                    i.delete(groupID);
                });
            });
            o.clear();
            this.objectsMap.delete(object);
        }
    }

    submitFn(object, groupID, list) {
        for (const element of list) {
            if (typeof element.fn === 'function') {
                // console.log("送信", object, groupID, element);
                element.fn(object, groupID, element.dom, element.others);
            }
        }
    }

    update(object, ID = "all") {
        const o = this.objectsMap.get(object);
        if (o) {
            if (ID == "all") {
                o.forEach((i, id) => {
                    i.forEach((g, groupID) => {
                        this.submitFn(object, groupID, g);
                    });
                });
            } else {
                const i = o.get(ID);
                if (i) {
                    i.forEach((g, groupID) => {
                        this.submitFn(object, groupID, g);
                    });
                }
            }
        }
    }

    updateGroupInObject(object, groupID) {
        const o = this.objectsMap.get(object);
        if (o) {
            o.forEach((i, id) => {
                const g = i.get(groupID);
                if (g) {
                    this.submitFn(object, groupID, g);
                }
            });
        }
    }

    allUpdate() {
        this.objectsMap.forEach((o, object) => {
            o.forEach((i, id) => {
                i.forEach((g, groupID) => {
                    this.submitFn(object, groupID, g);
                });
            });
        });
    }
}