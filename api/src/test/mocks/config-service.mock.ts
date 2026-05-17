import { ConfigService } from '@nestjs/config';

export function mockConfigServiceProvider(
  values: Record<string, string | undefined> = {},
) {
  return {
    provide: ConfigService,
    useValue: {
      get: jest.fn((key: string) => values[key]),
      getOrThrow: jest.fn((key: string) => {
        const v = values[key];
        if (v === undefined) {
          throw new Error(`Config key missing in test mock: ${key}`);
        }
        return v;
      }),
    },
  };
}
