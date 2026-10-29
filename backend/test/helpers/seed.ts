type Session = {
  send: (m: 'post' | 'put' | 'patch' | 'delete', url: string) => import('supertest').Test;
};

/** Caso do artigo (PRD §6.6) cadastrado pela API: renda 4000, despesas 2000, dívida 400×10 com saldo 6000, reserva 6000. */
export async function seedArticle(s: Session): Promise<{ debtId: number }> {
  await s.send('post', '/api/v1/incomes').send({ monthValue: '4000.00' }).expect(201);
  await s
    .send('post', '/api/v1/expenses')
    .send({ category: 'MORADIA', type: 'FIXA', value: '2000.00' })
    .expect(201);
  const debt = await s
    .send('post', '/api/v1/debts')
    .send({
      category: 'CREDIARIO',
      installmentValue: '400.00',
      remainingInstallments: 10,
      balanceDue: '6000.00',
    })
    .expect(201);
  await s.send('post', '/api/v1/reserves').send({ value: '6000.00' }).expect(201);
  return { debtId: debt.body.id };
}
