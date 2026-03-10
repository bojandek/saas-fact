# Hetzner VPS Setup

1. Create CX32 VPS ($15/mo, 4CPU/8GB)
2. Install Coolify:
   ```
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
3. Add GitHub repo access
4. Deploy apps/saas-001-booking with coolify.yml
5. Point domain A record to VPS IP
6. SSL auto-issued

Total cost ~$50/mo with Supabase Pro.