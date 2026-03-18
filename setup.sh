#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║           SaaS Factory — Setup Wizard v1.0                  ║
# ║     Automatska instalacija i konfiguracija sistema           ║
# ╚══════════════════════════════════════════════════════════════╝

set -e

# ── Boje ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────
info()    { echo -e "${CYAN}ℹ  $1${RESET}"; }
success() { echo -e "${GREEN}✅ $1${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  $1${RESET}"; }
error()   { echo -e "${RED}❌ $1${RESET}"; exit 1; }
step()    { echo -e "\n${BOLD}${BLUE}── $1 ──────────────────────────────────${RESET}"; }
ask()     { echo -e "${YELLOW}?  $1${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Banner ────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
cat << 'BANNER'
  ███████╗ █████╗  █████╗ ███████╗    ███████╗ █████╗  ██████╗████████╗ ██████╗ ██████╗ ██╗   ██╗
  ██╔════╝██╔══██╗██╔══██╗██╔════╝    ██╔════╝██╔══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗╚██╗ ██╔╝
  ███████╗███████║███████║███████╗    █████╗  ███████║██║        ██║   ██║   ██║██████╔╝ ╚████╔╝ 
  ╚════██║██╔══██║██╔══██║╚════██║    ██╔══╝  ██╔══██║██║        ██║   ██║   ██║██╔══██╗  ╚██╔╝  
  ███████║██║  ██║██║  ██║███████║    ██║     ██║  ██║╚██████╗   ██║   ╚██████╔╝██║  ██║   ██║   
  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝  
BANNER
echo -e "${RESET}"
echo -e "${BOLD}  Dobrodošao u SaaS Factory Setup Wizard${RESET}"
echo -e "  Ovaj wizard će automatski instalirati i konfigurisati cijeli sistem.\n"
echo -e "  ${YELLOW}Trebat će ti:${RESET}"
echo -e "   • Anthropic API ključ  →  ${CYAN}console.anthropic.com${RESET}"
echo -e "   • Supabase projekat    →  ${CYAN}supabase.com${RESET}"
echo -e ""
read -p "  Pritisni ENTER za početak..." _

# ── Korak 1: Provjera sistema ─────────────────────────────────────
step "Korak 1/6: Provjera sistema"

check_cmd() {
  if command -v "$1" &>/dev/null; then
    success "$1 pronađen ($(command -v $1))"
  else
    error "$1 nije instaliran. Instaliraj ga i pokušaj ponovo."
  fi
}

check_cmd node
check_cmd git

# Provjera Node verzije
NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>/dev/null && echo "ok" || echo "old")
if [ "$NODE_VER" = "old" ]; then
  error "Node.js verzija je prestara. Potrebna je verzija 18+. Trenutna: $(node --version)"
fi
success "Node.js verzija OK ($(node --version))"

# Provjera pnpm
if command -v pnpm &>/dev/null; then
  success "pnpm pronađen ($(pnpm --version))"
else
  warn "pnpm nije pronađen. Instaliram..."
  npm install -g pnpm
  success "pnpm instaliran"
fi

# ── Korak 2: Anthropic API ključ ──────────────────────────────────
step "Korak 2/6: Anthropic API ključ (Claude AI)"

echo ""
echo -e "  ${BOLD}Kako dobiti Anthropic API ključ:${RESET}"
echo -e "  1. Idi na ${CYAN}https://console.anthropic.com${RESET}"
echo -e "  2. Registruj se ili prijavi"
echo -e "  3. Klikni 'API Keys' u lijevom meniju"
echo -e "  4. Klikni 'Create Key' i kopiraj ključ"
echo -e "  5. Ključ izgleda ovako: ${YELLOW}sk-ant-api03-...${RESET}"
echo ""

