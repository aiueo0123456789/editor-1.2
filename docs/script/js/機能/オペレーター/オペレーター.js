import { createID, managerForDOMs } from "../../UI/制御.js";
import { isFunction } from "../../utility.js";

// undoとredoを実行
class CommandStack {
    constructor() {
        this.history = [];
        this.redoStack = [];
    }

    undo() {
        if (this.history.length > 0) {
            const commands = this.history.pop();
            for (const command of commands) {
                console.log("undo",command);
                command.undo();
            }
            this.redoStack.push(commands);
            managerForDOMs.update(this.history);
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const commands = this.redoStack.pop();
            for (const command of commands) {
                console.log("redo",command);
                if (isFunction(command.redo)) {
                    command.redo();
                } else {
                    command.execute();
                }
            }
            this.history.push(commands);
            managerForDOMs.update(this.history);
        }
    }
}

// コマンド関係の管理
export class Operator {
    constructor(app) {
        this.app = app;
        this.stack = new CommandStack();
        this.commands = [];
        this.errorLog = [];
    }

    appendCommand(command) {
        command.id = createID();
        this.commands.push(command);
    }

    appendErrorLog(log) {
        this.errorLog.push({text: log});
        managerForDOMs.update(this.errorLog);
    }

    execute() {
        const commandsToStack = [];
        while (this.commands.length != 0) {
            const command = this.commands.pop();
            const result = command.execute();
            if (result) {
                if (result.error) {
                    this.errorLog.push(result.error);
                }
            }
            commandsToStack.push(command);
        }
        this.stack.history.push(commandsToStack);
        this.stack.redoStack.length = 0; // 新しい操作をしたらRedoはリセット
        managerForDOMs.update(this.stack.history);
    }
}

// export const operator = new Operator();