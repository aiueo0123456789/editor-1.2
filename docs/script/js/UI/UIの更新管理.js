import { isPlainObject } from "../utility.js";

export class DataBlock {
    constructor(tag, updateFn, others) {
        this.tag = tag;
        this.updateFn = updateFn;
        this.others = others;
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
    }

    set(object, groupID, DOM, updateFn, others = null, ID = "defo") {
        if (!this.objectsMap.has(object)) {
            this.objectsMap.set(object, new Map());
        }
        const o = this.objectsMap.get(object);
        if (!o.has(ID)) {
            o.set(ID, new Map());
        }
        const i = o.get(ID);
        i.set(groupID, [DOM, updateFn, others]);
    }

    delete(object, groupID, ID) {
        const a = new Map();
        const o = this.objectsMap.get(object);
        if (o) {
            const i = o.get(ID);
            if (i) {
                const g = i.get(groupID);
                if (g) {
                    const fn = (data) => {
                        if (data instanceof HTMLElement) {
                            data.remove();
                        } else if (isPlainObject(data)) {
                            for (const key in data) {
                                fn(data[key]);
                            }
                        } else if (Array.isArray(data)) {
                            for (const value of data) {
                                fn(value);
                            }
                        }
                    }
                    fn(g);
                    i.delete(groupID);
                }
            }
        }
    }

    getGroupInObject(object, groupID, ID = "defo") {
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
        return null;
    }

    getGroupAndID(groupID, ID) {
        const result = new Map();
        this.objectsMap.forEach((o, object) => {
            const i = o.get(ID)
            if (i) {
                const g = i.get(groupID);
                if (g) {
                    result.set(object,g);
                }
            }
        });
        return result;
    }

    getDOMInObject(object, groupID, ID = "defo") {
        const o = this.objectsMap.get(object);
        if (o) {
            const i = o.get(ID);
            if (i) {
                const g = i.get(groupID);
                if (g) {
                    return g[0];
                }
            }
        }
        return null;
    }

    deleteGroup(groupID) {
        this.objectsMap.forEach((o, object) => {
            o.forEach((i, id) => {
                const g = i.get(groupID);
                if (g) {
                    const fn = (data) => {
                        if (data instanceof HTMLElement) {
                            data.remove();
                        } else if (isPlainObject(data)) {
                            for (const key in data) {
                                fn(data[key]);
                            }
                        } else if (Array.isArray(data)) {
                            for (const value of data) {
                                fn(value);
                            }
                        }
                    }
                    fn(g);
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
                    const fn = (data) => {
                        if (data instanceof HTMLElement) {
                            data.remove();
                        } else if (isPlainObject(data)) {
                            for (const key in data) {
                                fn(data[key]);
                            }
                        } else if (Array.isArray(data)) {
                            for (const value of data) {
                                fn(value);
                            }
                        }
                    }
                    fn(g);
                    i.delete(groupID);
                });
            });
            o.clear();
            this.objectsMap.delete(object);
        }
    }

    submitFn(object, groupID,DOM_Fn) {
        if (typeof DOM_Fn[1] === 'function') {
            DOM_Fn[1](object, groupID, DOM_Fn[0], DOM_Fn[2]);
        }
    }

    update(object, ID = ":ALL:") {
        const o = this.objectsMap.get(object);
        if (o) {
            if (ID == ":ALL:") {
                o.forEach((i, id) => {
                    i.forEach((DOM_Fn, groupID) => {
                        this.submitFn(object, groupID,DOM_Fn);
                    });
                });
            } else {
                const i = o.get(ID);
                if (i) {
                    i.forEach((DOM_Fn, groupID) => {
                        this.submitFn(object, groupID,DOM_Fn);
                    });
                }
            }
        }
    }

    updateGroupInObject(object, groupID) {
        const o = this.objectsMap.get(object);
        if (o) {
            o.forEach((i, id) => {
                const DOM_Fn = i.get(groupID);
                if (DOM_Fn) {
                    this.submitFn(object, groupID,DOM_Fn);
                }
            });
        }
    }

    allUpdate() {
        this.objectsMap.forEach((o, object) => {
            o.forEach((i, id) => {
                i.forEach((DOM_Fn, groupID) => {
                    this.submitFn(object, groupID,DOM_Fn);
                });
            });
        });
    }
}