import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const valid =
          credentials.username === process.env.WEBSERVICE_USER &&
          credentials.password === process.env.WEBSERVICE_PASS;

        if (valid) {
          return { id: 'admin', name: 'Admin User' };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,
  },
};
