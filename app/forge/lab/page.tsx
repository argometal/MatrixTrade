import { getTrainingLabDataAction } from "@/app/forge/lab/actions";
import { TrainingLabShell } from "./components/TrainingLabShell";

export default async function ForgeTrainingLabPage() {
  const data = await getTrainingLabDataAction();
  return <TrainingLabShell initial={data} />;
}
