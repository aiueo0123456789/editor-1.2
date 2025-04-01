import { isPlainObject } from "../utility.js";

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

    update(object, ID = ":ALL:") {
        const o = this.objectsMap.get(object);
        if (o) {
            if (ID == ":ALL:") {
                o.forEach((i, id) => {
                    i.forEach((DOM_Fn, groupID) => {
                        DOM_Fn[1](object, groupID, DOM_Fn[0], DOM_Fn[2]);
                    });
                });
            } else {
                const i = o.get(ID);
                if (i) {
                    i.forEach((DOM_Fn, groupID) => {
                        DOM_Fn[1](object, groupID, DOM_Fn[0], DOM_Fn[2]);
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
                    DOM_Fn[1](object, groupID, DOM_Fn[0], DOM_Fn[2]);
                }
            });
        }
    }

    allUpdate() {
        this.objectsMap.forEach((o, object) => {
            o.forEach((i, id) => {
                i.forEach((DOM_Fn, groupID) => {
                    DOM_Fn[1](object, groupID, DOM_Fn[0], DOM_Fn[2]);
                });
            });
        });
    }
}