while true; do
  ask "Upiši tvoj Anthropic API ključ:"
  read -r -s ANTHROPIC_KEY
  echo ""
  if [[ "$ANTHROPIC_KEY" == sk-ant-* ]]; then
    success "Anthropic API ključ prihvaćen"
    break
  elif [ -z "$ANTHROPIC_KEY" ]; then
    warn "Ključ je prazan. Pokušaj ponovo."
  else
    warn "Ključ ne izgleda ispravno (treba počinjati sa sk-ant-). Pokušaj ponovo ili pritisni ENTER za preskakanje."
    read -p "  Preskoči? (y/N): " skip
    if [[ "$skip" =~ ^[Yy]$ ]]; then
      ANTHROPIC_KEY=""
      warn "Anthropic ključ preskočen — sistem neće moći generisati SaaS bez njega"
      break
    fi
  fi
done

# ── Korak 3: Supabase konfiguracija ───────────────────────────────
step "Korak 3/6: Supabase konfiguracija"

echo ""
echo -e "  ${BOLD}Kako dobiti Supabase ključeve:${RESET}"
echo -e "  1. Idi na ${CYAN}https://supabase.com${RESET} i napravi novi projekat"
echo -e "  2. Idi na ${BOLD}Settings → API${RESET}"
echo -e "  3. Kopiraj:"
echo -e "     • ${YELLOW}Project URL${RESET}           → SUPABASE_URL"
echo -e "     • ${YELLOW}anon public${RESET} ključ     → SUPABASE_ANON_KEY"
echo -e "     • ${YELLOW}service_role${RESET} ključ    → SUPABASE_SERVICE_ROLE_KEY"
echo ""

