import LoginForm from "./_components/LoginForm";

export default function HomePage() {
  return (
    <main className="flex min-h-full w-full flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-primary md:text-4xl">
            VIFAA
          </h1>
          <p className="text-sm text-muted-foreground">ERP groupe</p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
