# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Git Commits
When committing changes, you MUST create a separate, individual git commit for each modified file with its own descriptive commit message. Do NOT bundle multiple file changes into a single commit.

# Pull Requests
When pushing a new branch or finishing a feature/bug fix, you MUST automatically provide a beautifully formatted Markdown template for the GitHub Pull Request description. The template should include sections for the Bug/Feature description, Cause, and Solution.

# Branch Management
When starting development on a new feature or a significant fix, you MUST proactively suggest creating a new Git branch. You should provide a suggested branch name and the exact terminal command to create it (e.g., `git checkout -b feat/your-feature-name`). Do this before writing any code for the feature.

# Feature Planning & User Behavior Anticipation
Before writing any code for a new feature, you MUST think like an end-user with zero programming knowledge. Anticipate common or irrational user behaviors (e.g., button mashing, navigating away abruptly, offline states) that could cause crashes or bugs. 

You MUST provide a structured pre-implementation plan that includes:
1. **Workflow**: Step-by-step logic of how the function will operate.
2. **Files Affected**: Existing files to modify and new files to create.
3. **Edge Cases & User Mistakes**: A list of irrational or edge-case user actions (e.g., "User taps download 5 times really fast while offline").
4. **Proposed Solutions**: How the code will proactively guard against these actions (e.g., "Disable the button and show a Toast").
5. **Severity**: Rate the severity of each potential problem (e.g., Low, Medium, High, Critical) if left unguarded.
