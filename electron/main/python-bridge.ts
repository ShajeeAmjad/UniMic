import { ChildProcess, spawn, execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import { app } from "electron";

export class PythonBridge {
  private process: ChildProcess | null = null;
  private port: number = 8765;
  private ready: boolean = false;

  private killProcessOnPort(port: number): void {
    try {
      if (os.platform() === "win32") {
        const psCmd = [
          `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue`,
          `ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
        ].join(" | ");

        execSync(
          `powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "${psCmd}"`,
          { stdio: "ignore", timeout: 5000, windowsHide: true }
        );
      }
    } catch {
      // No process on port, or access denied — safe to continue
    }
  }

  async start(): Promise<void> {
    this.killProcessOnPort(this.port);

    const pythonExe = this.findPython();
    const serverPath = this.findServerPath();

    if (!fs.existsSync(serverPath)) {
      console.error(`[PythonBridge] Server not found at ${serverPath}`);
      return;
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      const env = {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      };

      this.process = spawn(pythonExe, [serverPath], {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdoutBuffer = "";

      this.process.stdout?.on("data", (data: Buffer) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          console.log(`[Python] ${trimmed}`);
          if (!resolved && (trimmed.includes("Model loaded") || trimmed.includes("Ready to transcribe"))) {
            resolved = true;
            this.ready = true;
            resolve();
          }
        }
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        console.error(`[Python ERR] ${msg}`);
        if (!resolved && msg.includes("error while attempting to bind")) {
          resolved = true;
          this.process?.kill();
          this.process = null;
          reject(new Error(`Port ${this.port} is in use. Close the other UniMic instance first.`));
        }
      });

      this.process.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      this.process.on("exit", (code) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Python process exited with code ${code}`));
        }
        this.ready = false;
        this.process = null;
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error("Python backend startup timed out after 15s"));
        }
      }, 15000);
    });
  }

  async transcribe(audioBuffer: ArrayBuffer): Promise<string> {
    if (!this.ready) {
      throw new Error("Backend not ready");
    }

    const audioBytes = Buffer.from(audioBuffer);

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: this.port,
          path: "/transcribe",
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": audioBytes.length.toString(),
          },
          timeout: 30000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.text || "");
            } catch {
              reject(new Error(`Invalid JSON response: ${data}`));
            }
          });
        }
      );

      req.on("error", (err) => reject(err));
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Transcription request timed out"));
      });

      req.write(audioBytes);
      req.end();
    });
  }

  async stop(): Promise<void> {
    if (this.process && this.process.pid) {
      try {
        if (os.platform() === "win32") {
          execSync(`powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "Stop-Process -Id ${this.process.pid} -Force -ErrorAction SilentlyContinue"`, {
            stdio: "ignore",
            windowsHide: true,
            timeout: 3000,
          });
        } else {
          this.process.kill("SIGTERM");
        }
      } catch {
        try {
          this.process.kill();
        } catch {
          // Process already dead
        }
      }
      this.process = null;
      this.ready = false;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getPort(): number {
    return this.port;
  }

  private findPython(): string {
    const isDev = !app.isPackaged;

    if (isDev) {
      const venvPython = path.join(
        __dirname, "..", "..", "..", "env", "Scripts", "python.exe"
      );
      if (fs.existsSync(venvPython)) {
        return venvPython;
      }
      return "python";
    }

    const bundledPython = path.join(
      process.resourcesPath, "python-runtime", "Scripts", "python.exe"
    );
    if (fs.existsSync(bundledPython)) {
      return bundledPython;
    }

    const systemPython = path.join(
      process.resourcesPath, "python-runtime", "python.exe"
    );
    if (fs.existsSync(systemPython)) {
      return systemPython;
    }

    return "python";
  }

  private findServerPath(): string {
    const isDev = !app.isPackaged;

    if (isDev) {
      return path.join(__dirname, "..", "..", "..", "unimic", "server.py");
    }

    return path.join(process.resourcesPath, "unimic", "server.py");
  }
}
