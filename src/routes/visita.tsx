import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/visita")({
  component: VisitEntry,
});

function VisitEntry() {
  return null;
}
