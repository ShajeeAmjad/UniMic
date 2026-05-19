import { execSync } from "child_process";

function escapeForSendKeys(text: string): string {
  return text
    .replace(/\{/g, "{{}")
    .replace(/\}/g, "{}}")
    .replace(/\+/g, "{+}")
    .replace(/\^/g, "{^}")
    .replace(/~/g, "{~}")
    .replace(/%/g, "{%}")
    .replace(/\(/g, "{(}")  
    .replace(/\)/g, "{)}")
    .replace(/\[/g, "{[}")
    .replace(/\]/g, "{]}")
    .replace(/\n/g, "{ENTER}")
    .replace(/\t/g, "{TAB}");
}

export function typeText(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const escaped = escapeForSendKeys(text).replace(/'/g, "''");

      execSync(
        `powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')"`,
        { timeout: 10000, stdio: "ignore", windowsHide: true }
      );
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}
