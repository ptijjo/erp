const OrganisationPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
      <h1 className="text-4xl font-extrabold text-orange-500">
        Organisation : {slug}
      </h1>
      <p className="mt-4 text-gray-600">
        Détail organisation — à relier à l&apos;API .NET.
      </p>
    </main>
  );
};

export default OrganisationPage;
