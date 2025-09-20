import { app } from "../../../../main.js";
import { isFunction } from "../../utility.js";
import { createID, createTag, managerForDOMs } from "../util.js";
import { Checkbox } from "./checkboxTag.js";

function isFilterIncluded(object, filter = "all") {
    if (filter == "all" || filter == "") {
        return true;
    } else {
        const bools = filter.replace(/\s+/g, "").split("||").filter(Boolean).map(block => {
            const bools_ = block.split(";").map(block_ => {
                const condition = block_.split(":");
                return object[condition[0]] == condition[1];
            });
            return !bools_.includes(false);
        });
        return bools.includes(true);
    }
}

export class OutlinerTag {
    // constructor(this_, t, withObject, loopTarget, structures, searchTarget, options, flag) {
        constructor(this_,t,searchTarget,child,flag) {
        const options = child.options;
        const withObject = child.withObject;
        const structures = child.structures;
        let loopTarget = child.loopTarget;
        let loopTargetIsPlainObject = false;
        if (loopTarget.parameter && loopTarget.loopTargets) {
            loopTargetIsPlainObject = true;
        } else if (!Array.isArray(loopTarget)) {
            loopTarget = [loopTarget];
        }
        const outlinerID = createID();
        let searchFilter = "";
        let searchParameter = "type";

        this.container = createTag(t, "div", {style: "display: grid; width: 100%; height: 100%; gridTemplateRows: auto auto 1fr; backgroundColor: var(--subColor);"});
        const seachBox = createTag(this.container, "div", {class: "searchBox"});
        const input = createTag(seachBox, "input", {style: "fontSize: 120%",value: ""});
        input.addEventListener("input", () => {
            searchFilter = input.value;
            outlinerUpdate();
        })
        this.scrollableContainer = createTag(this.container, "div", {style: "width: 100%; height: 100%;"});

        let result = {active: null, selects: []};
        if (options.selectSource) {
            result.selects = this_.findSource(options.selectSource.object, this_.globalInputObject);
        }
        let activeSource = null;
        if (options.activeSource) {
            activeSource = {object: this_.findSource(options.activeSource.object, this_.globalInputObject), parameter: options.activeSource.parameter};
        } else {
            activeSource = {object: result, parameter: "active"};
        }
        // 最後の更新時に更新されたオブジェクトたち
        this.objectDomMap = new Map();
        let lastUpdateObjects = [];
        let rangeStartIndex = 0;
        let rangeEndIndex = 0;
        this.scrollable = createTag(this.scrollableContainer, "div", {class: "scrollable"});
        const array = [];
        let rootObject = isFunction(withObject) ? withObject() : this_.getParameter(searchTarget, withObject);
        const getAllObject = () => {
            const getLoopChildren = (children, resultObject = []) => {
                let filterBool_ = false;
                const filterData = options.filter;
                const fn0 = (child) => {
                    let filterBool = true;
                    filterBool = isFilterIncluded(child, searchFilter);
                    // if (filterData) {
                    //     if (filterData.contains) {
                    //         if (child[searchParameter] == searchFilter) {
                    //             filterBool = true;
                    //         }
                    //     }
                    // }
                    if (loopTargetIsPlainObject) {
                        const targetType = child[loopTarget.parameter];
                        const loopTargets = loopTarget.loopTargets[targetType] ? loopTarget.loopTargets[targetType] : loopTarget.loopTargets["others"];
                        for (const l of loopTargets) {
                            const nextChildren = this_.findSource(l, child);
                            if (nextChildren) { // 子要素がある場合ループする
                                const fnResult = getLoopChildren(nextChildren, resultObject);
                                if (fnResult.filter) {
                                    filterBool = true;
                                }
                            }
                        }
                    } else {
                        for (const l of loopTarget) {
                            const nextChildren = this_.findSource(l, child);
                            if (nextChildren) { // 子要素がある場合ループする
                                const fnResult = getLoopChildren(nextChildren, resultObject);
                                if (fnResult.filter) {
                                    filterBool = true;
                                }
                            }
                        }
                    }
                    if (filterBool) {
                        resultObject.push(child);
                        filterBool_ = true;
                    }
                }
                if (Array.isArray(children)) {
                    for (const child of children) {
                        fn0(child);
                    }
                } else {
                    fn0(children);
                }
                return {filter: filterBool_,result: resultObject};
            }
            return getLoopChildren(rootObject).result;
        }
        const outlinerUpdate = (o, gID, t) => {
            if (isFunction(withObject)) rootObject = withObject();
            array.length = 0;
            const allObject = getAllObject();
            // 削除があった場合対応するDOMを削除
            for (const object of lastUpdateObjects) {
                if (!allObject.includes(object)) {
                    this.objectDomMap.delete(object);
                    managerForDOMs.deleteDOM(object, this_.groupID, outlinerID);
                }
            }
            // 追加があった場合新規作成
            for (const object of allObject) {
                // if (!managerForDOMs.getObjectAndGroupID(object, this_.groupID, outlinerID).length) {
                if (!lastUpdateObjects.includes(object)) {
                    const container = createTag(null, "div", {style: "paddingLeft: 2px; height: fit-content; minHeight: auto;"});
                    container.addEventListener("click", (event) => {
                        if (app.input.keysDown["Shift"]) {
                            rangeEndIndex = array.indexOf(object);
                            if (isFunction(options.rangeSelectEventFn)) {
                                options.rangeSelectEventFn(event, array, rangeStartIndex, rangeEndIndex);
                            }
                        } else {
                            rangeStartIndex = array.indexOf(object);
                            if (isFunction(options.clickEventFn)) { // 関数が設定されていたら適応
                                options.clickEventFn(event, object);
                            } else {
                                activeSource.object[activeSource.parameter] = object;
                                result.active = object;
                                if (!app.input.keysDown["Shift"]) {
                                    result.selects.length = 0;
                                }
                                result.selects.push(object);
                                console.log(result,activeSource);
                                event.stopPropagation();
                                // managerForDOMs.update(list, "選択情報");
                            }
                        }
                    });

                    const upContainer = createTag(container, "div", {style: "display: grid; gridTemplateColumns: auto 1fr; height: fit-content;"});
                    const visibleCheck = new Checkbox(this,upContainer,{},{type: "checkbox", options: {look: "arrow"}},"defo");
                    visibleCheck.checkbox.checked = true;
                    /** @type {HTMLElement} */
                    const myContainer = createTag(upContainer, "div");
                    const childrenContainer = createTag(container, "div", {style: "marginLeft: 10px; height: fit-content;"});
                    this_.createFromChildren(myContainer, structures, object, flag);
                    visibleCheck.checkbox.addEventListener("change", () => {
                        childrenContainer.classList.toggle("hidden");
                    })
                    this.objectDomMap.set(object, container);
                    managerForDOMs.set({o: object, g: this_.groupID, i: outlinerID, f: flag}, {container, myContainer, childrenContainer}, null, null); // セット
                }
            }
            lastUpdateObjects = [...allObject];
            const looper = (children,targetDOM = this.scrollable) => {
                const fn0 = (child) => {
                    if (allObject.includes(child)) {
                        try {
                            const managerObject = managerForDOMs.getObjectAndGroupID(child, this_.groupID, outlinerID)[0].dom;
                            targetDOM.append(managerObject.container);
                            if (loopTargetIsPlainObject) {
                                const targetType = child[loopTarget.parameter];
                                const loopTargets = loopTarget.loopTargets[targetType] ? loopTarget.loopTargets[targetType] : loopTarget.loopTargets["others"];
                                for (const l of loopTargets) {
                                    const nextChildren = this_.findSource(l, child);
                                    if (nextChildren) { // 子要素がある場合ループする
                                        looper(nextChildren, managerObject.childrenContainer);
                                    }
                                }
                            } else {
                                for (const l of loopTarget) {
                                    const nextChildren = this_.findSource(l, child);
                                    if (nextChildren) { // 子要素がある場合ループする
                                        looper(nextChildren, managerObject.childrenContainer);
                                    }
                                }
                            }
                            array.push(child);
                        } catch {
                            console.warn("ヒエラルキーが正常に生成できませんでした");
                        }
                    }
                }
                if (Array.isArray(children)) {
                    for (const child of children) {
                        fn0(child);
                    }
                } else {
                    fn0(children);
                }
            }
            looper(rootObject);
        }
        // 選択表示の更新
        const listActive = (o, gID, t) => {
            console.log("ヒエラルキーアクティブ")
            const createdTags = managerForDOMs.getGroupAndID(this_.groupID, outlinerID); // すでに作っている場合
            createdTags.forEach((data, object) => {
                const bool_ = activeSource.object[activeSource.parameter] == object;
                if (bool_) {
                    data.dom.myContainer.classList.add("activeColor");
                } else {
                    data.dom.myContainer.classList.remove("activeColor");
                    const bool__ = result.selects.includes(object);
                    if (bool__) {
                        data.dom.myContainer.classList.add("activeColor2");
                    } else {
                        data.dom.myContainer.classList.remove("activeColor2");
                    }
                }
            })
        }
        managerForDOMs.set({o: activeSource.object, g: this_.groupID, i: activeSource.parameter, f: flag}, t, listActive, null);
        managerForDOMs.set({o: result.selects, g: this_.groupID, f: flag}, t, listActive, null);
        if (child.updateEventTarget) {
            managerForDOMs.set({o: child.updateEventTarget, g: this_.groupID, f: flag}, this.scrollable, outlinerUpdate);
        } else {
            managerForDOMs.set({o: rootObject, g: this_.groupID, f: flag}, this.scrollable, outlinerUpdate);
            managerForDOMs.updateGroupInObject(rootObject, this_.groupID);
        }
    }

    getDomFromObject(object) {
        return this.objectDomMap.get(object);
    }

    remove() {
        this.scrollable.remove();
        this.container.remove();
    }
}