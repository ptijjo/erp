import { Skeleton } from "~/components/ui/skeleton";

export function DashboardLoading() {
  return (
    <section className="flex h-screen w-full bg-background">
      <Skeleton className="hidden h-full w-60 shrink-0 rounded-none md:block" />
      <section className="flex min-w-0 flex-1 flex-col">
        <Skeleton className="h-14 w-full shrink-0 rounded-none" />
        <section className="flex flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </section>
        </section>
      </section>
    </section>
  );
}
