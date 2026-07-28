"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="text-sm text-zinc-500 hover:underline"
      onClick={async () => {
        await fetch("/api/prihlasenie", { method: "DELETE" });
        router.push("/prihlasenie");
        router.refresh();
      }}
    >
      Odhlásiť sa
    </button>
  );
}
