import { UploadArea } from "@/components/UploadArea";
import { DocumentList } from "@/components/DocumentList";
import { LogoutButton } from "@/components/LogoutButton";

// Heslo sa číta z .env.local pri každej požiadavke, aby sa jeho zmena
// prejavila bez nutnosti aplikáciu znovu zostavovať.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const isProtected = Boolean(process.env.APP_PASSWORD);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-6 py-16">
      <div className="w-full text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Podpis dokumentu</h1>
        <p className="mt-2 text-zinc-500">
          Nahrajte dokument, vyznačte miesto na podpis a pošlite odkaz na podpísanie emailom.
        </p>
      </div>

      {!isProtected && (
        <p className="w-full rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Aplikácia nie je chránená heslom — kto pozná jej adresu, vidí všetky dokumenty.
          Heslo nastavíte položkou <code className="font-mono">APP_PASSWORD</code> v súbore{" "}
          <code className="font-mono">.env.local</code>.
        </p>
      )}

      <UploadArea />

      <DocumentList />

      {isProtected && <LogoutButton />}
    </div>
  );
}
