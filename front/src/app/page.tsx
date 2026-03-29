import LoginForm from "./_components/LoginForm";

export default function HomePage() {
  return (
    <main className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-gray-500">
      <h1 className="text-center text-4xl font-extrabold text-orange-500">
        Vifaa
      </h1>
      <LoginForm />
    </main>
  );
}
