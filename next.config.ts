import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // O driver `pg` é nativo do servidor: não pode ser empacotado no bundle.
  serverExternalPackages: ['pg', 'bcryptjs'],
};

export default config;
