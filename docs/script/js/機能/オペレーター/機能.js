export class WeightPaint {
    constructor(target, ) {
        this.data = data;
    }

    execute() {

    }

    undo() {
        if (this.history.length > 0) {
            const command = this.history.pop();
            command.undo();
            this.redoStack.push(command);
        }
    }
}