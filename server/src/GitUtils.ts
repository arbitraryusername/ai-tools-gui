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
