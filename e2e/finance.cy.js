describe('Basic financial operations', () => {
  it('should access profile after login', () => {
    const email = `finance${Date.now()}@example.com`;
    const password = 'password123';
    cy.request('POST', '/auth/register', {
      name: 'Finance User',
      email,
      password,
    }).then((res) => {
      const token = res.body.token;
      cy.request({
        method: 'GET',
        url: '/me',
        headers: { Authorization: `Bearer ${token}` },
      }).its('status').should('eq', 200);
    });
  });
});
