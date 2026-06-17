import { prisma, type PrismaClient } from '@repo/database';

const wrapper = { current: null as PrismaClient | null };

const proxy = new Proxy(prisma, {
  get(target, prop, receiver) {
    if (wrapper.current && typeof prop === 'string') {
      return Reflect.get(wrapper.current, prop, receiver);
    }
    return Reflect.get(target, prop, receiver);
  },
}) as PrismaClient;

export function getTransactionProxy(): PrismaClient {
  return proxy;
}

let transactionResolver: ((value: unknown) => void) | null = null;
let transactionPromise: Promise<unknown> | null = null;

export async function startSandbox(): Promise<void> {
  wrapper.current = null;
  transactionPromise = prisma.$transaction(async (tx) => {
    wrapper.current = tx as unknown as PrismaClient;
    return new Promise((resolve) => {
      transactionResolver = resolve;
    });
  });
  while (!wrapper.current) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

export async function endSandbox(): Promise<void> {
  wrapper.current = null;
  if (transactionResolver) {
    transactionResolver(undefined);
    transactionResolver = null;
  }
  if (transactionPromise) {
    await transactionPromise.catch(() => {});
    transactionPromise = null;
  }
}

export async function runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
  await startSandbox();
  try {
    return await fn();
  } finally {
    await endSandbox();
  }
}
