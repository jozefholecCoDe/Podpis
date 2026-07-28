import { SigningView } from "@/components/SigningView";

export default async function SignPage({
  params,
}: PageProps<"/sign/[token]">) {
  const { token } = await params;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-xl font-semibold">Podpis dokumentu</h1>
      <SigningView token={token} />
    </div>
  );
}
