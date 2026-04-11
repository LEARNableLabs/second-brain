import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const ConfigSchema = z.object({
  outputDir: z.string()
    .refine(p => path.isAbsolute(p), { message: 'outputDir must be an absolute path' })
    .refine(p => !p.includes('..'), { message: 'outputDir must not contain ..' })
    .optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(): Promise<Config> {
  const dataDir = process.env.SECOND_BRAIN_DATA_DIR || path.join(os.homedir(), '.second-brain');
  const configPath = path.join(dataDir, 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(content);
    const validated = ConfigSchema.parse(parsed);
    return validated;
  } catch (error) {
    // On any error (file not found, invalid JSON, schema validation failure),
    // return empty defaults
    if (error instanceof z.ZodError) {
      // Log schema validation failures to stderr
      console.error('Config validation failed:', error.message);
    }
    return {};
  }
}

export function getOutputDir(config: Config): string {
  return config.outputDir || path.join(os.homedir(), 'Documents', 'Obsidian', 'second-brain');
}
