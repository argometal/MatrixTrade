import assert from "node:assert/strict";
import { isBenignMissingFreezeDownloadError } from "../lib/thesis-t0-store/supabase-storage";

function run() {
  assert.equal(
    isBenignMissingFreezeDownloadError("T0-BF0CBD86E125", {
      message:
        '{"url":"https://rnbgxspcmxtflpcisrew.supabase.co/storage/v1/object/mxt-artifacts/thesis-t0-freezes/T0-BF0CBD86E125.json"}',
    }),
    true
  );

  assert.equal(
    isBenignMissingFreezeDownloadError("T0-BF0CBD86E125", {
      message: "Object not found",
      statusCode: 404,
    }),
    true
  );

  assert.equal(
    isBenignMissingFreezeDownloadError("T0-BF0CBD86E125", {
      message: "permission denied",
      statusCode: 403,
    }),
    false
  );

  console.log("test-thesis-t0-supabase-storage: PASS");
}

run();
