describe('Categories API', () => {
  it('creates and lists categories', () => {
    const email = `cat${Date.now()}@example.com`;
    const password = 'password123';
    cy.request('POST', '/auth/register', {
      name: 'Cat User',
      email,
      password,
    }).then((res) => {
      const token = res.body.token;
      cy.request({
        method: 'POST',
        url: '/categories',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Food' },
      }).its('status').should('eq', 201);
      cy.request({
        method: 'GET',
        url: '/categories',
        headers: { Authorization: `Bearer ${token}` },
      }).its('body.categories').should('have.length', 1);
    });
  });
});
