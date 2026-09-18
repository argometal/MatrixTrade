import { WorkshopClient } from "./components/WorkshopClient";

export default function ForgeWorkshopPage() {
  return (
    <section className="space-y-2" aria-labelledby="forge-workshop-heading">
      <h2 id="forge-workshop-heading" className="text-lg font-semibold text-zinc-100">
        Workshop
      </h2>
      <WorkshopClient />
    </section>
  );
}
