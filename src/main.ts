import { Game } from "./game";

const mount = document.getElementById("app");
if (!mount) {
  throw new Error("#app mount point not found");
}

function showError(msg: string): void {
  const el = document.createElement("pre");
  el.style.cssText =
    "position:fixed;top:12px;left:12px;right:12px;color:#ff6b6b;background:rgba(0,0,0,.7);padding:12px;border:1px solid #ff6b6b;font:12px/1.4 monospace;white-space:pre-wrap;z-index:9999";
  el.textContent = msg;
  document.body.appendChild(el);
}

window.addEventListener("error", (e) => {
  // Browsers report cross-origin script errors as opaque "Script error." with
  // empty filename and lineno 0. No actionable info — suppress.
  if (e.message === "Script error." && !e.filename && !e.lineno) return;
  showError(`Runtime error: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}`);
});
window.addEventListener("unhandledrejection", (e) => {
  const r = e.reason;
  const msg = r instanceof Error ? `${r.message}\n${r.stack ?? ""}` : String(r);
  showError(`Unhandled promise rejection:\n${msg}`);
});

const game = new Game(mount);
game.init().catch((err) => {
  console.error(err);
  showError(`Game init failed: ${err instanceof Error ? err.message + "\n" + (err.stack ?? "") : String(err)}`);
});
