import { app } from "../../../../main.js";
import { isFunction } from "../../utility.js";
import { CustomTag } from "../customTag.js";
import { createID, createTag, managerForDOMs, removeHTMLElementInObject } from "../util.js";
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

export class OutlinerTag extends CustomTag {
    constructor(creatorForUI,t,parent,searchTarget,child,flag) {
        super();
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

        this.element = createTag(t, "div", {style: "display: grid; width: 100%; height: 100%; gridTemplateRows: auto auto 1fr; backgroundColor: var(--subColor);"});
        const searchBox = createTag(this.element, "div", {class: "searchBox"});
        const input = createTag(searchBox, "input", {style: "fontSize: 120%",value: ""});
        input.addEventListener("input", () => {
            searchFilter = input.value;
            outlinerUpdate();
        })
        /** @type {HTMLElement} */
        this.scrollableContainer = createTag(this.element, "div", {style: "width: 100%; height: 100%;"});

        let result = {active: null, selects: []};
        if (options.selectSource) {
            result.selects = creatorForUI.getParameter(searchTarget, options.selectSource.object);
        }
        let activeSource = null;
        if (options.activeSource) {
            activeSource = {object: creatorForUI.getParameter(searchTarget, options.activeSource.object), parameter: options.activeSource.parameter};
        } else {
            activeSource = {object: result, parameter: "active"};
        }
        // 最後の更新時に更新されたオブジェクトたち
        this.objectDomMap = new Map();
        let lastUpdateObjects = [];
        let rangeStartIndex = 0;
        let rangeEndIndex = 0;
        /** @type {HTMLElement} */
        this.scrollable = createTag(this.scrollableContainer, "div", {class: "scrollable"});
        const array = [];
        let rootObject = isSourceFunction ? source() : creatorForUI.getParameter(searchTarget, source);
        let lastScroll = 0;
        const getAllObject = () => {
            const getLoopChildren = (children, resultObject = []) => {
                let filterBool_ = false;
                const filterData = options.filter;
                const fn0 = (child) => {
                    let filterBool = true;
                    filterBool = isFilterIncluded(child, searchFilter);
                    if (loopTargetIsPlainObject) {
                        const targetType = child[loopTarget.parameter];
                        const loopTargets = loopTarget.loopTargets[targetType] ? loopTarget.loopTargets[targetType] : loopTarget.loopTargets["others"] ? loopTarget.loopTargets["others"] : [];
                        for (const l of loopTargets) {
                            const nextChildren = creatorForUI.getParameter({normal: child, special: {}}, l);
                            if (nextChildren) { // 子要素がある場合ループする
                                const fnResult = getLoopChildren(nextChildren, resultObject);
                                if (fnResult.filter) {
                                    filterBool = true;
                                }
                            }
                        }
                    } else {
                        for (const l of loopTarget) {
                            const nextChildren = creatorForUI.getParameter({normal: child, special: {}}, l);
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
        const outlinerUpdate = () => {
            rootObject = isSourceFunction ? source() : creatorForUI.getParameter(searchTarget, source);
            array.length = 0;
            const allObject = getAllObject();
            // 削除があった場合対応するDOMを削除
            for (const object of lastUpdateObjects) {
                /** @type {HTMLElement} */
                // const childrenElement = data[0].others.childrenContainer;
                // this.scrollable.append(...childrenElement.children);
                if (!allObject.includes(object)) {
                    const container = this.objectDomMap.get(object);
                    container.remove();
                    // data[0].others.container.remove();
                    // data[0].others.container = null;
                    // data[0].others.myContainer.remove();
                    // data[0].others.myContainer = null;
                    // data[0].others.childrenContainer.remove();
                    // data[0].others.childrenContainer = null;
                    // for (const tag of data[0].others.children) {
                    //     tag.remove();
                    // }
                    // data[0].others.children.length = 0;
                    // data[0].others = null;
                    this.objectDomMap.delete(object);
                }
            }
            // 追加があった場合新規作成
            for (const object of allObject) {
                if (!lastUpdateObjects.includes(object)) {
                    /** @type {HTMLElement} */
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
                            }
                        }
                    });

                    const upContainer = createTag(container, "div", {style: "display: grid; gridTemplateColumns: auto 1fr; height: fit-content;"});
                    const visibleCheck = new InputCheckboxTag(null,upContainer,this,{}, {tagType: "input", type: "checkbox", look: {check: "down", uncheck: "right"}},"defo");
                    visibleCheck.checkbox.checked = true;
                    /** @type {HTMLElement} */
                    const myContainer = createTag(upContainer, "div");
                    const childrenContainer = createTag(container, "div", {style: "marginLeft: 10px; height: fit-content;"});
                    const children = creatorForUI.createFromChildren(myContainer, this, structures, {normal: object, special: {}}, flag);
                    visibleCheck.checkbox.addEventListener("change", () => {
                        childrenContainer.classList.toggle("hidden");
                    })
                    this.objectDomMap.set(object, container);
                }
            }
            lastUpdateObjects = [...allObject];
            // ヒエラルキーをセット
            const looper = (children, targetDOM = this.scrollable) => {
                const fn0 = (child) => {
                    if (allObject.includes(child)) {
                        try {
                            // const managerObject = managerForDOMs.get({o: child, g: creatorForUI.groupID, i: outlinerID})[0].others;
                            /** @type {HTMLElement} */
                            const container = this.objectDomMap.get(child);
                            targetDOM.append(container);
                            if (loopTargetIsPlainObject) {
                                const targetType = child[loopTarget.parameter];
                                const loopTargets = loopTarget.loopTargets[targetType] ? loopTarget.loopTargets[targetType] : loopTarget.loopTargets["others"];
                                for (const l of loopTargets) {
                                    const nextChildren = creatorForUI.getParameter({normal: child, special: {}}, l);
                                    if (nextChildren) { // 子要素がある場合ループする
                                        looper(nextChildren, container.children[1]);
                                    }
                                }
                            } else {
                                for (const l of loopTarget) {
                                    const nextChildren = creatorForUI.getParameter({normal: child, special: {}}, l);
                                    if (nextChildren) { // 子要素がある場合ループする
                                        looper(nextChildren, container.children[1]);
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
            // console.log("ヒエラルキーアクティブ")
            // const createdTags = managerForDOMs.get({g: creatorForUI.groupID, i: outlinerID}); // すでに作っている場合
            // createdTags.forEach((data, object) => {
            //     const bool_ = activeSource.object[activeSource.parameter] == object;
            //     if (bool_) {
            //         data.others.myContainer.classList.add("activeColor");
            //     } else {
            //         data.others.myContainer.classList.remove("activeColor");
            //         const bool__ = result.selects.includes(object);
            //         if (bool__) {
            //             data.others.myContainer.classList.add("activeColor2");
            //         } else {
            //             data.others.myContainer.classList.remove("activeColor2");
            //         }
            //     }
            // })
        }
        managerForDOMs.set({o: activeSource.object, g: creatorForUI.groupID, i: activeSource.parameter, f: flag}, listActive);
        managerForDOMs.set({o: result.selects, g: creatorForUI.groupID, f: flag}, listActive);
        console.log("ヒエラルキー更新対象", child.updateEventTarget)
        const setUpdateEventTarget = (updateEventTarget) => {
            if (updateEventTarget.path) {
                creatorForUI.setUpdateEventByPath(searchTarget, updateEventTarget.path, outlinerUpdate, flag);
            } else { // 文字列に対応
                managerForDOMs.set({o: updateEventTarget, g: creatorForUI.groupID, f: flag}, outlinerUpdate);
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
                managerForDOMs.set({o: creatorForUI.getParameter(searchTarget, source), g: creatorForUI.groupID, f: flag}, outlinerUpdate);
            }
        }
        outlinerUpdate();
    }

    getDomFromObject(object) {
        return this.objectDomMap.get(object);
    }
}