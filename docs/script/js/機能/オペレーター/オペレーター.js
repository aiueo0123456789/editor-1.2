import { AnimationManager } from "./アニメーション/アニメーション";
import { CreateObjectCommand, ObjectManager } from "./オブジェクト/オブジェクト";

// undoとredoを実行
class CommandStack {
    constructor() {
        this.history = [];
        this.redoStack = [];
    }

    execute(command) {
        const result = command.execute();
        this.history.push(command);
        this.redoStack = []; // 新しい操作をしたらRedoはリセット
        return result;
    }

    undo() {
        if (this.history.length > 0) {
            const command = this.history.pop();
            command.undo();
            this.redoStack.push(command);
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const command = this.redoStack.pop();
            command.execute();
            this.history.push(command);
        }
    }
}

// コマンド関係の管理
class CommandManager {
    constructor() {
        this.animation = new AnimationManager();
        this.object = new ObjectManager();
        this.stack = new CommandStack();
        this.commands = [];
    }

    appendCommand(command) {
        this.commands.push(command);
    }

    execute() {
    }
}

const commandManager = new CommandManager();
commandManager.appendCommand(new CreateObjectCommand(manager, "mesh", { vertices: [], faces: [] }));