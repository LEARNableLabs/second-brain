import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createModuleLogger } from '@second-brain/shared/logger';

const logger = createModuleLogger('config:reader');

export const ConfigSchema = z.object({
  outputDir: z.string()
    .refine(p => path.isAbsolute(p), { message: 'outputDir must be an absolute path' })
    .refine(p => !p.includes('..'), { message: 'outputDir must not contain ..' })
    .optional(),
  llm: z.object({
    provider: z.enum(['claude', 'claude-code', 'ollama']).default('claude-code'),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    ollamaUrl: z.string().url().optional(),
  }).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(): Promise<Config> {
  const dataDir = process.env.SECOND_BRAIN_DATA_DIR || path.join(os.homedir(), '.second-brain');
  const configPath = path.join(dataDir, 'config.json');
  logger.info({ configPath }, 'loading config');

  try {
    const content = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(content);
    const validated = ConfigSchema.parse(parsed);
    logger.info('config loaded successfully');
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ err: error }, 'config validation failed');
    } else {
      logger.info('no config file found, using defaults');
    }
    return {};
  }
}

export function getOutputDir(config: Config): string {
  const dir = config.outputDir || path.join(os.homedir(), 'Documents', 'Obsidian', 'second-brain');
  logger.debug({ outputDir: dir }, 'resolved output directory');
  return dir;
}
