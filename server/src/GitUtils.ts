import simpleGit, { SimpleGit } from 'simple-git';
import { GitCommit } from '@ai-tools-gui/shared';

export async function createGitCommit(
  commitMessage: string,
  repoAbsolutePath: string,
): Promise<GitCommit> {
  try {
    const git: SimpleGit = simpleGit(repoAbsolutePath);

    await git.add('./*');

    const commitResult = await git.commit(commitMessage);
    const commitHash = commitResult.commit;
    const commitDiff = await git.show([commitHash]);
    const timestamp = new Date((await git.show(['-s', '--format=%ct', commitHash])).trim() + '000');

    console.debug(`Commit ${commitHash} created with message: "${commitMessage}"`);
    
    return {
      hash: commitHash,
      message: commitMessage,
      diff: commitDiff,
      timestamp
    };
  } catch (error) {
    throw new Error(`Failed to create git commit in repository at "${repoAbsolutePath}". Reason: ${error instanceof Error ? error.message : String(error)}`);
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

    await git.reset(['--hard', 'HEAD~1']);

    console.log(`Successfully reverted the most recent commit: ${currentCommitHash}`);
    
    return {
      hash: currentCommitHash,
      message: commitMessage.trim(),
      diff: commitDiff,
      timestamp
    };
  } catch (error) {
    throw new Error(`Failed to revert the most recent commit in repository at "${repoAbsolutePath}". Reason: ${error instanceof Error ? error.message : String(error)}`);
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
  count: number,
): Promise<GitCommit[]> {
  try {
    const git: SimpleGit = simpleGit(repoAbsolutePath);

    // Fetch the specified number of commits
    const log = await git.log({ maxCount: count });

    // Map each commit to a GitCommit object with detailed diff and timestamp
    const commits: GitCommit[] = await Promise.all(
      log.all.map(async (entry) => {
        const commitDiff = await git.show([entry.hash]);
        const timestamp = new Date(entry.date);
        return {
          hash: entry.hash,
          message: entry.message,
          diff: commitDiff,
          timestamp,
        };
      })
    );

    console.log(`Fetched the last ${count} commits from the repository at "${repoAbsolutePath}"`);
    return commits;
  } catch (error) {
    throw new Error(
      `Failed to fetch the last ${count} commits in repository at "${repoAbsolutePath}". Reason: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
