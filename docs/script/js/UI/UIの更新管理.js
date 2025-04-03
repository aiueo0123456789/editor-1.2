import { isPlainObject } from "../utility.js";

export class DOMsManager {
    constructor() {
        this.objectsMap = new Map();
        /* {
            object: { o
                defo: { i
                    groupparameter: [DOM, updateFn, others], g
                    .
                    .
                    .
                },
                parameter: { i
                    groupparameter: [DOM, updateFn, others], g
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

    set(object, groupparameter, DOM, updateFn, others = null, parameter = "defo") {
        if (!this.objectsMap.has(object)) {
            this.objectsMap.set(object, new Map());
        }
        const o = this.objectsMap.get(object);
        if (!o.has(parameter)) {
            o.set(parameter, new Map());
        }
        const i = o.get(parameter);
        i.set(groupparameter, [DOM, updateFn, others]);
    }

    getGroupInObject(object, groupparameter, parameter = "defo") {
        const o = this.objectsMap.get(object);
        if (o) {
            const i = o.get(parameter);
            if (i) {
                const g = i.get(groupparameter);
                if (g) {
                    return g;
                }
            }
        }
        return null;
    }

    getDOMInObject(object, groupparameter, parameter = "defo") {
        const o = this.objectsMap.get(object);
        if (o) {
            const i = o.get(parameter);
            if (i) {
                const g = i.get(groupparameter);
                if (g) {
                    return g[0];
                }
            }
        }
        return null;
    }

    deleteGroup(groupparameter) {
        this.objectsMap.forEach((o, object) => {
            o.forEach((i, id) => {
                const g = i.get(groupparameter);
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
                    i.delete(groupparameter);
                }
            });
        });
    }

    deleteObject(object) {
        const o = this.objectsMap.get(object);
        if (o) {
            o.forEach((i, id) => {
                i.forEach((g, groupparameter) => {
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
                    i.delete(groupparameter);
                });
            });
            o.clear();
            this.objectsMap.delete(object);
        }
    }

    update(object, parameter = ":ALL:") {
        const o = this.objectsMap.get(object);
        if (o) {
            if (parameter == ":ALL:") {
                o.forEach((i, id) => {
                    i.forEach((DOM_Fn, groupparameter) => {
                        DOM_Fn[1](object, groupparameter, DOM_Fn[0], DOM_Fn[2]);
                    });
                });
            } else {
                const i = o.get(parameter);
                if (i) {
                    i.forEach((DOM_Fn, groupparameter) => {
                        DOM_Fn[1](object, groupparameter, DOM_Fn[0], DOM_Fn[2]);
                    });
                }
            }
        }
    }

    updateGroupInObject(object, groupparameter) {
        const o = this.objectsMap.get(object);
        if (o) {
            o.forEach((i, id) => {
                const DOM_Fn = i.get(groupparameter);
                if (DOM_Fn) {
                    DOM_Fn[1](object, groupparameter, DOM_Fn[0], DOM_Fn[2]);
                }
            });
        }
    }

    allUpdate() {
        this.objectsMap.forEach((o, object) => {
            o.forEach((i, id) => {
                i.forEach((DOM_Fn, groupparameter) => {
                    DOM_Fn[1](object, groupparameter, DOM_Fn[0], DOM_Fn[2]);
                });
            });
        });
    }
}