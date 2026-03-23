# Scripts

Utility scripts for local testing live in this folder. Each script reads database
configuration from the same `.env` file that the backend uses via
`backend/src/config/database.js`.

Run scripts with Node 18+:

```bash
node scripts/wipe-users.mjs
node scripts/create-dummy-users.mjs
# or use the combined seeder
node scripts/seed-minimal.mjs
```

## Available scripts

### `wipe-users.mjs`
Removes users, students, and related memories/tag data. Safe to run repeatedly.

### `create-dummy-users.mjs`
Ensures three test student accounts exist. Password defaults to `passcode123`
but can be overridden by setting `DUMMY_PASSWORD` in the environment. The script
also upserts supporting `departments` and `yearbooks` rows.

### `seed-clubs.mjs`
Creates a small set of sample clubs and ensures the required tables exist.

### `seed-minimal.mjs`
Convenience wrapper that runs `seed-clubs` and `create-dummy-users` to get a
minimal playground dataset after wiping the database.
