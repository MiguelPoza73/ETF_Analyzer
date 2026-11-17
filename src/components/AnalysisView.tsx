"use client";

import { useState, type ReactNode } from "react";
import { HORIZONS, type HorizonYears } from "@/lib/analysis/config";
import type { Analysis } from "@/lib/analysis/types";
import { EvidenceBlock } from "./EvidenceBlock";
import { FactorBars } from "./FactorBars";
import { NoVerdictCard, VerdictCard } from "./VerdictCard";

interface AnalysisViewProps {
  analysis: Analysis;
  /** The price chart, rendered next to the verdict. */
  chart: ReactNode;
}

/**
 * The blocks of an asset page that change with the chosen horizon. The
 * horizon lives here so the verdict, the evidence and the factors stay in step.
 */
export function AnalysisView({ analysis, chart }: AnalysisViewProps) {
  const firstAvailable = HORIZONS.find((years) => analysis.horizons[years] !== null) ?? 1;
  const [selected, setSelected] = useState<HorizonYears>(firstAvailable);
  const horizon = analysis.horizons[selected];

  // No horizon can be analysed: a short notice above a full-width chart.
  if (!horizon) {
    return (
      <div className="grid gap-4">
        <NoVerdictCard analysis={analysis} />
        <div className="min-w-0">{chart}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <VerdictCard
          analysis={analysis}
          horizon={horizon}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
      <div className="min-w-0 lg:col-span-3">{chart}</div>
      <div className="min-w-0 lg:col-span-3">
        <EvidenceBlock horizon={horizon} />
      </div>
      <div className="lg:col-span-2">
        <FactorBars factors={horizon.factors} />
      </div>
    </div>
  );
}
