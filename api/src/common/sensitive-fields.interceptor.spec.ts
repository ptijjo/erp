import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { Prisma } from '../generated/prisma/client';
import { SensitiveFieldsInterceptor } from './sensitive-fields.interceptor';

describe('SensitiveFieldsInterceptor', () => {
  const interceptor = new SensitiveFieldsInterceptor();

  it('sérialise les Prisma.Decimal en string (évite prix catalogue à 0)', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () =>
          of({
            id: 'p1',
            name: 'Produit',
            price: new Prisma.Decimal('1500.50'),
          }),
      }),
    );

    expect(result).toEqual({
      id: 'p1',
      name: 'Produit',
      price: '1500.5',
    });
  });

  it('conserve les instances Date dans les réponses', async () => {
    const eventDate = new Date('2026-07-09T12:00:00.000Z');
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () =>
          of({
            id: 'evt-1',
            title: 'Fête',
            eventDate,
            password: 'secret',
          }),
      }),
    );

    expect(result).toEqual({
      id: 'evt-1',
      title: 'Fête',
      eventDate,
    });
    expect((result as { eventDate: Date }).eventDate).toBeInstanceOf(Date);
  });

  it('retire les champs sensibles', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () =>
          of({
            email: 'a@b.fr',
            refresh_token: 'x',
          }),
      }),
    );

    expect(result).toEqual({ email: 'a@b.fr' });
  });
});
