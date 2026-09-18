import { getTrainingLabDataAction } from "@/app/argus/lab/actions";
import { TrainingLabShell } from "./components/TrainingLabShell";

export default async function TrainingLabPage() {
  const data = await getTrainingLabDataAction();
  return <TrainingLabShell initial={data} />;
}
