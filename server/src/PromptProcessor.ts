import { getFilePathDelimiter } from './AppConfig.js';
import { combineFilesIntoString } from './SourceCodeHelper.js';
import { generateCode } from './OpenAIAPI.js';
import { applyChangesToSourceCode } from './SourceCodeHelper.js';
import { executeCommand } from './ShellUtils.js';
import { createGitCommit } from './GitUtils.js';
import { ProcessPromptOptions, ProcessPromptResult } from 'types.js';
import { GitCommit } from '@ai-tools-gui/shared';
import { devServerManager } from './DevServerManager.js';

// Constants
const BUILD_COMMAND = "pnpm build" as const;
const DEV_COMMAND = "pnpm dev" as const;
const INSTALL_COMMAND = "pnpm install" as const;

class PromptProcessor {
  private readonly delimiter: string;

  constructor() {
    this.delimiter = getFilePathDelimiter();
  }

  async process(
    rawPrompt: string,
    sourceAbsolutePath: string,
    options: ProcessPromptOptions = {}
  ): Promise<ProcessPromptResult> {
    const commits: GitCommit[] = [];
    const { maxErrorResolutionAttempts = 1 } = options;
  
    console.debug("DEBUG starting to process userRawPrompt:", rawPrompt);
  
    try {
      const fullPrompt = await this.generateFullPrompt(rawPrompt, sourceAbsolutePath);
      const generatedCode = await generateCode(fullPrompt);
  
      await applyChangesToSourceCode(generatedCode, sourceAbsolutePath);
  
      if (this.containsPackageJsonChanges(generatedCode)) {
        console.log("package.json updates found");
        // await devServerManager.stopDevServer();
        // await executeCommand(INSTALL_COMMAND, sourceAbsolutePath);
      }
  
      const commitMessage = `PROMPT: ${rawPrompt}`;
      const initialCommit = await createGitCommit(
        rawPrompt,
        sourceAbsolutePath, 
      );
      commits.push(initialCommit);

      // await executeCommand(BUILD_COMMAND, sourceAbsolutePath);
      // build command didn't throw error, so start the dev server(s)
      // await devServerManager.startDevServer(sourceAbsolutePath);

      // TODO: use auto build error resolution code
  
      // const buildResolutionCommits = await this.handleBuildProcess(
      //   userRawPrompt,
      //   sourceAbsolutePath,
      //   maxErrorResolutionAttempts
      // );
  
      // commits.push(...buildResolutionCommits);
  
      return { commits };
    } catch (error) {
      console.error("Error processing prompt:", error);
      return {
        commits,
        error: `Failed to process prompt: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async generateFullPrompt(userRawPrompt: string, sourceAbsolutePath: string): Promise<string> {
    const promptInstructions = `
Source code for my project is given below between 'SOURCE_START' and 'SOURCE_END'.
Your specific instructions for exactly how to add, update, or delete code from my project's source code is between 'TASK_START' and 'TASK_END'. 
In the source code, lines starting with ${this.delimiter} are paths to files, followed by that file's content on the next line.
Existing project dependencies are provided. Reuse existing dependencies when applicable.
Add or remove dependencies to the package.json when needed, and provide the entire file in the response with only the needed changes.
Always include or remove the corresponding @types package if relevant to the added or removed package.
Your output should only contain ${this.delimiter}put_file_path_here followed by the updated contents of that file.
Do not give other output except for that, meaning no explanation or markup.
NEVER put comments in JSON files. Do not add single line comments in the code. Do not remove existing comments.
If a file should be removed entirely, include ${this.delimiter}file_path line with a blank line following.`;

    const projectContentString = await combineFilesIntoString(sourceAbsolutePath);

    return `${promptInstructions}\nTASK_START\n${userRawPrompt}]\nTASK_END\nSOURCE_START\n${projectContentString}\nSOURCE_END`;
  }

  private async handleBuildProcess(
    userRawPrompt: string,
    sourceAbsolutePath: string,
    maxAttempts: number
  ): Promise<GitCommit[]> {
    let attempts = 0;
    const commits: GitCommit[] = [];

    while (attempts < maxAttempts) {
      try {
        await executeCommand(BUILD_COMMAND, sourceAbsolutePath);
        return []; // no new commits to make
      } catch (error) {
        attempts++;
        console.error(`Build attempt ${attempts} failed:`, error);

        if (attempts < maxAttempts) {
          await this.attemptBuildErrorResolution(
            error instanceof Error ? error.message : String(error),
            sourceAbsolutePath
          );
          
          const errorResolutionCommit = await createGitCommit(
            `Attempt ${attempts} to auto resolve build error from previous commit: ${userRawPrompt}`,
            sourceAbsolutePath
          );
          commits.push(errorResolutionCommit);
        } else {
          throw new Error(`Build failed after ${maxAttempts} attempts`);
        }
      }
    }

    return commits;
  }

  private async attemptBuildErrorResolution(buildCommandOutput: string, sourceAbsolutePath: string): Promise<void> {
    const errorResolutionPrompt = this.generateErrorResolutionPrompt(buildCommandOutput, sourceAbsolutePath);
    
    console.log("DEBUG errorResolutionPrompt:", errorResolutionPrompt);

    const generatedCodeToFixBuildErrors = await generateCode(errorResolutionPrompt);
    await applyChangesToSourceCode(generatedCodeToFixBuildErrors, sourceAbsolutePath);
  }

  private generateErrorResolutionPrompt(buildCommandOutput: string, sourceAbsolutePath: string): string {
    const errorResolutionPromptInstructions = `
After running command "${BUILD_COMMAND}" I get the error between 'OUTPUT_START' and 'OUTPUT_END' below:
OUTPUT_START\n${buildCommandOutput}\nOUTPUT_END
Update my project source code to fix these errors.
My project source code is given below between 'SOURCE_START' and 'SOURCE_END'.
In the source code, lines starting with ${this.delimiter} are paths to files, followed by that file's content on the next line.
Your output should only contain ${this.delimiter}put_file_path_here followed by the updated contents of that file.
Do not give other output except for that, meaning no explanation or markup. Do not add or remove any comments in the code.`;

    const projectContentString = combineFilesIntoString(sourceAbsolutePath);

    return `${errorResolutionPromptInstructions}\nSOURCE_START\n${projectContentString}\nSOURCE_END`;
  }

  private containsPackageJsonChanges(input: string): boolean {
    const lines = input.split(/\r?\n/);
    return lines.some(line => line.trim() === `${this.delimiter}package.json`);
  }
}

export const promptProcessor = new PromptProcessor();
export type { ProcessPromptOptions };