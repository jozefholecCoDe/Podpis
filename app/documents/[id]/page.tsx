import Link from "next/link";
import { DocumentStatus } from "@/components/DocumentStatus";

export default async function DocumentPage({
  params,
}: PageProps<"/documents/[id]">) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-6 px-6 py-12">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-xl font-semibold">Podpis dokumentu</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Nahrať iný dokument
        </Link>
      </div>
      <DocumentStatus id={id} />
    </div>
  );
}
