import { promises as fs } from "fs";
import path from "path";

export interface PerfilConfig {
  nome: string;
  email: string;
  escritorio: string;
  notificacoes: {
    novoLead: boolean;
    novaMensagem: boolean;
    contrato: boolean;
  };
}

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

export async function readConfig(): Promise<PerfilConfig> {
  const raw = await fs.readFile(CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as PerfilConfig;
}

export async function writeConfig(config: PerfilConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
