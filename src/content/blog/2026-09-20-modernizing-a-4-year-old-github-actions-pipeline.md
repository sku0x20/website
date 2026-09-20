---
title: "Modernizing a 4-Year-Old GitHub Actions Pipeline"
description: "Cleaning up my 4-year-old CI/CD setup: ditching the delete-and-reupload cache hack, splitting checks cleanly, and getting release builds down to 6 seconds."
date: "Sep 20, 2026"
tags: ["GitHub Actions", "CI/CD", "Gradle", "DevOps", "Java"]
---

Finally got around to cleaning up my GitHub Actions workflows.

The old setup had been running basically untouched for four years. Back when I originally set it up, GitHub Actions was still pretty new, the official Gradle action didn't exist at all, and cache support was minimal. So I had stitched together a proper Frankenstein.

It worked for four years, but looking back at the YAML files, it was clearly time to clean house.

---

### The Frankenstein Era

Until today, I still had three separate workflows plus a scheduled cache-clearing job running from back then:

- `ci-unit`: ran on push to `master`.
- `ci-full`: ran on PRs (unit + integration tests).
- `release`: manual workflow dispatch to build and tag the jar.
- `clear-cache`: a workflow running `gh actions-cache delete` to wipe everything out.

The caching setup was the most unhinged part. Generic `actions/cache` was all we had. I’d set up Java, hash `build.gradle` and `gradle.properties`, invoke `./gradlew` directly via raw shell steps, and then try to save the cache.

Except GitHub’s cache keys were immutable. If a key already existed, it wouldn't overwrite or update. But on `master`, if dependencies shifted or `org.gradle.caching=true` produced new task outputs I wanted saved, GitHub simply skipped saving.

So my solution at the time?
1. Try to delete the existing cache entry using the GitHub CLI cache extension.
2. If the delete failed (because it didn't exist yet), ignore the error (`continue-on-error: true`).
3. Upload the new cache.

I literally had this in my workflow:

```yaml
- name: clear cache
  run: |
    gh extension install actions/gh-actions-cache
    gh actions-cache delete ${{ steps.restore-cache.outputs.cache-primary-key }} --confirm
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  continue-on-error: true

- name: save gradle cache
  uses: actions/cache/save@v3
```

All three workflows were sharing this same cache key based on that hash.

And then in `release.yml`, I was paranoid: before building the jar, I had full unit and integration test blocks running all over again. The exact same test suite that had already run and passed on the PR and on `master`. I was waiting through redundant test runs just to produce an artifact.

---

### What I Changed

Last year or so, Gradle introduced their official `gradle/actions/setup-gradle`. It handles caching dependencies and the wrapper out of the box, but the concept that really stood out to me was prefix/fallback matching (`restore-keys`).

Instead of strict all-or-nothing hash matches, it matches hierarchically. If an exact match for a branch or commit hash doesn't exist, it falls back to the prefix match from `master`. PRs can restore from `master`'s warm cache without corrupting or overwriting it.

I deleted `clear-cache.yml`, dropped `ci-unit`, and rebuilt the setup around three focused workflows: `ci.yml`, `release.yml`, and `deploy.yml`.

#### 1. Parallel CI with a single dummy check

In `ci.yml`, I split test execution into two parallel jobs: `unitTest` and `integrationTest`.

Both run side-by-side using `gradle/actions/setup-gradle` pinned to the MIT-licensed `basic` cache provider:

```yaml
jobs:
  unit-test:
    name: unitTest
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v6
        with:
          cache-provider: basic
      - run: ./gradlew test --no-daemon

  integration-test:
    name: integrationTest
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v6
        with:
          cache-provider: basic
      - run: ./gradlew integrationTest --no-daemon

  check:
    name: check
    runs-on: ubuntu-latest
    needs: [ unit-test, integration-test ]
    steps:
      - run: echo "all checks passed"
```

To avoid making branch protection rules annoying (where GitHub requires you to manually track every individual job name), `check` sits at the end. In repository settings, I just require `check` to merge. If I change or add test jobs under the hood tomorrow, branch protection doesn't care—it only waits on `check`.

#### 2. Release in 6 seconds

For `release.yml`, I finally stopped re-running tests.

When I trigger a release manually, I'm doing it for a specific commit on `master`. That commit already passed `ci.yml`. Running the same integration and unit tests a second time inside the release workflow was just wasting runner minutes and my own patience.

Now, the release workflow has a fast pre-flight check that queries `gh run list` to verify that CI passed for that exact commit:

```yaml
  check:
    name: check
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: verify ci passed for this commit
        run: |
          run_json=$(gh run list --repo "${{ github.repository }}" --workflow=ci.yml --commit "${{ github.sha }}" --limit 1 --json status,conclusion,url)
          echo "$run_json"

          status=$(echo "$run_json" | jq -r '.[0].status // empty')
          conclusion=$(echo "$run_json" | jq -r '.[0].conclusion // empty')

          if [ "$status" != "completed" ] || [ "$conclusion" != "success" ]; then
            echo "ci workflow has not passed for commit ${{ github.sha }} (status=$status, conclusion=$conclusion)"
            exit 1
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

If that check passes, the release job pulls the already-warm Gradle cache from `master` and runs `./gradlew bootJar --no-daemon`.

Because the cache is already primed, the whole bootJar step finishes in **6 seconds**. No test suite churn, just straight to the jar.

---

### Ditching Blue-Green for a 2:34 AM Cron

The other piece tied to this was deployment.

Previously, running the release workflow published a pre-release on GitHub. Then I had to manually edit and publish it as a full release to trigger the deployment. And on the server side, I had this whole blue-green deployment dance to prevent any downtime during cutover.

Back when I first introduced blue-green, it was actually necessary. The backend was very unstable back then and I was doing multiple deployments in a single day under live traffic. Dropping connections in the middle of the afternoon wasn't an option.

Now, things are very different. The backend is much leaner, much more stable, and I'm not firefighting with midday deploys anymore. Which made me question: why am I still carrying the networking and state complexity of blue-green around?

If the service drops for 60 seconds at 2:30 in the morning, nobody cares.

So I added a dedicated `deploy.yml` that runs daily on a cron at **2:34 AM IST** (`cron: '4 21 * * *'`):

```yaml
name: deploy

on:
  schedule:
    - cron: '4 21 * * *' # 2:34am IST

jobs:
  promote-release:
    name: promote latest pre-release
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: promote latest pre-release
        run: |
          tag=$(gh release list --repo "${{ github.repository }}" --json tagName,isPrerelease,createdAt --jq 'map(select(.isPrerelease)) | sort_by(.createdAt) | last | .tagName // empty')

          if [ -z "$tag" ]; then
            echo "nothing to release"
            exit 0
          fi

          echo "promoting $tag to a full release"
          gh release edit "$tag" --repo "${{ github.repository }}" --prerelease=false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

It finds the latest pre-release, promotes it to a full release, and lets the server update cleanly.

With an acceptable off-peak window, I can ditch the entire blue-green routing setup completely. One less complex system to maintain, and it clears the path to just dockerize the whole application next.
