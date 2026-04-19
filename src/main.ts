import { Game } from "./game";

const mount = document.getElementById("app");
if (!mount) {
  throw new Error("#app mount point not found");
}

const game = new Game(mount);
game.init();
