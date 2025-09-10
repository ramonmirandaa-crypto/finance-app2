describe('User login', () => {
  it('should login an existing user', () => {
    const email = `login${Date.now()}@example.com`;
    const password = 'password123';
    cy.request('POST', '/auth/register', {
      name: 'Login User',
      email,
      password,
    });
    cy.request('POST', '/auth/login', { email, password })
      .its('status').should('eq', 200);
  });
});
