import { FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Marks the worked-example half of the app.
 *
 * Minimum night flow analysis needs hourly readings from a zone's bulk meter.
 * No South African municipality publishes those — they live in a SCADA system
 * behind the municipality's own firewall — so this section demonstrates the
 * method on a modelled network instead. That is a real limitation, not a
 * disclaimer to be tucked into a footer, and it belongs at the top of every
 * page it applies to.
 */
export function ModelledNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-flow-400/20 bg-flow-400/[0.05] px-4 py-3">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-flow-300" aria-hidden="true" />
      <p className="text-[12px] leading-relaxed text-flow-50/80">
        <span className="font-medium">Worked example on modelled telemetry. </span>
        {children ?? (
          <>
            Thuso Metro is not a real municipality. Minimum night flow analysis needs hourly
            bulk-meter readings, which no municipality publishes, so the method is
            demonstrated on a network generated for the purpose — with a leak of known size
            injected, so the analysis can be checked against the right answer.
          </>
        )}{' '}
        <Link
          to="/"
          className="whitespace-nowrap text-flow-300 underline underline-offset-4 hover:text-flow-200"
        >
          Published data is here
        </Link>
        .
      </p>
    </div>
  );
}