ask "Upiši Supabase Project URL (npr. https://xxxx.supabase.co):"
read -r SUPABASE_URL
if [[ "$SUPABASE_URL" == https://*.supabase.co ]]; then
  success "Supabase URL prihvaćen"
else
  warn "URL ne izgleda ispravno — nastavlja se, ali provjeri ga"
fi

ask "Upiši Supabase anon public ključ:"
read -r -s SUPABASE_ANON_KEY
echo ""
if [ -n "$SUPABASE_ANON_KEY" ]; then
  success "Supabase anon ključ prihvaćen"
fi

ask "Upiši Supabase service_role ključ:"
read -r -s SUPABASE_SERVICE_ROLE_KEY
echo ""
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  success "Supabase service_role ključ prihvaćen"
fi

# ── Korak 4: Opcionalni ključevi ──────────────────────────────────
step "Korak 4/6: Opcionalni ključevi"

echo ""
echo -e "  ${BOLD}Sljedeći ključevi su opcionalni.${RESET}"
echo -e "  Možeš ih dodati sada ili kasnije urediti ${YELLOW}.env.local${RESET} fajl.\n"

ask "Voyage AI ključ za RAG/memory sistem (voyageai.com) — pritisni ENTER za preskakanje:"
read -r -s VOYAGE_KEY
echo ""
[ -n "$VOYAGE_KEY" ] && success "Voyage AI ključ prihvaćen" || info "Voyage AI preskočen"

ask "Stripe Secret Key za payments (dashboard.stripe.com) — pritisni ENTER za preskakanje:"
read -r -s STRIPE_SECRET
echo ""
[ -n "$STRIPE_SECRET" ] && success "Stripe ključ prihvaćen" || info "Stripe preskočen"

ask "Resend API Key za email notifikacije (resend.com) — pritisni ENTER za preskakanje:"
read -r -s RESEND_KEY
echo ""
[ -n "$RESEND_KEY" ] && success "Resend ključ prihvaćen" || info "Resend preskočen"

# ── Korak 5: Kreiranje .env.local ─────────────────────────────────
step "Korak 5/6: Kreiranje konfiguracije"

ENV_FILE="$SCRIPT_DIR/.env.local"
DASHBOARD_ENV="$SCRIPT_DIR/factory-dashboard/.env.local"

cat > "$ENV_FILE" << ENVEOF
# ─── SaaS Factory — Konfiguracija ───────────────────────────────
# Generisano automatski sa setup.sh wizardom
# Datum: $(date '+%Y-%m-%d %H:%M:%S')

# ─── Anthropic (Claude AI) ───────────────────────────────────────
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}

# ─── Supabase ────────────────────────────────────────────────────
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# ─── Voyage AI (RAG/Embeddings) ──────────────────────────────────
VOYAGE_API_KEY=${VOYAGE_KEY}

# ─── Stripe (Payments) ───────────────────────────────────────────
STRIPE_SECRET_KEY=${STRIPE_SECRET}
STRIPE_PUBLISHABLE_KEY=

# ─── Resend (Email) ──────────────────────────────────────────────
RESEND_API_KEY=${RESEND_KEY}

# ─── App ─────────────────────────────────────────────────────────
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVEOF

# Kopiraj i u factory-dashboard
cp "$ENV_FILE" "$DASHBOARD_ENV"

success ".env.local kreiran u root direktoriju"
success ".env.local kreiran u factory-dashboard direktoriju"

# ── Korak 6: Instalacija i build ──────────────────────────────────
step "Korak 6/6: Instalacija dependencies i build"

cd "$SCRIPT_DIR"

info "Instaliram workspace dependencies..."
pnpm install --silent 2>&1 | tail -3
success "Dependencies instalirane"

info "Budujem factory-brain..."
cd "$SCRIPT_DIR/factory-brain"
bash build.sh 2>&1 | grep -E "Build|Sync|error" || true
success "factory-brain buildovan"

info "Budujem factory-cli..."
cd "$SCRIPT_DIR/blocks/factory-cli"
pnpm build --silent 2>&1 | tail -3 || true
success "factory-cli buildovan"

# ── Globalna factory komanda ──────────────────────────────────────
cd "$SCRIPT_DIR"
CLI_PATH="$SCRIPT_DIR/blocks/factory-cli/dist/cli.js"

# Kreiranje factory wrapper skripte
FACTORY_BIN="$SCRIPT_DIR/factory"
cat > "$FACTORY_BIN" << FACTEOF
#!/bin/bash
# SaaS Factory — globalna komanda
export $(grep -v '^#' "$SCRIPT_DIR/.env.local" | xargs) 2>/dev/null || true
node "$CLI_PATH" "\$@"
FACTEOF
chmod +x "$FACTORY_BIN"

# Pokušaj dodati u PATH
if [[ ":$PATH:" != *":$SCRIPT_DIR:"* ]]; then
  SHELL_RC=""
  if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
  fi
  
  if [ -n "$SHELL_RC" ]; then
    echo "" >> "$SHELL_RC"
    echo "# SaaS Factory" >> "$SHELL_RC"
    echo "export PATH=\"\$PATH:$SCRIPT_DIR\"" >> "$SHELL_RC"
    success "factory komanda dodana u PATH (via $SHELL_RC)"
  fi
fi

# ── Završetak ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║          ✅  Setup završen uspješno!                 ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  ${BOLD}Kako koristiti:${RESET}\n"
echo -e "  ${CYAN}# Lista svih dostupnih niša${RESET}"
echo -e "  ${BOLD}./factory niche-list${RESET}\n"
echo -e "  ${CYAN}# Preview blueprinta za nišu${RESET}"
echo -e "  ${BOLD}./factory niche-map --niche \"teretana-crm\"${RESET}\n"
echo -e "  ${CYAN}# Generisanje kompletnog SaaS-a${RESET}"
echo -e "  ${BOLD}./factory generate --niche \"teretana-crm\" --name moj-gym${RESET}\n"
echo -e "  ${CYAN}# Pokretanje Dashboard-a${RESET}"
echo -e "  ${BOLD}cd factory-dashboard && pnpm dev${RESET}\n"
echo -e "  ${YELLOW}Napomena: Ako 'factory' komanda nije dostupna globalno,${RESET}"
echo -e "  ${YELLOW}zatvori i ponovo otvori terminal, ili koristi ./factory${RESET}\n"
echo -e "  ${BOLD}Generisane aplikacije se nalaze u:${RESET}"
echo -e "  ${CYAN}$SCRIPT_DIR/blocks/factory-cli/apps/${RESET}\n"
