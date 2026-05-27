import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type CommitlensConfig = {
  groqApiKey?: string;
};

export function getConfigPath(configDir = defaultConfigDir()): string {
  return join(configDir, "config.json");
}

export async function readConfig(configDir = defaultConfigDir()): Promise<CommitlensConfig> {
  try {
    const contents = await readFile(getConfigPath(configDir), "utf8");
    return JSON.parse(contents) as CommitlensConfig;
  } catch (error) {
    if (isMissingFileError(error)) {
      return {};
    }

    throw error;
  }
}

export async function saveGroqApiKey(
  groqApiKey: string,
  configDir = defaultConfigDir(),
): Promise<string> {
  const configPath = getConfigPath(configDir);
  const currentConfig = await readConfig(configDir);
  const nextConfig: CommitlensConfig = {
    ...currentConfig,
    groqApiKey,
  };

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  return configPath;
}

export async function resolveGroqApiKey(
  env: NodeJS.ProcessEnv = process.env,
  configDir = defaultConfigDir(),
): Promise<string | undefined> {
  return env.GROQ_API_KEY ?? (await readConfig(configDir)).groqApiKey;
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return "*".repeat(secret.length);
  }

  return `${secret.slice(0, 4)}${"*".repeat(Math.max(secret.length - 8, 4))}${secret.slice(-4)}`;
}

function defaultConfigDir(): string {
  return process.env.COMMITLENS_CONFIG_DIR ?? join(homedir(), ".commitlens");
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
