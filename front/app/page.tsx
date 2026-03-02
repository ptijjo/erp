import LoginForm from "./components/LoginForm";


export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center h-screen w-full gap-4 bg-gray-500">
      <h1 className="text-4xl font-extrabold text-center text-orange-500">Vifaa</h1>
      <LoginForm />
    </main>
  );
}
