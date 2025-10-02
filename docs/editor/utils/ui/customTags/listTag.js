export class ListTag {
    constructor(creatorForUI,t,searchTarget,child,flag) {
        this.element;
        if (child.options.type == "min") {
            this.element = createMinList(t,child.label);
            const listOutputData = creatorForUI.createListChildren(this.element.list, child.liStruct, child.withObject, searchTarget, child.options, flag);
            if (child.appendEvent) {
                if (isFunction(child.appendEvent)) {
                    this.element.appendButton.addEventListener("click", child.appendEvent);
                }
            } else {
                this.element.appendButton.classList.add("color2");
                this.element.appendButton.style.pointerEvents = "none";
            }
            if (child.deleteEvent) {
                if (isFunction(child.deleteEvent)) {
                    this.element.deleteButton.addEventListener("click", () => {
                        console.log("削除", listOutputData)
                        child.deleteEvent(listOutputData.selects);
                    });
                }
            } else {
                this.element.deleteButton.classList.add("color2");
                this.element.deleteButton.style.pointerEvents = "none";
            }
        } else if (child.options.type == "noScroll") {
            this.element = createTag(t, "ul");
            creatorForUI.createListChildren(this.element, child.liStruct, child.withObject, searchTarget, child.options, flag);
        } else if (child.options.type == "row") {
            this.element = createTag(t, "ul", {class: "flexRow"});
            creatorForUI.createListChildren(this.element, child.liStruct, child.withObject, searchTarget, child.options, flag);
        } else {
            this.element = createTag(t, "ul", {class: "scrollable"});
            creatorForUI.createListChildren(this.element, child.liStruct, child.withObject, searchTarget, child.options, flag);
        }
        // managerForDOMs.set({o: "", g: creatorForUI.groupID, f: flag}, element, null);
    }
}