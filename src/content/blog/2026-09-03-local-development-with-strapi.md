---
title: "Local Development with Strapi: The Three-Way Sync Problem"
description: "Strapi is hailed as an industry standard headless CMS, but local development is fundamentally broken. Here is how I tackled syncing code, DB dumps, and assets with hard links and diffs."
date: "Sep 3, 2026"
tags: ["Web Dev", "Databases", "DevOps", "Infrastructure"]
---

Strapi: the great tool used by everyone, the supposed "industry standard" for headless CMSs.

Except it has one massive, infuriating flaw.

There is no proper way to do local development.

If you have ever tried to build a real-world frontend that fetches data from Strapi while coordinating with multiple developers, you know what a headache it is. The problem isn't just tooling ergonomics; it's architectural.

## The Three-Way Disconnect

Fundamentally, Strapi’s state does not live in one place. It is split across three independent pillars:

1. **The Codebase:** Content-type schemas, custom controllers, plugins, and config.
2. **The Database:** Content entries, relations, media metadata, and Strapi internal state (running on Cloud SQL / PostgreSQL in our case).
3. **The Asset Base:** Uploaded images, videos, and documents (stored in a Google Cloud Storage bucket).

```
+---------------+     +--------------------+     +-------------------+
|   Codebase    |     |      Database      |     |    Asset Base     |
| (Git tracking)|     | (Cloud SQL / PG)   |     |   (GCS Bucket)    |
+---------------+     +--------------------+     +-------------------+
        |                       |                          |
        +------------> How do you sync these? <------------+
```

With traditional application development, you track code in Git, and database schema migrations evolve deterministically alongside that code.

In a CMS, that assumption completely collapses. The content *is* the application.

When a developer builds a new page or redesigns a frontend section, they aren't just adjusting markup; they are querying content models that must exist in the database. Those entries need actual data—insertions, relations, updates, and associated media files. You can't just let frontend engineers play directly in the production CMS. We can let content managers edit blog posts or tweak copy in production, but when building new frontend features, you have to serve that data locally from Strapi itself.

How do you track and synchronize these three independent sources of truth across environments without everything falling apart?

Because I couldn't find any decent standard way to do this in the Strapi ecosystem, I had to build a rudimentary sync system myself.

## The Rudimentary Sync System

The workflow I built revolves around a base dump and a state diff:

```
[Production Cloud]
  ├── Cloud SQL (DB Dump) ──┐
  └── GCS (Asset Dump)    ──┼──> [Local Dev Environment]
                            │     ├── Seed local PostgreSQL
                            │     └── Mount synced assets
                            │
                            v
                      [Feature Dev]
                            │
                            v
                      [Generate Diff]
                            ├── Delta .sql (INSERTs / schema changes)
                            └── New/modified assets
                            │   (Excludes admin & auth tables)
                            v
                      [DevOps / Prod Deployment]
```

### 1. The Base Dump & Local Seeding

First, we pull the production assets and a database dump from the cloud. In our setup, the database runs on Cloud SQL (Postgres) and media assets live in a GCS bucket.

The tool downloads both and generates a clean snapshot. When a developer begins work on a feature, they pull the latest code from Git and import this base dump into their local Postgres instance.

Now the developer is in a known, consistent state:
- The codebase is at the correct commit.
- The local database is seeded with realistic production-like data and schemas.
- The media assets are available locally.

### 2. Developing and Creating the Diff

The developer builds their feature locally. They create new content types, adjust fields, insert test data, and upload new media assets.

When they are done, the tool generates a **diff**:
- **Database changes:** It extracts the delta between the developer's modified local DB and the original base dump into a clean `.sql` file. It tracks data insertions and any schema adjustments that Strapi made.
- **Asset changes:** Any new assets uploaded during development are isolated.
- **Table restrictions:** Crucially, the import and export scripts explicitly filter out admin tables (`strapi_admin`, admin users, API tokens, roles, and permissions). Overwriting admin tables across environments is a recipe for disaster—it makes no sense to stomp production access tokens or admin accounts with local test credentials.

### 3. DevOps & Deployment

On the deployment side (which is currently me), the flow is straightforward: take a fresh base dump, apply the developer’s diff, verify that everything compiles and renders locally, and then promote it to production.

