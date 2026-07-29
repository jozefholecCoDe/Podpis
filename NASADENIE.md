# Nasadenie na server

Návod krok za krokom. Po dokončení beží aplikácia nonstop na vlastnej adrese,
nič sa nespúšťa na domácom počítači.

Počítajte s ~30 minútami. Kroky 1–3 sa robia raz.

---

## 1. Doména

Kúpte si doménu (napr. `podpisy.sk`) — u WebSupportu, alebo kdekoľvek inde.
Cena býva okolo 10–15 € na rok.

## 2. Server

Objednajte si VPS s **Ubuntu 24.04**. Stačí najmenší:

- **Hetzner** CX22 — cca 4 €/mesiac
- **WebSupport** VPS — cca 10–16 €/mesiac, slovenská podpora a faktúra

Po objednávke dostanete **IP adresu servera** a heslo (alebo si nahráte SSH kľúč).

## 3. Nasmerovanie domény na server

V správe domény vytvorte `A` záznam:

| Typ | Názov | Hodnota |
| --- | ----- | ------- |
| A   | `podpis` | IP adresa servera |

Výsledná adresa bude `podpis.vasadomena.sk`. Zmena sa prejaví do pár minút až hodín.

## 4. Príprava servera

Pripojte sa na server (na Windows stačí PowerShell):

```bash
ssh root@IP-ADRESA-SERVERA
```

Nainštalujte Docker a stiahnite aplikáciu:

```bash
apt update && apt install -y docker.io docker-compose-v2 git
git clone -b claude/document-signature-page-lwt2et https://github.com/jozefholecCoDe/Podpis.git
cd Podpis
```

## 5. Nastavenia

```bash
cp .env.example .env
nano .env
```

Vyplňte a uložte (`Ctrl+O`, Enter, `Ctrl+X`):

```
DOMAIN=podpis.vasadomena.sk
APP_BASE_URL=https://podpis.vasadomena.sk

APP_PASSWORD=zvolte-si-heslo

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vas-email@gmail.com
SMTP_PASS=vase-app-password
SMTP_FROM=vas-email@gmail.com
```

## 6. Spustenie

```bash
docker compose up -d --build
```

Prvé zostavenie trvá niekoľko minút. Potom otvorte `https://podpis.vasadomena.sk` —
HTTPS certifikát si Caddy vybaví sám.

Hotovo. Server odteraz beží aj po reštarte.

---

## Údržba

**Aktualizácia po zmenách v kóde:**

```bash
cd Podpis && git pull && docker compose up -d --build
```

**Záloha dokumentov** (spustite občas, súbor si stiahnite k sebe):

```bash
docker run --rm -v podpis_podpis-data:/data -v "$PWD":/zaloha alpine \
  tar czf /zaloha/podpis-zaloha.tar.gz -C /data .
```

**Obnova zálohy:**

```bash
docker run --rm -v podpis_podpis-data:/data -v "$PWD":/zaloha alpine \
  tar xzf /zaloha/podpis-zaloha.tar.gz -C /data
```

**Kontrola, či všetko beží:**

```bash
docker compose ps
docker compose logs -f podpis
```
