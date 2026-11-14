import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/comprando")({
  beforeLoad: () => {
    throw redirect({ to: "/lista" });
  },
});