Even if the deployment verification is a bit manual right now, the concept is established: two developers can actually share their work, test features against real data, and roll changes forward without blowing away each other's environments.

## The Hard-Link Optimization for Assets

Taking a full dump every single time is unoptimized. If your GCS bucket has 2 GB of images, re-downloading 2 GB for every snapshot will make everyone hate their lives.

To solve this, the snapshot tool uses filesystem hard links before pulling from the bucket. 

Standard Unix `rsync` has `--link-dest` to create hard links against a previous directory, but `gcloud storage rsync` is syncing directly from an object store (`gs://...`) and doesn't have an equivalent flag. 

So instead, I do it in two steps: first hard-link with `pax`, then sync.

In a Unix filesystem, a file's data lives at an inode, and directory entries are simply pointers (links) to that inode. A hard link creates a second directory pointer to the exact same underlying disk blocks without duplicating bytes:

```
Dump 1:  /dumps/v1/banner.jpg  ──┐
                                 ├──> Inode 481920 (Same 5MB on disk)
Dump 2:  /dumps/v2/banner.jpg  ──┘
```

The dump sequence works like this:

1. **Pre-seed with `pax`**: Use `pax -rw -l` to duplicate the previous dump's directory structure into the new snapshot directory. This instantly mirrors the entire asset tree using hard links—costing zero extra disk space and taking a fraction of a second.
2. **Sync with `gcloud`**: Run `gcloud storage rsync` against that newly seeded directory:
   ```bash
   gcloud storage rsync -r --delete-unmatched-destination-objects "gs://$BUCKET" "$DEST"
   ```

Because `$DEST` is already populated with hard links to the previous dump:
- **Unchanged files** match what's in GCS, so `gcloud` skips downloading them entirely.
- **New or modified files** are downloaded, creating new inodes or replacing the pointers in the new dump.
- **Deleted files** in GCS are purged from `$DEST` by `--delete-unmatched-destination-objects`, but the previous dump retains them completely untouched because the inode's reference count is only decremented, never freed.

Your initial dump might be 2 GB, but subsequent dumps only download the delta and take negligible disk.

## Base Hashes: Preventing State Drift

There was another subtle problem: base consistency.

Suppose Developer A takes a dump on Monday, and Developer B takes a dump on Tuesday. If production hasn’t changed, the data is identical. But what if production *did* drift, or someone tries to apply a diff against the wrong snapshot?

Applying a SQL diff against an arbitrary database state will inevitably lead to foreign key violations, primary key collisions, or corrupted relations.

To guarantee state integrity, the diff generation process calculates a cryptographic **SHA hash of the base dump**. The diff file is stamped with this base hash. When someone attempts to apply the diff, the tool verifies that the target base DB matches the exact SHA hash. If there’s a mismatch, the operation aborts before corrupting state.

## The Missing Piece: Incremental "Diff on Diff"

The system works well for a flat baseline: `Base Dump + Diff`.

What’s currently missing is **incremental diff chaining**—creating a diff on top of an existing diff ("diff on diff").

Being able to stack incremental diffs would allow developers to iterate on features in sequence without rebasing against a full base dump every time. But right now, we aren’t changing the website so rapidly that this is a bottleneck. I don’t want to break my head over solving multi-branch incremental SQL merges unless it's strictly necessary. For now, the single-base model gets the job done.

## The Strapi / Headless CMS Rant

While I'm glad this rudimentary system works, I can't help feeling that **this should be Strapi's responsibility.**

Why are developers forced to write custom shell scripts, rsync pipelines, and SQL diff extractors just to achieve a basic local development and sync workflow?

At the very least, Strapi should provide first-class tooling to sync content between environments. Managing media is easy enough to handle ourselves, but database state is fundamental. Running blind `pg_dump` and `psql` imports is a minefield—tables get overwritten, admin sessions get nuked, and relations break.

Strapi understands its own content models, schema versions, and relation mappings. It should have a native mechanism to export a structured content diff—*"here are the content and schema changes since snapshot X"*—and cleanly apply that diff elsewhere.

To tell you the truth, I really don't like the headless CMS ecosystem. It always ends up being this awkward compromise: half in code, half in the database, and completely brittle across environments. I don't understand why so much of the modern web insists on running on this architecture. There has to be a better way.

Until then, we’re left hacking together hard links and SQL diffs just to do our jobs.
