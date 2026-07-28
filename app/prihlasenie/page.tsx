import { LoginForm } from "@/components/LoginForm";
import { safeNextPath } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/prihlasenie">) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16">
      <LoginForm next={next} />
    </div>
  );
}
