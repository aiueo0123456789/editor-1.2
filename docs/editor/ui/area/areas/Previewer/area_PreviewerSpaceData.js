export class PreviewerSpaceData {
    constructor() {
        this.displayRange = [1024, 720];
    }

    createModeSelectList() {
        const result = [];
        result.push("オブジェクト");
        result.push("test");

        return result;
    }
}