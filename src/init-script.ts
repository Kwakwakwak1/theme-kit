/**
 * Applies the last theme this browser saw for this app (cached by ThemeSync
 * into localStorage under `storageKey`) before React hydrates or the browser
 * paints -- otherwise every reload flashes the compiled-in default for any
 * user with a different theme selected, since that data normally only
 * arrives after a client-side fetch resolves. Embed it as a synchronous,
 * blocking <script> that runs before first paint.
 *
 * Plain, dependency-free JS as a string, not a real function: a <script> tag
 * runs before any JS bundle loads, so it cannot import this or any ES module
 * -- it has to be self-contained source text. It therefore duplicates
 * tokens.ts's hex/radius validation and kebab-case conversion by hand; keep
 * them in sync if either changes. init-script.test.ts executes this exact
 * string rather than a parallel reimplementation, so a failing test means
 * what ships is broken, not just a copy of it.
 *
 * It iterates whatever keys are present in the cached object rather than a
 * known vocabulary, so an app's extension tokens apply pre-paint too with no
 * changes here.
 *
 * `storageKey` is per app (`kp-theme-tokens`, `fp-theme-tokens`, ...): theme
 * selection is per app, and in local development two apps can share the
 * localhost origin and therefore each other's localStorage.
 */
export function createThemeInitScript(storageKey: string): string {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(storageKey)) {
    throw new Error(`storageKey must be lowercase kebab-case, got "${storageKey}"`);
  }
  return `(function(){try{var raw=localStorage.getItem(${JSON.stringify(storageKey)});if(!raw)return;var t=JSON.parse(raw);if(!t||!t.light||!t.dark)return;var HEX=/^#[0-9a-fA-F]{6}$/;var RAD=/^\\d+(\\.\\d+)?(px|rem)$/;function kebab(k){return "--"+k.replace(/([A-Z])/g,"-$1").toLowerCase();}function rules(o){var out=[];for(var k in o){var v=o[k];if(typeof v==="string"&&HEX.test(v))out.push("  "+kebab(k)+": "+v+";");}return out.join("\\n");}var r=typeof t.radius==="string"&&RAD.test(t.radius)?"  --radius: "+t.radius+";\\n":"";var css=":root {\\n"+r+rules(t.light)+"\\n}\\n.dark {\\n"+rules(t.dark)+"\\n}";var el=document.createElement("style");el.id="custom-theme-override";el.textContent=css;document.head.appendChild(el);}catch(e){}})();`;
}
