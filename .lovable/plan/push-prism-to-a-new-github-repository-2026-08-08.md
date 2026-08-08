# Push Prism to a new GitHub repository

Use the saved GitHub token to create a fresh repository under your account and upload the entire current codebase to it.

## Steps

1. Verify the token and read the account username via the GitHub API (`GET /user`), so the repo is created in the right place.
2. Create a new **private** repository named `prism` (description: "Prism — light-refraction puzzle platform with the PhotonMind AI/ML lab"). If `prism` already exists, fall back to `prism-hackathon-2026`.
3. Stage a clean copy of the project in a temp folder, excluding `node_modules`, build output (`dist`, `.output`, `.vinxi`, `.tanstack`), caches, and `.env` files so no secrets are committed.
4. Add a `.gitignore` covering those same paths if the project doesn't already have an adequate one.
5. Initialise a git repo in the temp copy, commit everything as "Initial commit: Prism", and push to `main` over HTTPS with the token used only as an in-memory credential (never written to a file or logged).
6. Report back the repository URL and the file/commit count.

## Notes

- The token is read from the environment at run time; it will not appear in any committed file, log, or chat message.
- This is a one-time snapshot push. It does **not** set up ongoing sync — for automatic two-way sync, the Plus (+) menu → GitHub → Connect project flow is still the better long-term option, and it can point at this same repo later.
- `.env` and any Lovable Cloud keys are excluded; the repo will need those values re-supplied to run elsewhere.

## Confirm before I run

- Repo name: `prism` (say the word if you want a different one)
- Visibility: **private** (tell me if you'd rather it be public)
