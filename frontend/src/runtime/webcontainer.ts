import { WebContainer } from "@webcontainer/api";
import type { WebContainerProcess } from "@webcontainer/api";
import type { ProjectFile } from "../types/project";

let containerPromise: Promise<WebContainer> | null = null;
let devProcess: WebContainerProcess | null = null;
let unsubscribeServerReady: (() => void) | null = null;

/** Max time to wait for the dev server before giving up (so the UI never spins forever). */
const SERVER_READY_TIMEOUT_MS = 120_000;

export function getWebContainer() {
  if (!containerPromise) {
    containerPromise = WebContainer.boot();
  }

  return containerPromise;
}

/** True when the project needs a real dev server (has a package.json). */
export function projectNeedsRuntime(files: ProjectFile[]): boolean {
  return files.some((file) => file.path === "package.json");
}

export async function mountProject(files: ProjectFile[]) {
  const container = await getWebContainer();

  const tree: Record<string, any> = {};

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);

    let cursor = tree;

    parts.forEach((part, index) => {
      const last = index === parts.length - 1;

      if (last) {
        cursor[part] = {
          file: {
            contents: file.content,
          },
        };
      } else {
        cursor[part] ??= {
          directory: {},
        };

        cursor = cursor[part].directory;
      }
    });
  }

  await container.mount(tree);

  return container;
}

/**
 * Runs the generated project.
 *
 * Resolves with `true` when a dev server was started and the preview URL was
 * reported through `onServerReady`, or `false` when the project has no
 * package.json (plain HTML/CSS/JS) - in that case the caller should keep
 * using the in-browser srcDoc preview.
 *
 * It ALWAYS settles (ready, failed or timed out) so the UI never gets stuck
 * on a loading spinner.
 */
export async function runProject(
  files: ProjectFile[],
  onServerReady: (url: string) => void,
  onLog: (message: string) => void
): Promise<boolean> {
  if (!projectNeedsRuntime(files)) {
    onLog("No package.json found - showing static preview.");
    return false;
  }

  const container = await mountProject(files);

  // Stop the previous dev server (if any) so ports don't clash on re-run.
  if (devProcess) {
    try {
      devProcess.kill();
    } catch {
      // already stopped
    }
    devProcess = null;
  }

  return new Promise<boolean>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Timed out waiting for the dev server to start. Check the console logs."
          )
        )
      );
    }, SERVER_READY_TIMEOUT_MS);

    // Register ONE server-ready listener (remove the old one from earlier runs).
    if (unsubscribeServerReady) {
      unsubscribeServerReady();
      unsubscribeServerReady = null;
    }

    unsubscribeServerReady = container.on(
      "server-ready",
      (_port: number, url: string) => {
        finish(() => {
          onServerReady(url);
          resolve(true);
        });
      }
    );

    (async () => {
      try {
        onLog("$ npm install");

        const install = await container.spawn("npm", ["install"]);

        install.output
          .pipeTo(
            new WritableStream({
              write(data) {
                onLog(data.trimEnd());
              },
            })
          )
          .catch(() => undefined);

        const installCode = await install.exit;

        if (installCode !== 0) {
          throw new Error(`npm install failed with exit code ${installCode}`);
        }

        onLog("$ npm run dev -- --host 0.0.0.0");

        const dev = await container.spawn("npm", [
          "run",
          "dev",
          "--",
          "--host",
          "0.0.0.0",
        ]);

        devProcess = dev;

        dev.output
          .pipeTo(
            new WritableStream({
              write(data) {
                onLog(data.trimEnd());
              },
            })
          )
          .catch(() => undefined);

        // If the dev server exits before it was ready, surface that.
        dev.exit.then((code) => {
          finish(() =>
            reject(
              new Error(`Dev server exited early with code ${code}`)
            )
          );
        });
      } catch (error) {
        finish(() => reject(error));
      }
    })();
  });
}
