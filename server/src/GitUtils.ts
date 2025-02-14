import simpleGit, { SimpleGit } from 'simple-git';
import { GitCommit } from '@ai-tools-gui/shared/src/index.js';
import logger from './logger.js';

/**
 * Creates a new Git commit in the specified repository.
 * Formats the returned GitCommit object to align with `getLastCommits`.
 * @param commitMessage - The commit message.
 * @param repoAbsolutePath - The absolute path to the Git repository.
 * @returns A promise that resolves to the created GitCommit object.
 */
export async function createGitCommit(
  commitMessage: string,
  repoAbsolutePath: string
): Promise<GitCommit> {
  try {
    const git: SimpleGit = simpleGit(repoAbsolutePath);

    // Stage all changes
    await git.add('./*');

    // Commit changes
    const commitResult = await git.commit(commitMessage);
    const hash = commitResult.commit;

    // Retrieve the full diff for the commit
    const fullCommitOutput = await git.show([hash, '--patch', '--no-color']);
    const diff = preprocessDiff(fullCommitOutput); // Format diff for react-diff-view

    // Retrieve the commit timestamp
    const timestamp = new Date(
      (await git.show(['-s', '--format=%ct', hash])).trim() + '000'
    );

    logger.info(`Commit ${hash} created with message: "${commitMessage}"`);

    return {
      hash,
      message: commitMessage,
      diff,
      timestamp,
    };
  } catch (error) {
    logger.error(
      `Failed to create git commit in repository at "${repoAbsolutePath}". Reason: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

export async function revertLastCommit(
  repoAbsolutePath: string
): Promise<GitCommit> {
  try {
    const git: SimpleGit = simpleGit(repoAbsolutePath);

    const currentCommitHash = (await git.revparse(['HEAD'])).trim();
    const commitMessage = await git.show(['-s', '--format=%B', currentCommitHash]);
    const commitDiff = await git.show([currentCommitHash]);
    const timestamp = new Date((await git.show(['-s', '--format=%ct', currentCommitHash])).trim() + '000');

    // Revert the most recent commit
    await git.revert(currentCommitHash);

    logger.info(`Successfully reverted the most recent commit: ${currentCommitHash}`);
    
    return {
      hash: currentCommitHash,
      message: commitMessage.trim(),
      diff: commitDiff,
      timestamp,
    };
  } catch (error) {
    logger.error(
      `Failed to revert the most recent commit in repository at "${repoAbsolutePath}". Reason: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Fetches the last `count` commits from the target Git repository.
 * @param repoAbsolutePath - The absolute path to the Git repository.
 * @param count - The number of commits to retrieve.
 * @returns A promise that resolves to an array of the last `count` commits.
 */
export async function getLastCommits(
  repoAbsolutePath: string,
  count: number
): Promise<GitCommit[]> {
  try {
    const git: SimpleGit = simpleGit(repoAbsolutePath);

    // Fetch the specified number of commits
    const log = await git.log({ maxCount: count });

    // Map each commit to a GitCommit object with detailed diff and timestamp
    const commits: GitCommit[] = await Promise.all(
      log.all.map(async (entry) => {
        // Retrieve full diff for the commit
        const fullCommitOutput = await git.show([entry.hash, '--patch', '--no-color']);
        const diff = preprocessDiff(fullCommitOutput); // Format diff for react-diff-view
        const timestamp = new Date(entry.date);

        return {
          hash: entry.hash,
          message: entry.message,
          diff,
          timestamp,
        };
      })
    );

    logger.debug(`Fetched the last ${count} commits from the repository at "${repoAbsolutePath}"`);
    return commits;
  } catch (error) {
    logger.error(
      `Failed to fetch the last ${count} commits in repository at "${repoAbsolutePath}". Reason: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Preprocesses the git show output to format it correctly for react-diff-view.
 * Removes commit metadata and retains only the unified diff content.
 * @param fullCommitOutput - The raw git show output.
 * @returns The processed diff string.
 */
function preprocessDiff(fullCommitOutput: string): string {
  const lines = fullCommitOutput.split('\n');
  const startDiffIndex = lines.findIndex((line) => line.startsWith('diff --git'));
  return startDiffIndex >= 0 ? lines.slice(startDiffIndex).join('\n') : '';
}
