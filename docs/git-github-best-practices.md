# Git & GitHub Best Practices — Diagram Catalog

**Board:** Git/GitHub Best Practices
**Location:** `boards/examples/git-github-best-practices.json`
**Diagrams:** 20 across 6 sections
**Nodes:** 274 | **Edges:** 151

---

## Section 1: Local Git Fundamentals

### 1. Basic Commit Flow
Files move through three states: modified → staged → committed. The working tree holds your actual files. The index (staging area) is a snapshot you are preparing. HEAD points to the last commit in the repository. This mental model underpins all of Git.

**Key concepts:** `git add`, `git commit`, `git restore`, working tree → index → HEAD

### 2. Branch Create & Switch
A branch is just a pointer to a commit. Creating a branch does not copy code—it creates a new reference. HEAD tells Git which branch you are on. `git switch` moves HEAD between branches.

**Key concepts:** `git branch`, `git switch`, HEAD pointer, branch divergence

### 3. Fast-Forward Merge
When the target branch has not diverged, Git simply moves the pointer forward. No merge commit is created—the history stays linear. This is the simplest merge and happens when you are the only one working.

**Key concepts:** `git merge` (fast-forward), linear history, pointer advancement

### 4. Three-Way Merge (Merge Commit)
When both branches have new commits, Git performs a three-way merge using the common ancestor plus both branch tips. This creates a merge commit with two parents—the diamond shape where branches diverge and reconverge.

**Key concepts:** Common ancestor, merge commit, two-parent commit, diamond history shape

---

## Section 2: The Feature Branch Workflow

### 5. Full Local Feature Lifecycle
The complete lifecycle of a feature branch: create it, do your work in isolated commits, merge back when done, then clean up. This is the bread and butter of Git workflow. The branch exists only as long as the feature is in progress.

**Key concepts:** `git branch feature/x`, develop in isolation, `git merge`, `git branch -d`

### 6. Multiple Features in Parallel
Branch isolation means features do not interfere with each other. Each feature branch sees only main plus its own changes. Merging happens sequentially—one feature integrates, then the next. This prevents half-finished features from breaking other work.

**Key concepts:** Branch isolation, sequential merges, independent development streams

---

## Section 3: Remote & GitHub Workflows

### 7. Clone → Push → Pull Cycle
Remote and local repositories are independent copies that sync through push and pull. Clone creates the initial local copy. Push sends your commits upstream. Pull (fetch+merge) brings others' work down. This two-way sync is key to collaboration.

**Key concepts:** `git clone`, `git push`, `git pull`, origin/main vs local main, two-way sync

### 8. PR Flow (Single Developer)
Even solo developers benefit from PRs—they create a review checkpoint and documentation trail. Push your feature branch, open a PR on GitHub, review your own changes, merge, then sync locally. This builds good habits for team work.

**Key concepts:** `git push -u`, GitHub PR creation, self-review, merge on GitHub, local cleanup

### 9. PR Flow (Team Collaboration)
Team PRs add a feedback loop. Reviewers comment, request changes, and the author pushes updates to the same branch. The PR updates automatically. Force-pushing rewrites PR branch history (acceptable here). The cycle repeats until approval.

**Key concepts:** Code review loop, requested changes, `git push --force` on PR branches, approval flow

### 10. Fork & PR (Open Source Model)
Open source uses a triangle: upstream (the original repo), origin (your fork), and local (your clone). You fork to get your own copy, clone that, work on a branch, push to your fork, then open a PR against upstream. The maintainer merges without giving you write access.

**Key concepts:** Upstream/origin/local triangle, fork, `git pull upstream`, PR against upstream

---

## Section 4: Handling Conflicts & History

### 11. Merge Conflict Resolution
Conflicts happen when two branches modify the same lines. Git cannot auto-merge, so it marks conflicts with `<<<<<<< / ======= / >>>>>>>` markers. You manually choose what to keep, stage the resolved files, and complete the merge. It is not an error—it is Git asking for a decision.

**Key concepts:** Conflict markers, manual resolution, `git add` resolved files, completing the merge commit

### 12. Rebase vs. Merge
Both integrate changes, but differently. Merge preserves the true history—you can see when branches diverged and joined. Rebase rewrites history to look linear, as if you started after the latest main commit. Use merge for shared branches, rebase for local cleanup.

**Merge pros/cons:**
- True history preserved, safe for shared branches
- Non-linear history, more merge commits

**Rebase pros/cons:**
- Clean linear history, easier to read
- Rewrites commit SHAs, never rebase shared branches

### 13. Interactive Rebase (Cleaning History)
Before opening a PR, clean up your commit history. Interactive rebase lets you squash WIP commits, reorder for logical flow, reword messages, and drop mistakes. The result: a clean, reviewable history that tells a story.

**Key concepts:** `git rebase -i HEAD~n`, squash, reorder, reword, clean history before PR

---

## Section 5: Release & Hotfix Patterns

### 14. Hotfix Branch
Production is broken and cannot wait for the next release. A hotfix branch creates an emergency path: branch from main (production), fix the bug, merge back to main immediately for deployment, then also merge into any active development branches so the fix is not lost.

**Key concepts:** Emergency branching from main, immediate merge and deploy, propagating fix to feature branches, version tags

### 15. Release Branch (Git Flow)
Git Flow uses long-lived branches for structure: main (production), develop (integration), and temporary release branches for stabilization. Features merge to develop. When ready, a release branch cuts from develop for final testing. Once stable, it merges to both main and develop.

**Key concepts:** main/develop/release swim lanes, feature → develop → release → main, version tags

### 16. Trunk-Based Development
The modern alternative to Git Flow: keep branches short-lived (hours, not days). Everyone merges to main frequently. Incomplete features hide behind feature flags. This reduces merge conflicts, speeds up integration, and keeps the codebase always deployable.

**Key concepts:** Short-lived branches, frequent merges, feature flags, always-deployable main, CI/CD from trunk

---

## Section 6: Advanced Patterns

### 17. Cherry-Pick Across Branches
Sometimes you need one specific commit from another branch without merging everything. Cherry-pick copies the diff of a commit and applies it as a new commit on your current branch. The new commit gets a different SHA but contains the same changes.

**Key concepts:** `git cherry-pick <sha>`, same diff / different SHA, targeted backports

### 18. Stash & Context Switching
Mid-feature when something urgent comes up. Stash saves uncommitted changes to a temporary stack outside the branch model. Switch to the urgent branch, fix it, switch back, pop your stash to resume exactly where you left off. A clipboard for in-progress work.

**Key concepts:** `git stash`, `git stash pop`, stash stack, context switching without committing

### 19. Git Bisect (Bug Hunting)
When a bug appeared sometime recently, bisect does a binary search through commit history. Mark a known-good and known-bad commit, Git checks out the midpoint. You test, mark good/bad, Git narrows the range. Finds the culprit in O(log n) steps.

**Key concepts:** `git bisect start/good/bad`, binary search through history, O(log n) bug finding

### 20. Monorepo CI/CD Pipeline
Every push triggers the pipeline. Feature branches run lint, test, and build to validate changes. Main branch gets the full pipeline with deployment stages. The approval gate is a manual checkpoint before production. The pipeline is the final gatekeeper.

**Key concepts:** lint → test → build → deploy staging → approval → deploy prod, branch-conditional stages
