// Module shims for packages that TypeScript bundler resolution can't find
// These re-export from the actual installed packages

declare module 'zod' {
  export * from '/home/ubuntu/saas-fact/factory-dashboard/node_modules/zod/index.d.ts'
}
