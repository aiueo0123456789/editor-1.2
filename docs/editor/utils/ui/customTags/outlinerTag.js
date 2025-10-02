import { app } from "../../../../main.js";
import { isFunction } from "../../utility.js";
import { createID, createTag, managerForDOMs } from "../util.js";
import { InputCheckboxTag } from "./inputCheckboxTag.js";

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
    // constructor(creatorForUI, t, withObject, loopTarget, structures, searchTarget, options, flag) {
        constructor(creatorForUI,t,searchTarget,child,flag) {
        const options = child.options;
        const isSourceFunction = isFunction(child.withObject);
        const source = child.withObject;
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
            result.selects = creatorForUI.findSource(options.selectSource.object, creatorForUI.globalInputObject);
        }
        let activeSource = null;
        if (options.activeSource) {
            activeSource = {object: creatorForUI.findSource(options.activeSource.object, creatorForUI.globalInputObject), parameter: options.activeSource.parameter};
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
        let rootObject = isSourceFunction ? source() : creatorForUI.getParameter(searchTarget, source);
        const getAllObject = () => {
            const getLoopChildren = (children, resultObject = []) => {
                let filterBool_ = false;
                const filterData = options.filter;
                const fn0 = (child) => {
                    let filterBool = true;
                    filterBool = isFilterIncluded(child, searchFilter);
                    if (loopTargetIsPlainObject) {
                        const targetType = child[loopTarget.parameter];
                        const loopTargets = loopTarget.loopTargets[targetType] ? loopTarget.loopTargets[targetType] : loopTarget.loopTargets["others"];
                        for (const l of loopTargets) {
                            const nextChildren = creatorForUI.findSource(l, child);
                            if (nextChildren) { // 子要素がある場合ループする
                                const fnResult = getLoopChildren(nextChildren, resultObject);
                                if (fnResult.filter) {
                                    filterBool = true;
                                }
                            }
                        }
                    } else {
                        for (const l of loopTarget) {
                            const nextChildren = creatorForUI.findSource(l, child);
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
            rootObject = isSourceFunction ? source() : creatorForUI.getParameter(searchTarget, source);
            array.length = 0;
            const allObject = getAllObject();
            // 削除があった場合対応するDOMを削除
            for (const object of lastUpdateObjects) {
                if (!allObject.includes(object)) {
                    this.objectDomMap.delete(object);
                    managerForDOMs.deleteDOM(object, creatorForUI.groupID, outlinerID);
                }
            }
            // 追加があった場合新規作成
            for (const object of allObject) {
                // if (!managerForDOMs.getObjectAndGroupID(object, creatorForUI.groupID, outlinerID).length) {
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
                    const visibleCheck = new InputCheckboxTag(this,upContainer,{}, {tagType: "input", type: "checkbox", look: {check: "down", uncheck: "right"}},"defo");
                    visibleCheck.checkbox.checked = true;
                    /** @type {HTMLElement} */
                    const myContainer = createTag(upContainer, "div");
                    const childrenContainer = createTag(container, "div", {style: "marginLeft: 10px; height: fit-content;"});
                    creatorForUI.createFromChildren(myContainer, structures, object, flag);
                    visibleCheck.checkbox.addEventListener("change", () => {
                        childrenContainer.classList.toggle("hidden");
                    })
                    this.objectDomMap.set(object, container);
                    managerForDOMs.set({o: object, g: creatorForUI.groupID, i: outlinerID, f: flag}, {container, myContainer, childrenContainer}, null, null); // セット
                }
            }
            lastUpdateObjects = [...allObject];
            const looper = (children,targetDOM = this.scrollable) => {
                const fn0 = (child) => {
                    if (allObject.includes(child)) {
                        try {
                            const managerObject = managerForDOMs.getObjectAndGroupID(child, creatorForUI.groupID, outlinerID)[0].dom;
                            targetDOM.append(managerObject.container);
                            if (loopTargetIsPlainObject) {
                                const targetType = child[loopTarget.parameter];
                                const loopTargets = loopTarget.loopTargets[targetType] ? loopTarget.loopTargets[targetType] : loopTarget.loopTargets["others"];
                                for (const l of loopTargets) {
                                    const nextChildren = creatorForUI.findSource(l, child);
                                    if (nextChildren) { // 子要素がある場合ループする
                                        looper(nextChildren, managerObject.childrenContainer);
                                    }
                                }
                            } else {
                                for (const l of loopTarget) {
                                    const nextChildren = creatorForUI.findSource(l, child);
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
            const createdTags = managerForDOMs.getGroupAndID(creatorForUI.groupID, outlinerID); // すでに作っている場合
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
        managerForDOMs.set({o: activeSource.object, g: creatorForUI.groupID, i: activeSource.parameter, f: flag}, t, listActive, null);
        managerForDOMs.set({o: result.selects, g: creatorForUI.groupID, f: flag}, t, listActive, null);
        const setUpdateEventTarget = (updateEventTarget) => {
            if (updateEventTarget.path) {
                creatorForUI.setUpdateEventToParameter(searchTarget, updateEventTarget.path, outlinerUpdate);
            } else { // 文字列に対応
                managerForDOMs.set({o: updateEventTarget, g: creatorForUI.groupID, f: flag},null,outlinerUpdate);
            }
        }
        if (child.updateEventTarget) {
            if (Array.isArray(child.updateEventTarget)) {
                for (const updateEventTarget of child.updateEventTarget) {
                    setUpdateEventTarget(updateEventTarget);
                }
            } else {
                setUpdateEventTarget(child.updateEventTarget);
            }
        } else {
            if (!isSourceFunction) {
                managerForDOMs.set({o: creatorForUI.getParameter(searchTarget, source), g: creatorForUI.groupID, f: flag},null,outlinerUpdate);
            }
        }
        outlinerUpdate();
    }

    getDomFromObject(object) {
        return this.objectDomMap.get(object);
    }

    remove() {
        this.scrollable.remove();
        this.container.remove();
    }
}