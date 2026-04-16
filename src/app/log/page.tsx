import { getOutlets, getVessels, getVoyages } from "@/lib/data-source";
import { LogWasteForm } from "./LogWasteForm";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const [vessels, outlets, voyages] = await Promise.all([getVessels(), getOutlets(), getVoyages(undefined, 30)]);
  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>Log waste</h1>
          <p className="muted">
            Quick-capture kitchen, buffet, plate or crew waste. Entries normalize to kg and estimate cost and CO₂e automatically.
          </p>
        </div>
      </div>
      <LogWasteForm vessels={vessels} outlets={outlets} voyages={voyages} />
    </>
  );
}
