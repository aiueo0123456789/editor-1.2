import { Application, appUpdate } from './editor/app/app.js';
import { updateLoad } from "./editor/utils/ui/util.js";

updateLoad("test", 100, "test");

export const app = new Application(document.getElementById("appContainer"));

app.init();

appUpdate(app);1