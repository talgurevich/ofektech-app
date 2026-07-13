-- Force the venture-name popup to appear once for every existing venture,
-- regardless of whether a name is already set. On submit, the app flips
-- name_confirmed back to true.
UPDATE ventures SET name_confirmed = false;
