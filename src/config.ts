import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export type CommitlensConfig = {
  groqApiKey?: string;
  repoRoots?: string[];
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
  const currentConfig = await readConfig(configDir);
  return writeConfig(
    {
      ...currentConfig,
      groqApiKey,
    },
    configDir,
  );
}

export async function addRepoRoot(repoRoot: string, configDir = defaultConfigDir()): Promise<string> {
  const currentConfig = await readConfig(configDir);
  const normalizedRoot = resolve(repoRoot);
  const repoRoots = new Set(currentConfig.repoRoots ?? []);
  repoRoots.add(normalizedRoot);

  return writeConfig(
    {
      ...currentConfig,
      repoRoots: [...repoRoots].sort(),
    },
    configDir,
  );
}

export async function getRepoRoots(configDir = defaultConfigDir()): Promise<string[]> {
  return (await readConfig(configDir)).repoRoots ?? [];
}

async function writeConfig(config: CommitlensConfig, configDir = defaultConfigDir()): Promise<string> {
  const configPath = getConfigPath(configDir);
  const nextConfig: CommitlensConfig = {
    ...config,
  };

  if (nextConfig.repoRoots?.length === 0) {
    delete nextConfig.repoRoots;
  }

  if (!nextConfig.groqApiKey) {
    delete nextConfig.groqApiKey;
  }

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  return configPath;
}

export async function removeRepoRoot(
  repoRoot: string,
  configDir = defaultConfigDir(),
): Promise<string> {
  const currentConfig = await readConfig(configDir);
  const normalizedRoot = resolve(repoRoot);

  return writeConfig(
    {
      ...currentConfig,
      repoRoots: (currentConfig.repoRoots ?? []).filter((root) => root !== normalizedRoot),
    },
    configDir,
  );
}

export async function clearRepoRoots(configDir = defaultConfigDir()): Promise<string> {
  const currentConfig = await readConfig(configDir);

  return writeConfig(
    {
      ...currentConfig,
      repoRoots: [],
    },
    configDir,
  );
}

export async function clearGroqApiKey(configDir = defaultConfigDir()): Promise<string> {
  const currentConfig = await readConfig(configDir);

  return writeConfig(
    {
      ...currentConfig,
      groqApiKey: undefined,
    },
    configDir,
  );
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
