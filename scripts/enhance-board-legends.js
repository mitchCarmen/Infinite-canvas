#!/usr/bin/env node
/**
 * Enhance Git/GitHub Best Practices board with per-diagram legends,
 * expanded narration, ELI5 sections, and reference notes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// The server stores boards at server/boards/boards/<id>.json
// Also update the examples copy
const BOARD_ID = '155848bb-0f82-47ee-acc4-5fc37ffc3591';
const RUNTIME_PATH = path.join(__dirname, '..', 'server', 'boards', 'boards', `${BOARD_ID}.json`);
const EXAMPLES_PATH = path.join(__dirname, '..', 'boards', 'examples', 'git-github-best-practices.json');
const BOARD_PATH = fs.existsSync(RUNTIME_PATH) ? RUNTIME_PATH : EXAMPLES_PATH;

function uuid() {
  return crypto.randomUUID();
}

// Sticky note style presets
const STYLES = {
  narration: { backgroundColor: '#fff3cd', borderColor: '#ffc107', color: '#333' },
  eli5: { backgroundColor: '#e3f2fd', borderColor: '#1976d2', color: '#333' },
  legend: { backgroundColor: '#f5f5f5', borderColor: '#9e9e9e', color: '#333' },
  mistakes: { backgroundColor: '#ffebee', borderColor: '#c62828', color: '#333' },
  tips: { backgroundColor: '#e8f5e9', borderColor: '#2e7d32', color: '#333' },
  commands: { backgroundColor: '#e8eaf6', borderColor: '#283593', color: '#333' },
  whenToUse: { backgroundColor: '#fff8e1', borderColor: '#ff8f00', color: '#333' },
};

// Approximate height based on text length
function calcHeight(text, width = 380) {
  const charsPerLine = Math.floor(width / 7.5);
  const lines = text.split('\n').reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);
  return Math.max(140, Math.min(500, lines * 22 + 40));
}

function makeSticky(label, x, y, style, width = 380) {
  return {
    id: uuid(),
    type: 'sticky',
    label,
    x,
    y,
    width,
    height: calcHeight(label, width),
    zIndex: 3,
    style,
  };
}

// ─── DIAGRAM CONTENT ──────────────────────────────────────────────────────────

const DIAGRAMS = [
  // ─── 1. Basic Commit Flow ───────────────────────────────────────────────────
  {
    num: 1,
    stickyId: 'bf89f9d1-19d3-443c-974f-5a786ee23513',
    rightEdge: 890,
    titleY: 300,

    expandedNarration:
      'Files move through three states: modified, staged, and committed. ' +
      'The working tree holds your actual files on disk — every edit you make lives here first. ' +
      'The staging area (also called the index) is a snapshot you are assembling for your next commit. ' +
      'You choose exactly which changes to include with "git add". ' +
      'HEAD points to the last commit on your current branch. ' +
      'When you run "git commit", the staged snapshot becomes a permanent record in the repository. ' +
      '"git restore" can pull files back from the staging area or from HEAD, discarding changes. ' +
      'This three-stage pipeline is the mental model that underpins all of Git — every other operation builds on it.',

    eli5:
      'ELI5: Think of it like packing a suitcase for a trip. ' +
      'Your closet (working tree) has all your clothes. ' +
      'You pick outfits and lay them on the bed (staging area) to decide what to bring. ' +
      'When you zip the suitcase shut (commit), those choices are locked in. ' +
      'You can always pull something back out of the suitcase if you change your mind (restore).',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Blue rectangle = Working Tree (your files on disk)\n' +
      'Yellow rectangle = Staging Area / Index (snapshot being prepared)\n' +
      'Green circle = Local Repository (committed history, HEAD)\n' +
      '---\n' +
      'Arrows labeled with git commands show how files move between states.\n' +
      '"git add" moves changes from working tree to staging.\n' +
      '"git commit" moves staged changes into the repository.\n' +
      '"git restore" pulls changes back from staging or HEAD.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Committing without reviewing staged changes — always run "git diff --staged" first.\n' +
      'Using "git add ." blindly — this stages everything, including files you did not intend to commit.\n' +
      'Confusing "git restore" with "git reset" — restore affects files, reset affects commits/HEAD.\n' +
      'Forgetting that unstaged changes are NOT in the commit — only what you "git add" gets committed.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "git add -p" to stage individual hunks — review each change interactively.\n' +
      'Use "git status" constantly — it tells you exactly what is staged, modified, and untracked.\n' +
      'Set up a .gitignore early to keep build artifacts and secrets out of your repo.\n' +
      'Use "git stash" if you need to temporarily shelve uncommitted work.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git add <file>         Stage a specific file\n' +
      'git add -p             Stage changes interactively (hunk by hunk)\n' +
      'git commit -m "msg"    Commit staged changes with a message\n' +
      'git restore <file>     Discard working tree changes\n' +
      'git restore --staged   Unstage a file (keep working tree changes)\n' +
      'git diff               Show unstaged changes\n' +
      'git diff --staged      Show staged changes\n' +
      'git status             Show working tree and staging status',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'This is the fundamental workflow you use every single time you write code and want to save it to Git. ' +
      'Every commit you ever make follows this exact path: edit files, stage changes, commit. ' +
      'If you are brand new to Git, master this diagram before anything else — it is the foundation for everything.',
  },

  // ─── 2. Branch Create & Switch ──────────────────────────────────────────────
  {
    num: 2,
    stickyId: '9434a2b9-01d8-4007-a24c-d963b5f7302e',
    rightEdge: 3100,
    titleY: 300,

    expandedNarration:
      'A branch in Git is just a lightweight pointer to a commit — creating one does not copy any code. ' +
      'When you run "git branch feature", Git creates a new reference pointing to the current commit. ' +
      'HEAD is a special pointer that tells Git which branch you are currently on. ' +
      'When you run "git switch feature", HEAD moves to point at the feature branch. ' +
      'New commits advance whichever branch HEAD points to. ' +
      'Branches diverge when both branches receive new commits independently. ' +
      'This cheap branching model is what makes Git so powerful for parallel development.',

    eli5:
      'ELI5: Imagine a choose-your-own-adventure book. ' +
      'Each branch is a different storyline starting from the same page. ' +
      'Creating a branch is like putting a bookmark at the current page (it costs nothing). ' +
      'Switching branches is like flipping to a different bookmark. ' +
      'Each storyline can grow independently until you decide to merge them back together.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Commit on the main branch\n' +
      'Blue circle = Commit on a feature branch\n' +
      'Purple rectangle = Branch label (pointer to a commit)\n' +
      'Red text (HEAD) = The currently checked-out branch pointer\n' +
      '---\n' +
      'Arrows between circles show parent-child commit relationships.\n' +
      'The branch label sits at the commit it currently points to.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Creating a branch but forgetting to switch to it — "git branch X" does not check it out.\n' +
      'Working on main directly instead of a feature branch — always branch first.\n' +
      'Confusing "git branch -d" (safe delete) with "git branch -D" (force delete).\n' +
      'Not pulling latest main before creating a branch — your branch starts from stale code.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "git switch -c feature" to create and switch in one step.\n' +
      'Name branches descriptively: feature/add-login, fix/null-pointer, docs/api-guide.\n' +
      'Use "git log --oneline --graph --all" to visualize all branches.\n' +
      'Delete merged branches promptly to keep your branch list clean.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git branch                  List local branches\n' +
      'git branch <name>           Create a new branch\n' +
      'git switch <name>           Switch to a branch\n' +
      'git switch -c <name>        Create and switch in one step\n' +
      'git branch -d <name>        Delete a merged branch\n' +
      'git branch -D <name>        Force-delete a branch\n' +
      'git log --oneline --graph   Visualize branch history',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Create a new branch every time you start working on something — a feature, a bug fix, an experiment. ' +
      'Never commit directly to main. Branches are free and give you a safe sandbox. ' +
      'Use this pattern even when working solo — it builds habits that scale to teams.',
  },

  // ─── 3. Fast-Forward Merge ──────────────────────────────────────────────────
  {
    num: 3,
    stickyId: '56b23897-2104-4582-b6f6-e0d775abc119',
    rightEdge: 4990,
    titleY: 300,

    expandedNarration:
      'When the target branch (e.g., main) has not received any new commits since you branched off, ' +
      'Git can perform a fast-forward merge. Instead of creating a merge commit, Git simply moves the ' +
      'branch pointer forward to match the feature branch. The result is a perfectly linear history — ' +
      'it looks as if all the work happened directly on main. No merge commit is created because there ' +
      'is no divergence to reconcile. This is the simplest and cleanest type of merge.',

    eli5:
      'ELI5: Imagine you are standing in line and the person in front of you leaves. ' +
      'You just step forward — no merging or negotiation needed. ' +
      'That is a fast-forward: main was standing still, so it just steps forward to where your branch is.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Commit on main (before merge)\n' +
      'Blue circle = Commit on feature branch\n' +
      'Purple rectangle = Branch label\n' +
      '---\n' +
      'After the merge, the main pointer advances to the latest commit.\n' +
      'No merge commit is created — the history stays linear.\n' +
      'Arrows show the commit chain (parent to child).',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Assuming all merges are fast-forward — they only work when main has not diverged.\n' +
      'Forgetting to pull before merging — remote changes on main prevent fast-forward.\n' +
      'Using "--no-ff" unintentionally, which forces a merge commit even when fast-forward is possible.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "git merge --ff-only" to ensure only fast-forward merges happen — it fails if not possible.\n' +
      'Rebase your feature branch onto latest main before merging to enable fast-forward.\n' +
      'Some teams enforce fast-forward-only merges for clean linear history.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git merge <branch>          Merge (fast-forward if possible)\n' +
      'git merge --ff-only <br>    Only merge if fast-forward is possible\n' +
      'git merge --no-ff <br>      Force a merge commit even if FF possible\n' +
      'git log --oneline --graph   Verify linear history after merge',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Fast-forward merges happen naturally when you are the only one working on main ' +
      '(solo projects, or you just pulled the latest). ' +
      'They are ideal when you want clean, linear history without merge commits. ' +
      'If your team prefers merge commits for traceability, use "--no-ff" instead.',
  },

  // ─── 4. Three-Way Merge ─────────────────────────────────────────────────────
  {
    num: 4,
    stickyId: 'ed9eeb10-4f5b-4943-9391-405c7735430d',
    rightEdge: 7140,
    titleY: 300,

    expandedNarration:
      'When both branches have received new commits since they diverged, Git cannot simply move a pointer forward. ' +
      'Instead, it performs a three-way merge using three reference points: the common ancestor commit, ' +
      'the tip of the current branch, and the tip of the branch being merged. ' +
      'Git compares both branch tips against the common ancestor to determine what changed on each side. ' +
      'The result is a new merge commit with two parents — one from each branch. ' +
      'This creates the classic diamond shape in the commit history where branches diverge and reconverge. ' +
      'If both branches changed the same lines, Git raises a merge conflict for you to resolve manually.',

    eli5:
      'ELI5: Two friends are editing a shared Google Doc offline. ' +
      'Each makes different changes to their own copy. ' +
      'When they reconnect, the system compares both versions against the original ' +
      'to figure out what each person changed. It combines the changes into one final version. ' +
      'That final version is the merge commit — it has two parents (one from each friend).',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Commit on main branch\n' +
      'Blue circle = Commit on feature branch\n' +
      'Red circle = Merge commit (has two parent commits)\n' +
      'Purple rectangle = Branch label\n' +
      '---\n' +
      'The diamond shape shows where branches diverge and reconverge.\n' +
      'Arrows point from child to parent commit.\n' +
      'The merge commit ties both histories together.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Panicking when you see a merge commit — it is normal and expected when branches diverge.\n' +
      'Resolving merge conflicts by keeping only one side — read both changes carefully.\n' +
      'Not testing after a merge — the combination of changes can introduce bugs even without conflicts.\n' +
      'Merging a stale feature branch — pull and update first to minimize conflicts.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "git log --graph --oneline" to see the diamond pattern after merging.\n' +
      'Merge frequently (small merges) instead of letting branches diverge for weeks.\n' +
      'Use "git merge --abort" if a merge goes wrong — it restores your branch to the pre-merge state.\n' +
      'Consider rebasing instead if you prefer linear history (see Diagram 12).',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git merge <branch>        Merge branch into current branch\n' +
      'git merge --abort         Abort an in-progress merge\n' +
      'git log --graph --all     Visualize merge history\n' +
      'git merge-base A B        Find the common ancestor of two branches',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Three-way merges happen automatically whenever both branches have diverged. ' +
      'This is the standard merge pattern in team environments where multiple people commit to main. ' +
      'Use merge (not rebase) for shared branches where you need to preserve the true branching history.',
  },

  // ─── 5. Full Local Feature Lifecycle ────────────────────────────────────────
  {
    num: 5,
    stickyId: '5bd040d6-603a-42ce-9121-8cdffd0b9508',
    rightEdge: 2050,
    titleY: 1900,

    expandedNarration:
      'The complete lifecycle of a feature branch: create it from main, develop your feature in isolated commits, ' +
      'merge it back to main when complete, then delete the branch to clean up. ' +
      'Each commit on the feature branch is isolated — main does not see these changes until you merge. ' +
      'After merging, the feature branch pointer is no longer needed because its commits are now reachable from main. ' +
      'Deleting the branch only removes the pointer, not the commits. ' +
      'This cycle — branch, develop, merge, delete — is the bread and butter of Git workflow and repeats for every feature.',

    eli5:
      'ELI5: Building a LEGO creation on a side table (feature branch). ' +
      'Your main display shelf (main branch) stays untouched while you experiment. ' +
      'When your creation is done, you move it to the display shelf (merge). ' +
      'Then you clean up the side table (delete branch) — the creation is safe on the shelf.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle (M1, M2, M3) = Commits on main\n' +
      'Blue circle (F1, F2, F3) = Commits on the feature branch\n' +
      'Red circle = Merge commit (integrates feature into main)\n' +
      'Green label (main) = Main branch pointer\n' +
      'Purple label (feature) = Feature branch pointer\n' +
      '---\n' +
      'Arrows show commit lineage.\n' +
      'After merge, the feature label is deleted but commits remain.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Forgetting to delete the feature branch after merging — branches pile up and cause confusion.\n' +
      'Making commits directly on main instead of a feature branch.\n' +
      'Merging before the feature is complete — partial features break main.\n' +
      'Not syncing main before starting a new feature — you inherit stale code.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "git branch -d feature" after merging — the -d flag is safe and only deletes if fully merged.\n' +
      'Keep feature branches short-lived (days, not weeks) to minimize drift from main.\n' +
      'Commit often with meaningful messages — it makes code review and debugging easier.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git switch -c feature/x    Create and switch to feature branch\n' +
      'git commit -m "msg"        Commit on feature branch\n' +
      'git switch main             Switch back to main\n' +
      'git merge feature/x         Merge feature into main\n' +
      'git branch -d feature/x     Delete the merged branch',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Every time you start working on a discrete piece of functionality. ' +
      'Whether it is a new feature, a bug fix, a refactor, or an experiment — use this cycle. ' +
      'This is the default workflow for solo and team development alike.',
  },

  // ─── 6. Multiple Features in Parallel ───────────────────────────────────────
  {
    num: 6,
    stickyId: '907dd999-422a-4ef8-bd30-aad6f9aba43c',
    rightEdge: 4655,
    titleY: 1900,

    expandedNarration:
      'Branch isolation means features do not interfere with each other. ' +
      'Each feature branch sees only main plus its own changes — Feature A cannot see Feature B\'s work and vice versa. ' +
      'Merging happens sequentially: one feature integrates first, then the next merges into the updated main. ' +
      'The second merge may require conflict resolution if both features touched the same files. ' +
      'This isolation is what makes Git branches so powerful — multiple developers (or one developer wearing multiple hats) ' +
      'can work on independent features without stepping on each other\'s toes.',

    eli5:
      'ELI5: Two artists painting on separate canvases in the same studio. ' +
      'Each can work without worrying about the other spilling paint on their canvas. ' +
      'When both are done, you hang them on the gallery wall (main) one at a time. ' +
      'If both artists used the same frame size, you might need to rearrange (resolve conflicts).',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Commit on main\n' +
      'Blue circle = Commit on Feature A\n' +
      'Orange circle = Commit on Feature B\n' +
      'Red circle = Merge commit\n' +
      'Green label = main branch\n' +
      'Blue label = Feature A branch\n' +
      'Orange label = Feature B branch\n' +
      '---\n' +
      'Arrows show commit lineage.\n' +
      'Features merge sequentially into main.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Merging features that depend on each other in the wrong order.\n' +
      'Working on too many parallel branches at once — context switching has a real cost.\n' +
      'Not updating your feature branch with the latest main after another feature merges.\n' +
      'Creating a feature branch from another feature branch instead of from main.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'After merging Feature A, rebase Feature B onto updated main before merging B.\n' +
      'Keep features small and independent so they rarely conflict.\n' +
      'Use "git log --all --graph --oneline" to track all parallel branches visually.\n' +
      'Communicate with your team about which files each feature touches.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git switch -c feature-a      Start Feature A from main\n' +
      'git switch -c feature-b      Start Feature B from main\n' +
      'git switch main && git merge feature-a   Merge A first\n' +
      'git switch feature-b && git rebase main  Update B\n' +
      'git switch main && git merge feature-b   Then merge B',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Whenever you have multiple independent workstreams happening simultaneously. ' +
      'Common in team settings but also useful for solo developers juggling a feature and a bug fix. ' +
      'The key requirement: each feature should be as independent as possible to avoid conflicts.',
  },

  // ─── 7. Clone → Push → Pull Cycle ──────────────────────────────────────────
  {
    num: 7,
    stickyId: 'a830a214-1111-42e6-907d-4a9092e5e068',
    rightEdge: 1090,
    titleY: 3500,

    expandedNarration:
      'Remote and local repositories are independent copies of the same project that synchronize through push and pull. ' +
      '"git clone" creates the initial local copy by downloading the full repository history. ' +
      '"git push" sends your local commits upstream to the remote (typically called "origin"). ' +
      '"git pull" fetches new commits from the remote and merges them into your local branch. ' +
      'Under the hood, "git pull" is actually "git fetch" + "git merge". ' +
      'Your local "main" and "origin/main" are separate references — they only align after push or pull. ' +
      'This two-way sync model is the foundation of all Git collaboration.',

    eli5:
      'ELI5: You and your friend each have a copy of the same notebook. ' +
      'When you write something new, you photocopy those pages and mail them (push). ' +
      'When your friend writes something, they mail you copies and you paste them in (pull). ' +
      'Clone is like photocopying the entire notebook for the first time.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Blue circle (R1, R2, R3) = Commits on the remote repository\n' +
      'Green circle (L1, L2, L3, L4) = Commits on the local repository\n' +
      '---\n' +
      'Arrows between remote and local show sync operations.\n' +
      '"git push" arrows go from local to remote.\n' +
      '"git pull" arrows go from remote to local.\n' +
      '"git clone" creates the initial local copy.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Pushing without pulling first — this causes rejected pushes if the remote has new commits.\n' +
      'Confusing "git fetch" with "git pull" — fetch downloads but does not merge.\n' +
      'Force-pushing to shared branches — this rewrites history others depend on.\n' +
      'Not setting an upstream branch — "git push -u origin main" sets it once.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "git pull --rebase" to keep a linear history when pulling remote changes.\n' +
      'Use "git fetch" + "git log origin/main..main" to preview what you will push.\n' +
      'Set "git config pull.rebase true" to default to rebase on pull.\n' +
      'Use "git remote -v" to see which URLs your remotes point to.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git clone <url>             Clone a remote repository\n' +
      'git push                    Push commits to the remote\n' +
      'git push -u origin <br>     Push and set upstream tracking\n' +
      'git pull                    Fetch + merge from remote\n' +
      'git pull --rebase           Fetch + rebase from remote\n' +
      'git fetch                   Download remote changes (no merge)\n' +
      'git remote -v               Show remote URLs',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'This is the basic collaboration cycle — you use it every time you sync work with a remote repository. ' +
      'Whether you are working with GitHub, GitLab, Bitbucket, or a self-hosted remote, ' +
      'clone/push/pull is how you participate.',
  },

  // ─── 8. PR Flow (Single Developer) ─────────────────────────────────────────
  {
    num: 8,
    stickyId: '2f68b367-a18f-4416-943f-e60824d01d4e',
    rightEdge: 3440,
    titleY: 3500,

    expandedNarration:
      'Even solo developers benefit from pull requests — they create a review checkpoint and a documentation trail. ' +
      'The flow: create a feature branch locally, push it to the remote with "git push -u origin feature", ' +
      'open a PR on GitHub, review your own diff, merge on GitHub, then sync locally with "git pull" and delete the branch. ' +
      'Self-review catches mistakes you missed while coding. The PR description documents why the change was made. ' +
      'GitHub\'s merge button handles the merge and optionally squashes or rebases. ' +
      'This builds good habits for when you eventually collaborate with others.',

    eli5:
      'ELI5: You write a letter, but before mailing it, you put it in an envelope labeled "review" ' +
      'and re-read it the next day with fresh eyes. ' +
      'That self-review step is the PR — it catches mistakes and creates a record of what you sent and why.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green rectangle = Local Git operations\n' +
      'Blue rectangle = Remote/GitHub operations\n' +
      'Purple rectangle = GitHub-specific steps (PR creation, merge)\n' +
      'Red rectangle = Cleanup steps (delete branch)\n' +
      '---\n' +
      'Arrows show the sequence of steps from local development through PR to cleanup.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Merging without reviewing the diff — even self-review catches bugs.\n' +
      'Forgetting to delete the remote branch after merging — enable auto-delete in GitHub settings.\n' +
      'Not syncing local main after merging on GitHub — your local main falls behind.\n' +
      'Writing empty PR descriptions — future you will not remember why the change was made.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Enable "Automatically delete head branches" in GitHub repo settings.\n' +
      'Write PR descriptions in present tense: "Add login feature" not "Added login feature".\n' +
      'Use GitHub\'s "Squash and merge" to keep main history clean for small features.\n' +
      'Link related issues in the PR description: "Closes #42".',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git push -u origin feature   Push branch and set upstream\n' +
      'gh pr create                 Create PR from CLI (GitHub CLI)\n' +
      'git switch main              Switch to main after merge\n' +
      'git pull                     Sync local main with remote\n' +
      'git branch -d feature        Delete local branch\n' +
      'git fetch --prune            Clean up stale remote refs',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Use this workflow even when working alone on personal projects. ' +
      'The self-review habit catches bugs, the PR trail documents decisions, ' +
      'and the pattern transfers directly to team collaboration. ' +
      'Skip this only for truly trivial changes (typo fixes, config bumps).',
  },

  // ─── 9. PR Flow (Team Collaboration) ───────────────────────────────────────
  {
    num: 9,
    stickyId: 'f35a6e15-b660-4664-a542-5eba0dc993d4',
    rightEdge: 5240,
    titleY: 3500,

    expandedNarration:
      'Team PRs add a feedback loop to the single-developer flow. ' +
      'After you push and open a PR, reviewers examine the code, leave comments, and may request changes. ' +
      'You address the feedback by pushing additional commits to the same branch — the PR updates automatically. ' +
      'Force-pushing is acceptable on PR branches to clean up history (squash fixup commits). ' +
      'The review cycle repeats: push updates, get reviewed, address feedback, until the reviewer approves. ' +
      'Once approved, the PR is merged (often requiring passing CI checks as well). ' +
      'This loop is the core quality gate in professional software development.',

    eli5:
      'ELI5: You write an essay and hand it to your teacher (open PR). ' +
      'The teacher marks it up with red pen (code review). ' +
      'You revise based on the notes and hand it back (push updates). ' +
      'This goes back and forth until the teacher gives it a gold star (approval) and publishes it (merge).',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green rectangle = Developer actions (commit, push)\n' +
      'Purple rectangle = GitHub actions (open PR, merge)\n' +
      'Yellow diamond = Decision point (approved?)\n' +
      '---\n' +
      'Arrows show the flow of the review cycle.\n' +
      'The loop from "Request Changes" back to "Push Updates" repeats until approval.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Taking code review personally — it is about the code, not you.\n' +
      'Making huge PRs — reviewers lose focus after 400 lines. Keep PRs small and focused.\n' +
      'Not responding to review comments — even "acknowledged, will fix" is better than silence.\n' +
      'Force-pushing to a shared branch (not a PR branch) — this rewrites history others depend on.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Keep PRs under 300 lines for faster, more thorough reviews.\n' +
      'Use draft PRs for work-in-progress that you want early feedback on.\n' +
      'Use "git push --force-with-lease" instead of "--force" — it prevents overwriting others\' commits.\n' +
      'Add screenshots or test output to the PR description for visual changes.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git push                       Push review fixes\n' +
      'git push --force-with-lease    Safe force-push after rebase\n' +
      'gh pr create --draft           Open a draft PR (GitHub CLI)\n' +
      'gh pr merge --squash           Squash-merge a PR\n' +
      'gh pr review --approve         Approve a PR from CLI',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Every team project. Code review is the single most effective quality practice in software engineering. ' +
      'Even two-person teams should review each other\'s code. ' +
      'The overhead pays for itself in fewer bugs, shared knowledge, and better code quality.',
  },

  // ─── 10. Fork & PR (Open Source) ────────────────────────────────────────────
  {
    num: 10,
    stickyId: 'b7d6de1f-7147-4016-959b-1ef5a9c31ff4',
    rightEdge: 6940,
    titleY: 3500,

    expandedNarration:
      'Open-source contribution uses a triangle of repositories: upstream (the original project), ' +
      'origin (your personal fork on GitHub), and local (your clone on disk). ' +
      'You fork the upstream repo to create your own copy, then clone your fork locally. ' +
      'You add the upstream repo as a second remote to stay in sync: "git remote add upstream <url>". ' +
      'Work happens on a feature branch in your local clone, pushed to your fork (origin). ' +
      'You then open a PR from your fork against the upstream repo. ' +
      'The maintainer reviews and merges without ever giving you write access to the upstream repo. ' +
      'Periodically, pull from upstream to keep your fork in sync.',

    eli5:
      'ELI5: There is a community garden (upstream) that you want to contribute to, ' +
      'but you do not have the gate key. ' +
      'So you make a copy of the garden in your own yard (fork), plant some new flowers (commits), ' +
      'and then send a photo to the garden committee (PR). ' +
      'If they like your flowers, they replant them in the community garden (merge).',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Orange rectangle = Upstream repository (original project)\n' +
      'Blue rectangle = Origin / Fork (your GitHub copy)\n' +
      'Green rectangle = Local clone (on your machine)\n' +
      'Indigo rectangle = Feature branch\n' +
      'Purple rectangle = Pull Request on GitHub\n' +
      '---\n' +
      'Arrows show the flow: fork, clone, branch, push, PR, merge.\n' +
      'The upstream-to-local arrow represents syncing with "git pull upstream main".',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Forgetting to add the upstream remote — you cannot sync without it.\n' +
      'Opening a PR from the main branch of your fork — always use a feature branch.\n' +
      'Not syncing your fork before starting new work — you will be working on stale code.\n' +
      'Making changes to files unrelated to your contribution — keep PRs focused.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Read the project\'s CONTRIBUTING.md before starting.\n' +
      'Keep your fork\'s main branch clean — only sync it from upstream, never commit to it directly.\n' +
      'Use "git pull upstream main && git push origin main" to keep your fork current.\n' +
      'Reference the issue number in your PR and commit messages.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git remote add upstream <url>   Add upstream remote\n' +
      'git fetch upstream               Fetch upstream changes\n' +
      'git pull upstream main           Sync local main from upstream\n' +
      'git push origin main             Update your fork\n' +
      'git push -u origin feature       Push feature to your fork\n' +
      'gh pr create                     Create PR against upstream',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Contributing to any open-source project where you do not have write access. ' +
      'Also useful within organizations where different teams own different repos. ' +
      'The fork model enforces a clean separation between the maintainer and the contributor.',
  },

  // ─── 11. Merge Conflict Resolution ─────────────────────────────────────────
  {
    num: 11,
    stickyId: '3fe964ef-1857-4465-b1af-383a4ebba05e',
    rightEdge: 1540,
    titleY: 5300,

    expandedNarration:
      'Conflicts happen when two branches modify the same lines in the same file. ' +
      'Git cannot automatically decide which version to keep, so it marks the conflicted sections ' +
      'with <<<<<<< / ======= / >>>>>>> markers in the file. Everything above ======= is your branch\'s version; ' +
      'everything below is the incoming branch\'s version. ' +
      'Resolution means editing the file to keep what you want (possibly combining both sides), ' +
      'removing the conflict markers, staging the resolved file with "git add", and completing the merge commit. ' +
      'A conflict is not an error — it is Git asking you to make a decision it cannot make automatically.',

    eli5:
      'ELI5: Two people are editing the same sentence in a shared document at the same time. ' +
      'When they save, the system says "I don\'t know which version you want — here are both, you pick." ' +
      'You read both versions, decide what the final sentence should be, and save it. Conflict resolved.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Blue circle/rectangle = Branch A changes\n' +
      'Orange circle/rectangle = Branch B changes\n' +
      'Red diamond = Conflict point (both branches changed same lines)\n' +
      'Red rectangle = Conflict markers in the file\n' +
      'Yellow rectangle = Resolution step (edit the file)\n' +
      'Green rectangle/circle = Merge complete (conflict resolved)\n' +
      '---\n' +
      'Arrows show the flow from conflict detection through resolution to completed merge.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Accepting only "ours" or "theirs" without reading both sides — you may lose important changes.\n' +
      'Leaving conflict markers (<<<<<<) in the code — always search for them after resolving.\n' +
      'Not testing after conflict resolution — merged code can be syntactically valid but logically broken.\n' +
      'Aborting every merge conflict instead of learning to resolve them.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "git mergetool" with a visual merge tool (VS Code, IntelliJ, Beyond Compare).\n' +
      'Search for "<<<<<<" after resolving to make sure you caught every conflict.\n' +
      'Use "git diff" after resolving to review your resolution before committing.\n' +
      'Merge frequently to keep conflicts small and manageable.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git merge <branch>      Start the merge (may conflict)\n' +
      'git status              See which files have conflicts\n' +
      'git diff                See conflict markers in files\n' +
      'git add <file>          Mark a file as resolved\n' +
      'git commit              Complete the merge commit\n' +
      'git merge --abort       Abandon the merge entirely\n' +
      'git mergetool           Open visual merge tool',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'You do not choose when conflicts happen — they come to you. ' +
      'This is a skill you must have ready. ' +
      'Conflicts are most common when merging long-lived branches, integrating upstream changes, ' +
      'or when multiple people edit the same files. Practice on small conflicts to build confidence.',
  },

  // ─── 12. Rebase vs. Merge ──────────────────────────────────────────────────
  {
    num: 12,
    stickyId: '0f762ffe-011f-4005-a742-668cc30bc8be',
    rightEdge: 4000,
    titleY: 5300,

    expandedNarration:
      'Both rebase and merge integrate changes from one branch into another, but they produce different histories. ' +
      'Merge preserves the true branching history — you can see exactly when branches diverged and reconverged. ' +
      'It creates a merge commit with two parents. The history is accurate but non-linear. ' +
      'Rebase replays your commits on top of the target branch, rewriting their SHAs to create a linear history. ' +
      'It looks as if you started your work after the latest main commit. The history is cleaner but rewritten. ' +
      'The golden rule: never rebase commits that have been pushed to a shared branch, ' +
      'because rewriting public history forces everyone else to reconcile the divergence.',

    eli5:
      'ELI5: Merge is like combining two timelines in a movie — you see the parallel storylines come together. ' +
      'Rebase is like re-telling the story so everything happens in a single straight line. ' +
      'Both tell the same story, but merge shows the real timeline while rebase edits it to look simpler.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Commit on main\n' +
      'Blue circle = Commit on feature branch\n' +
      'Purple circle (Merge side) = Merge commit with two parents\n' +
      'Green sticky = Merge pros/cons\n' +
      'Blue sticky = Rebase pros/cons\n' +
      '---\n' +
      'Left diagram = Merge (non-linear, diamond pattern)\n' +
      'Right diagram = Rebase (linear, single line)\n' +
      'Small circles (60x60) represent individual commits.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Rebasing shared/pushed branches — this rewrites history others depend on (causes chaos).\n' +
      'Not understanding that rebase changes commit SHAs — they are new commits.\n' +
      'Using rebase when merge is more appropriate (preserving history for auditing).\n' +
      'Forgetting to force-push after rebasing a PR branch — "git push --force-with-lease".',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Simple rule: rebase local/private branches, merge shared/public branches.\n' +
      'Use "git pull --rebase" to rebase when pulling remote changes.\n' +
      'If a rebase goes wrong, use "git rebase --abort" to return to the original state.\n' +
      'Some teams adopt "rebase then merge --no-ff" for clean but traceable history.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git rebase main              Rebase current branch onto main\n' +
      'git rebase --abort           Abort a rebase in progress\n' +
      'git rebase --continue        Continue after resolving conflicts\n' +
      'git merge <branch>           Merge (preserves history)\n' +
      'git merge --no-ff <br>       Merge with explicit merge commit\n' +
      'git push --force-with-lease  Safe force-push after rebase',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Use MERGE when: working on shared branches, you need audit trail, or your team convention says so. ' +
      'Use REBASE when: cleaning up local feature branches before PR, you want linear history, ' +
      'or squashing messy WIP commits. Never rebase anything that has been pushed to a shared branch.',
  },

  // ─── 13. Interactive Rebase ─────────────────────────────────────────────────
  {
    num: 13,
    stickyId: '55aedbb9-7e7a-4be7-a4f4-e36c09bddd23',
    rightEdge: 5875,
    titleY: 5300,

    expandedNarration:
      'Before opening a PR, clean up your commit history with interactive rebase. ' +
      '"git rebase -i HEAD~n" opens an editor showing your last n commits with action keywords. ' +
      'You can: squash multiple WIP commits into one meaningful commit, reorder commits for logical flow, ' +
      'reword commit messages for clarity, edit a commit to split it, or drop commits entirely. ' +
      'The result is a clean, reviewable history that tells a clear story of what changed and why. ' +
      'Reviewers will thank you for a well-organized commit history.',

    eli5:
      'ELI5: You wrote a messy rough draft with lots of scribbles and rewrites. ' +
      'Interactive rebase is like rewriting it as a clean final draft — same ideas, better organization. ' +
      'You combine repetitive paragraphs (squash), reorder sections (reorder), ' +
      'and fix typos in headings (reword).',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Clean, meaningful commit\n' +
      'Red circle = WIP or messy commit (to be squashed/dropped)\n' +
      'Darker green circle = Resulting clean commit after rebase\n' +
      'Red label ("Before") = Messy commit history\n' +
      'Green label ("After") = Cleaned-up history\n' +
      '---\n' +
      'The transformation shows messy commits on the left becoming clean commits on the right.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Interactive rebasing commits that are already pushed — rewrite only local history.\n' +
      'Squashing everything into one giant commit — keep logical units separate.\n' +
      'Not saving the rebase editor file — the rebase does nothing if you close without saving.\n' +
      'Panicking during conflicts in rebase — use "git rebase --abort" to safely cancel.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "fixup" instead of "squash" to squash without keeping the commit message.\n' +
      'Use "git commit --fixup=<sha>" while working, then "git rebase -i --autosquash" to auto-arrange.\n' +
      'Set your preferred editor: git config core.editor "code --wait" (for VS Code).\n' +
      'Keep a mental model of the story your commits should tell before rebasing.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git rebase -i HEAD~n            Interactive rebase last n commits\n' +
      'git rebase -i --autosquash      Auto-arrange fixup commits\n' +
      'git commit --fixup=<sha>        Mark a commit for autosquash\n' +
      'git rebase --abort              Cancel rebase safely\n' +
      'git rebase --continue           Continue after resolving',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Right before opening a PR or before merging a feature branch. ' +
      'Clean up WIP commits ("fix typo", "oops", "wip") into meaningful units. ' +
      'Only use on local/unpushed commits or on your own PR branch (with force-push).',
  },

  // ─── 14. Hotfix Branch ─────────────────────────────────────────────────────
  {
    num: 14,
    stickyId: 'e8a5fd44-179f-4998-b40c-7435f8a36ebf',
    rightEdge: 1525,
    titleY: 7100,

    expandedNarration:
      'Production is broken and cannot wait for the next release. ' +
      'A hotfix branch creates an emergency path: branch directly from main (which represents production), ' +
      'fix the critical bug with minimal changes, merge back to main immediately and deploy. ' +
      'Tag the release (e.g., v1.0.1) for traceability. ' +
      'Crucially, also merge the hotfix into any active development branches so the fix is not lost ' +
      'when those branches eventually merge back. ' +
      'Hotfix branches should be laser-focused — fix only the bug, nothing else.',

    eli5:
      'ELI5: Your house has a leaky pipe (bug in production). ' +
      'You do not wait until your full kitchen renovation (next release) to fix it. ' +
      'You call a plumber for an emergency repair (hotfix) right now. ' +
      'After the leak is fixed, you also tell the renovation crew about the repair so they do not undo it.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Commit on main (production)\n' +
      'Red diamond = BUG discovered in production\n' +
      'Red circle = Hotfix commits (emergency fix)\n' +
      'Teal hexagon = Version tag (e.g., v1.0.1)\n' +
      'Purple circle = Commits on development branch\n' +
      '---\n' +
      'Arrows show: main -> hotfix branch -> merge back to main + merge to develop.\n' +
      'The hexagon marks the release point.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Including unrelated changes in a hotfix — keep it minimal.\n' +
      'Forgetting to merge the hotfix into development branches — the bug reappears later.\n' +
      'Not tagging the hotfix release — you lose traceability.\n' +
      'Branching from develop instead of main — the hotfix picks up unreleased code.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Always branch hotfixes from main/production, never from develop.\n' +
      'Use a naming convention: hotfix/fix-login-crash, hotfix/patch-security-vuln.\n' +
      'Automate the merge-to-develop step in your CI/CD pipeline if possible.\n' +
      'Write a regression test for the bug before fixing it to prevent recurrence.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git switch -c hotfix/x main   Branch from main\n' +
      'git commit -m "fix: ..."      Commit the fix\n' +
      'git switch main && git merge hotfix/x   Merge to main\n' +
      'git tag v1.0.1                Tag the release\n' +
      'git switch develop && git merge hotfix/x   Propagate fix\n' +
      'git branch -d hotfix/x        Clean up',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'When a critical bug is found in production and cannot wait for the normal release cycle. ' +
      'Severity matters: use hotfix for P0/P1 issues (data loss, security, service down). ' +
      'For lower-severity bugs, the normal feature branch workflow is fine.',
  },

  // ─── 15. Release Branch (Git Flow) ─────────────────────────────────────────
  {
    num: 15,
    stickyId: '72c38bca-d2ab-4fa6-9105-b24f1dd81db2',
    rightEdge: 3755,
    titleY: 7100,

    expandedNarration:
      'Git Flow uses long-lived branches to provide structure for larger projects. ' +
      'Main always reflects production. Develop is the integration branch where features come together. ' +
      'Features branch from develop and merge back when complete. ' +
      'When enough features are ready, a release branch cuts from develop for stabilization — ' +
      'only bug fixes go into the release branch, no new features. ' +
      'Once stable, the release branch merges to both main (for deployment) and develop (to preserve fixes). ' +
      'Main gets a version tag (e.g., v1.0). This model gives clear structure but adds overhead ' +
      'compared to simpler workflows like trunk-based development.',

    eli5:
      'ELI5: Think of a newspaper. Reporters write articles (features) and submit them to the editor (develop). ' +
      'When enough articles are ready, the editor creates a draft issue (release branch) for proofreading. ' +
      'Only typo fixes are allowed at this stage — no new articles. ' +
      'Once proofread, the newspaper goes to print (merges to main) and the corrections go back to the newsroom (develop).',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Commit on main (production)\n' +
      'Blue circle = Commit on develop (integration)\n' +
      'Yellow circle = Commit on release branch (stabilization)\n' +
      'Purple circle = Commit on feature branch\n' +
      'Teal hexagon = Version tag (e.g., v1.0)\n' +
      '---\n' +
      'Swim lanes show parallel branch timelines.\n' +
      'Arrows show flow: feature -> develop -> release -> main + develop.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Adding new features to a release branch — release branches are for stabilization only.\n' +
      'Forgetting to merge the release back into develop — fixes get lost.\n' +
      'Using Git Flow for small/simple projects — the overhead is not worth it.\n' +
      'Letting develop diverge too far from main — increases merge pain at release time.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use Git Flow tooling: "git flow init", "git flow feature start", etc.\n' +
      'Set a regular release cadence (weekly, biweekly) to keep branches from diverging.\n' +
      'Use CI/CD to automate the release branch testing pipeline.\n' +
      'Consider trunk-based development (Diagram 16) for smaller or more agile teams.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git flow init                         Initialize Git Flow\n' +
      'git flow feature start <name>         Start a feature\n' +
      'git flow feature finish <name>        Finish a feature\n' +
      'git flow release start <version>      Start release branch\n' +
      'git flow release finish <version>     Merge release to main+develop\n' +
      'git tag <version>                     Tag the release',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Large teams with scheduled releases, compliance requirements, or long QA cycles. ' +
      'If you ship continuously (deploy on every merge), trunk-based development is simpler. ' +
      'Git Flow shines when you need strict separation between development, staging, and production.',
  },

  // ─── 16. Trunk-Based Development ───────────────────────────────────────────
  {
    num: 16,
    stickyId: '832f60b0-70db-4ac8-94ef-5f742a0c7d93',
    rightEdge: 6060,
    titleY: 7100,

    expandedNarration:
      'The modern alternative to Git Flow: keep branches extremely short-lived (hours to a day or two, not weeks). ' +
      'Everyone merges to main frequently, often multiple times per day. ' +
      'Main is always deployable — CI/CD runs on every merge. ' +
      'Incomplete features are hidden behind feature flags rather than living on long-running branches. ' +
      'This reduces merge conflicts (small, frequent merges), speeds up integration, ' +
      'and keeps the codebase always in a releasable state. ' +
      'Trunk-based development is the workflow behind continuous deployment practices at companies like Google and Meta.',

    eli5:
      'ELI5: Instead of building a whole room addition before connecting it to the house, ' +
      'you add one brick at a time directly to the main structure. ' +
      'If a room is not ready for guests yet, you just keep the door locked (feature flag) ' +
      'until it is finished. The house is always livable.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle (T1-T7) = Commits on the trunk (main)\n' +
      'Purple circle = Short-lived branch commit\n' +
      'Blue circle = Short-lived branch commit (different developer)\n' +
      'Indigo rectangle = Feature flag (hides incomplete work)\n' +
      '---\n' +
      'Short branches are tiny — they merge back within hours.\n' +
      'The trunk (main) is always deployable.\n' +
      'Indigo sticky compares trunk-based vs Git Flow.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Keeping branches alive for days or weeks — defeats the purpose.\n' +
      'Not having CI/CD in place — trunk-based requires automated testing to catch breaks fast.\n' +
      'Skipping feature flags for half-done work — you will ship incomplete features.\n' +
      'Not writing tests — without good test coverage, frequent merges break things.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Pair trunk-based development with feature flags (LaunchDarkly, Unleash, or DIY).\n' +
      'Enforce CI checks before merging to main — the trunk must always be green.\n' +
      'Use "short-lived feature branches" (< 1 day) or commit directly to main.\n' +
      'Monitor deployment metrics to catch regressions from frequent merges.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git switch -c short-fix        Create a very short-lived branch\n' +
      'git commit -m "..."            Make your change\n' +
      'git switch main && git pull    Sync main\n' +
      'git merge short-fix            Merge quickly\n' +
      'git push                       Deploy via CI/CD\n' +
      'git branch -d short-fix        Clean up immediately',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Teams practicing continuous delivery or continuous deployment. ' +
      'When you want fast iteration, minimal merge pain, and always-deployable main. ' +
      'Requires good CI/CD, test coverage, and feature flag infrastructure. ' +
      'Not ideal for teams with long QA cycles or strict release gates.',
  },

  // ─── 17. Cherry-Pick Across Branches ────────────────────────────────────────
  {
    num: 17,
    stickyId: '72e856d0-33db-4d5d-8c7c-9f628ced6441',
    rightEdge: 1020,
    titleY: 8900,

    expandedNarration:
      'Sometimes you need one specific commit from another branch without merging the entire branch. ' +
      '"git cherry-pick <sha>" copies the diff of that commit and applies it as a new commit on your current branch. ' +
      'The new commit has a different SHA but contains the exact same changes. ' +
      'Cherry-pick is commonly used for backporting a bug fix from a development branch to a release branch, ' +
      'or pulling a specific feature commit without taking unfinished work that comes with it. ' +
      'Use it surgically and sparingly — overuse can lead to duplicate commits and confusion.',

    eli5:
      'ELI5: Your friend\'s playlist has one great song you want. ' +
      'Instead of copying their entire playlist, you just copy that one song to yours. ' +
      'It is the same song (same changes), but it is a separate copy in your playlist (different SHA).',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Commit on main or target branch\n' +
      'Teal circle = Original commit being cherry-picked (on source branch)\n' +
      'Orange/amber circle = Cherry-picked copy (on target branch, different SHA)\n' +
      '---\n' +
      'Dashed or special arrow shows the cherry-pick operation across branches.\n' +
      'The two commits have the same diff but different SHA hashes.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Cherry-picking a commit that depends on earlier commits — you get conflicts or broken code.\n' +
      'Overusing cherry-pick instead of merging — leads to duplicate commits in the history.\n' +
      'Not noting the original SHA — track where the cherry-pick came from for future reference.\n' +
      'Cherry-picking a merge commit without specifying the parent — use "-m 1" for the mainline parent.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "git cherry-pick -x" to add a note referencing the original commit SHA.\n' +
      'Cherry-pick a range: "git cherry-pick A..B" to pick multiple commits.\n' +
      'If you cherry-pick frequently between branches, consider if merging would be better.\n' +
      'Use "git cherry-pick --no-commit" to apply changes without committing (for manual adjustment).',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git cherry-pick <sha>          Apply one commit to current branch\n' +
      'git cherry-pick -x <sha>       Cherry-pick with original SHA note\n' +
      'git cherry-pick A..B           Cherry-pick a range of commits\n' +
      'git cherry-pick --no-commit    Apply without committing\n' +
      'git cherry-pick --abort        Abort if conflicts arise\n' +
      'git cherry-pick -m 1 <sha>     Cherry-pick a merge commit',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Backporting a specific bug fix to a release or maintenance branch. ' +
      'Pulling a single useful commit from a feature branch that is not ready to merge. ' +
      'Emergency situations where you need one change without the rest of a branch. ' +
      'Use sparingly — if you are cherry-picking a lot, reconsider your branching strategy.',
  },

  // ─── 18. Stash & Context Switching ─────────────────────────────────────────
  {
    num: 18,
    stickyId: 'bc80cf9e-318d-4a61-a7be-8baf7bea339b',
    rightEdge: 3380,
    titleY: 8900,

    expandedNarration:
      'You are mid-feature with uncommitted changes when something urgent comes up. ' +
      '"git stash" saves your uncommitted work (both staged and unstaged) to a temporary stack, ' +
      'leaving your working tree clean so you can switch branches safely. ' +
      'Fix the urgent issue, commit it, then switch back and run "git stash pop" to restore your work exactly where you left off. ' +
      'The stash stack can hold multiple entries — "git stash list" shows them all. ' +
      'Think of stash as a clipboard for in-progress work that is not ready to commit. ' +
      'It works outside the normal branch model — stashes are not tied to any branch.',

    eli5:
      'ELI5: You are in the middle of cooking dinner when the phone rings. ' +
      'You put your half-chopped vegetables in the fridge (stash) to keep them fresh. ' +
      'You take the call (fix the urgent issue). ' +
      'When you hang up, you pull the vegetables back out (stash pop) and continue cooking.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Blue rectangle = Feature work in progress\n' +
      'Yellow rectangle = Uncommitted changes\n' +
      'Grey rectangle = Stash operation (save/pop)\n' +
      'Red rectangle = Urgent hotfix work\n' +
      'Green rectangle = Resumed feature work\n' +
      '---\n' +
      'Arrows show the sequence: working -> stash -> switch -> fix -> switch back -> pop.\n' +
      'Grey represents the stash as a holding area outside the branch model.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Forgetting you have stashed changes — run "git stash list" periodically.\n' +
      'Stashing when a commit would be better — if the work is at a logical stopping point, just commit it.\n' +
      'Using "git stash drop" accidentally instead of "git stash pop" — drop discards without applying.\n' +
      'Stashing too many things — the stack gets confusing. Use named stashes or just commit.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use "git stash push -m description" to name your stash entries.\n' +
      'Use "git stash -u" to include untracked (new) files in the stash.\n' +
      'Use "git stash apply" instead of "pop" if you want to keep the stash entry around.\n' +
      'Consider "git worktree" as an alternative — work on two branches simultaneously without stashing.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git stash                  Stash uncommitted changes\n' +
      'git stash push -m "msg"   Stash with a description\n' +
      'git stash -u               Include untracked files\n' +
      'git stash list             Show all stash entries\n' +
      'git stash pop              Apply and remove latest stash\n' +
      'git stash apply            Apply but keep the stash entry\n' +
      'git stash drop             Discard the latest stash entry\n' +
      'git stash show -p          Show stash contents as a diff',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'When you need to switch branches but have uncommitted work that is not ready to commit. ' +
      'Quick context switches (urgent bug fix, code review on another branch). ' +
      'If you context-switch often, consider using "git worktree" for a more permanent solution. ' +
      'If your work is at a natural stopping point, just commit it instead of stashing.',
  },

  // ─── 19. Git Bisect (Bug Hunting) ──────────────────────────────────────────
  {
    num: 19,
    stickyId: 'a9d69539-4ba7-43b9-a851-c22a4c98ba20',
    rightEdge: 5170,
    titleY: 8900,

    expandedNarration:
      'When a bug appeared "sometime recently" and you do not know which commit introduced it, ' +
      'bisect does a binary search through commit history to find the culprit. ' +
      'You mark a known-good commit (where the bug did not exist) and a known-bad commit (where it does). ' +
      'Git checks out the midpoint commit. You test it and mark it good or bad. ' +
      'Git narrows the range and checks out the next midpoint. ' +
      'In O(log n) steps, you find the exact commit that introduced the bug. ' +
      'For 1000 commits, that is only about 10 tests instead of 1000. ' +
      'You can even automate it with "git bisect run <test-script>".',

    eli5:
      'ELI5: You are looking for a broken page in a 500-page book. ' +
      'Instead of checking every page, you open to the middle. Is it broken? ' +
      'If yes, the problem is in the first half. If no, it is in the second half. ' +
      'You keep halving until you find the exact page. That is bisect.',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Green circle = Known good commit (bug not present)\n' +
      'Yellow circle = Candidate commit being tested\n' +
      'Red circle = Known bad commit (bug present)\n' +
      '---\n' +
      'The commit line shows a linear history.\n' +
      'Bisect narrows the search range from the full line down to one commit.\n' +
      'Arrows show the binary search narrowing the range.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Choosing a "good" commit that actually had the bug — wrong starting point gives wrong results.\n' +
      'Not having a reliable way to test for the bug — bisect requires a clear pass/fail test.\n' +
      'Forgetting to run "git bisect reset" when done — you will be stuck on a detached HEAD.\n' +
      'Marking a commit wrong (good as bad or vice versa) — bisect gives wrong results.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Write a test script and use "git bisect run ./test.sh" to fully automate the search.\n' +
      'The test script should exit 0 for good and 1 for bad.\n' +
      'Use "git bisect skip" if a commit cannot be tested (e.g., does not compile).\n' +
      'Start with a wide range — you can always narrow it, but starting too narrow may miss the culprit.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git bisect start           Begin a bisect session\n' +
      'git bisect good <sha>      Mark a commit as good\n' +
      'git bisect bad <sha>       Mark a commit as bad\n' +
      'git bisect good/bad        Mark current commit\n' +
      'git bisect skip            Skip untestable commit\n' +
      'git bisect run <script>    Automate with a test script\n' +
      'git bisect reset           End bisect, return to branch\n' +
      'git bisect log             Show bisect progress',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'When a regression appeared and you know it worked at some point in the past but not which commit broke it. ' +
      'Most effective with 10+ commits to search through (otherwise just check manually). ' +
      'Especially powerful with automated test scripts — hands-free bug hunting.',
  },

  // ─── 20. Monorepo CI/CD Pipeline ───────────────────────────────────────────
  {
    num: 20,
    stickyId: '2e16b8ae-3a1a-434b-8a65-d474de615344',
    rightEdge: 7310,
    titleY: 8900,

    expandedNarration:
      'Every push triggers a CI/CD pipeline that validates and deploys your code. ' +
      'Feature branches run lint, test, and build stages to validate changes before merging. ' +
      'The main branch gets the full pipeline: lint, test, build, deploy to staging, an approval gate, ' +
      'and finally deploy to production. ' +
      'The approval gate is a manual checkpoint — a human reviews the staging deployment before promoting to production. ' +
      'Branch-conditional stages mean feature branches skip deployment but main gets the full treatment. ' +
      'The pipeline is the final gatekeeper: no matter how good the code looks, it must pass CI to ship.',

    eli5:
      'ELI5: A package moving through airport security. ' +
      'First it goes through the X-ray (lint), then gets inspected (test), then gets loaded on the plane (build). ' +
      'For important flights (main branch), there is an extra customs check (staging) ' +
      'and a human officer approves it (approval gate) before it lands at the destination (production).',

    legend:
      'LEGEND\n' +
      '---\n' +
      'Indigo rectangle = Git operation (push, trigger)\n' +
      'Blue rectangle = CI stage (lint, test, build)\n' +
      'Grey diamond = Branch condition (main branch?)\n' +
      'Green rectangle = Deploy to staging\n' +
      'Orange rectangle = Manual approval gate\n' +
      'Red rectangle = Deploy to production\n' +
      '---\n' +
      'Arrows show the pipeline sequence.\n' +
      'The diamond branches: feature branches stop after build; main continues to deployment.',

    mistakes:
      'COMMON MISTAKES\n' +
      '---\n' +
      'Skipping CI for "small changes" — small changes can break everything.\n' +
      'Not having a staging environment — deploying directly to production is risky.\n' +
      'Ignoring flaky tests — they erode trust in the pipeline and people start ignoring failures.\n' +
      'Manual deployment steps outside the pipeline — if it is not in CI, it is not repeatable.',

    tips:
      'PRO TIPS\n' +
      '---\n' +
      'Use GitHub Actions, GitLab CI, or similar for pipeline automation.\n' +
      'Cache dependencies between runs to speed up CI.\n' +
      'Run linting and tests in parallel to reduce pipeline time.\n' +
      'Add status checks as required on the main branch — block merges if CI fails.\n' +
      'Use branch protection rules to enforce the pipeline.',

    commands:
      'COMMANDS REFERENCE\n' +
      '---\n' +
      'git push                    Trigger CI pipeline\n' +
      'gh run list                 View recent CI runs (GitHub CLI)\n' +
      'gh run view <id>            Check specific run status\n' +
      'gh run rerun <id>           Re-run a failed pipeline\n' +
      'gh pr checks                View CI status for a PR',

    whenToUse:
      'WHEN TO USE THIS\n' +
      '---\n' +
      'Every project with more than one contributor should have CI/CD. ' +
      'Even solo projects benefit from automated testing on push. ' +
      'The approval gate is optional for smaller teams but essential for production services. ' +
      'This is the industry standard for professional software delivery.',
  },
];

// ─── TRANSFORMATION ───────────────────────────────────────────────────────────

function run() {
  const board = JSON.parse(fs.readFileSync(BOARD_PATH, 'utf8'));

  const RIGHT_GAP = 80; // gap between diagram right edge and legend column
  const RIGHT_COL_WIDTH = 380;
  const LEFT_COL_WIDTH = 420;
  const VERT_GAP = 15; // gap between stacked stickies

  // Check if already enhanced (idempotency)
  const hasLegends = board.nodes.some((n) => n.type === 'sticky' && n.label.startsWith('LEGEND'));
  if (hasLegends) {
    console.log('Board already enhanced — skipping to avoid duplicates.');
    console.log(`Current nodes: ${board.nodes.length}`);
    // Still write to sync the other copy
    const output = JSON.stringify(board, null, 2);
    const otherPath = BOARD_PATH === RUNTIME_PATH ? EXAMPLES_PATH : RUNTIME_PATH;
    if (fs.existsSync(path.dirname(otherPath))) {
      fs.writeFileSync(otherPath, output);
      console.log(`Synced to ${path.basename(path.dirname(otherPath))}/${path.basename(otherPath)}`);
    }
    return;
  }

  let nodesAdded = 0;

  for (const d of DIAGRAMS) {
    // Find and expand existing sticky
    const sticky = board.nodes.find((n) => n.id === d.stickyId);
    if (!sticky) {
      console.error(`Sticky not found for diagram ${d.num}: ${d.stickyId}`);
      continue;
    }

    // Expand existing narration sticky
    sticky.label = d.expandedNarration;
    sticky.width = LEFT_COL_WIDTH;
    sticky.height = calcHeight(d.expandedNarration, LEFT_COL_WIDTH);

    // ELI5 goes below the expanded sticky (same x)
    const eli5Y = sticky.y + sticky.height + VERT_GAP;
    const eli5Node = makeSticky(d.eli5, sticky.x, eli5Y, STYLES.eli5, LEFT_COL_WIDTH);
    board.nodes.push(eli5Node);
    nodesAdded++;

    // Right column starts at rightEdge + gap
    const rightX = d.rightEdge + RIGHT_GAP;
    let rightY = d.titleY; // align with diagram title

    // Legend
    const legendNode = makeSticky(d.legend, rightX, rightY, STYLES.legend, RIGHT_COL_WIDTH);
    board.nodes.push(legendNode);
    rightY += legendNode.height + VERT_GAP;
    nodesAdded++;

    // Common Mistakes
    const mistakesNode = makeSticky(d.mistakes, rightX, rightY, STYLES.mistakes, RIGHT_COL_WIDTH);
    board.nodes.push(mistakesNode);
    rightY += mistakesNode.height + VERT_GAP;
    nodesAdded++;

    // Pro Tips
    const tipsNode = makeSticky(d.tips, rightX, rightY, STYLES.tips, RIGHT_COL_WIDTH);
    board.nodes.push(tipsNode);
    rightY += tipsNode.height + VERT_GAP;
    nodesAdded++;

    // Commands Reference
    const commandsNode = makeSticky(d.commands, rightX, rightY, STYLES.commands, RIGHT_COL_WIDTH);
    board.nodes.push(commandsNode);
    rightY += commandsNode.height + VERT_GAP;
    nodesAdded++;

    // When To Use
    const whenNode = makeSticky(d.whenToUse, rightX, rightY, STYLES.whenToUse, RIGHT_COL_WIDTH);
    board.nodes.push(whenNode);
    nodesAdded++;

    console.log(`Diagram ${d.num}: +6 nodes, right column at x=${rightX}, y=${d.titleY}-${rightY + whenNode.height}`);
  }

  // Update timestamps
  board.updatedAt = new Date().toISOString();

  // Write back to both locations
  const output = JSON.stringify(board, null, 2);
  fs.writeFileSync(BOARD_PATH, output);
  // Also sync the other copy
  const otherPath = BOARD_PATH === RUNTIME_PATH ? EXAMPLES_PATH : RUNTIME_PATH;
  if (fs.existsSync(path.dirname(otherPath))) {
    fs.writeFileSync(otherPath, output);
    console.log(`Also wrote to ${path.basename(path.dirname(otherPath))}/${path.basename(otherPath)}`);
  }
  console.log(`\nDone. Added ${nodesAdded} nodes to ${board.nodes.length} total.`);
}

run();
