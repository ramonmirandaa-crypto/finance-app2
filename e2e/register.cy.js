describe('User registration', () => {
  it('should register a new user', () => {
    const email = `user${Date.now()}@example.com`;
    cy.request('POST', '/auth/register', {
      name: 'Test User',
      email,
      password: 'password123'
    }).its('status').should('eq', 201);
  });
});
