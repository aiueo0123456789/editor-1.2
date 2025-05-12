import { app } from "../../app.js";

export class CommandStack {
    constructor() {
        this.inputObject = {"o": app.operator};

        const update = () => {
        }

        this.struct = {
            inputObject: {h: "hierarchy"},
            DOM: [
                {type: "section", name: "test", children: [
                    {type: "list", options: {type: "min", select: true}, name: "コマンドスタック", withObject: {object: "o/stack/history"}, liStruct: [
                        {type: "div", "style": "flex", children: [
                            {type: "dbInput", withObject: {object: "constructor", parameter: "name"}},
                            {type: "dbInput", withObject: {object: "", parameter: "id"}},
                        ]},
                    ]},
                    {type: "list", options: {type: "min", select: true}, name: "エラーログ", withObject: {object: "o/errorLog"}, liStruct: [
                        {type: "div", "style": "flex", children: [
                            {type: "dbInput", withObject: {object: "", parameter: "text"}},
                        ]},
                    ]},
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };
    }
}
