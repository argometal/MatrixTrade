import { AI_BLOCK_SAMPLES } from "../lib/ai-block";
import { AI_BRIDGE_BLOCK_TYPES } from "../lib/ai-bridge-types";
import {
  buildApplySchemaContract,
  buildApplySchemaContractText,
} from "../lib/apply-schema-contract";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { MATRIX_MECHANICS_REVISION } from "../lib/matrix-mechanics-snapshot";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sampleKeys = Object.keys(AI_BLOCK_SAMPLES).sort();
const bridge = [...AI_BRIDGE_BLOCK_TYPES].sort();
console.log("sample count", sampleKeys.length);
console.log("bridge count", bridge.length);
console.log(
  "missing in samples",
  bridge.filter((t) => !sampleKeys.includes(t))
);
console.log("thesis-t0-repair sample?", !!AI_BLOCK_SAMPLES["thesis-t0-repair"]);

const c = buildApplySchemaContract();
console.log("acceptedTypes has thesis-t0-repair", c.acceptedTypes.includes("thesis-t0-repair"));
console.log("schemaVersion", c.schemaVersion);
console.log("mechanics revision", MATRIX_MECHANICS_REVISION);

const schemaText = buildApplySchemaContractText();
const mechanicsText = buildMatrixMechanicsBrief();

const outDir = resolve(process.cwd(), "tools");
writeFileSync(resolve(outDir, "_mxt-029-apply-schema-contract.txt"), schemaText, "utf8");
writeFileSync(resolve(outDir, "_mxt-029-mta-mechanics.txt"), mechanicsText, "utf8");

console.log("schema chars", schemaText.length);
console.log("mechanics chars", mechanicsText.length);
console.log("schema has thesis-t0-repair", schemaText.includes("thesis-t0-repair"));
console.log("schema has repairKind=corrected", schemaText.includes("repairKind=corrected"));
console.log("mechanics has stay immutable", mechanicsText.includes("stay immutable"));
console.log(
  "mechanics has Does NOT rewrite frozen T0",
  mechanicsText.includes("Does NOT rewrite frozen T0")
);
