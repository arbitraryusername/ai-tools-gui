This is an AI-powered app for rapidily iterating throught code changes in a local git repo. This app enables you to quicky add code from several files or folders (or the entire app!) to your prompt. It automatically applies the AI generated code changes to your local repo and commits them. 

Workflow:
- Specify the path to a local git repo then click "Load Repo". The UI then shows the tracked files and folders in a collapsible, selectable tree view. It also shows the most recent 10 commit messages along with the diffs for each file in that commit.
- Select the relevant files you wish to include with the prompt by checking indivual files or folders.
- Type your prompt then click "Submit". For example, you can type a short prompt about adding a new endpoint and creating the client and server code. Or maybe you want to refactor some code to be more performant or better organized. Or you might want to describe a bug that needs to be fixed.
- After the response is received from OpenAI, the code changes are automatically applied to the files, including updating, adding, and/or deleting files.
- The UI refreshes with the latest files and the most recent commit.
- If you do not like the last change, then simply click the revert button to undo the last set of changes. 

Quick Setup Steps:
- add a .env file at the root and add key OPENAI_API_KEY
- install dependencies for client and server -> 'pnpm run build' (in root folder)
- run both client and server for local developement -> 'pnpm run dev' (in root folder)

The Source Code:
Full stack TypeScript, React client, Express server, OpenAI's o1-mini model
