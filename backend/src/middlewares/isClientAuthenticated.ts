import passport from 'passport';

// Este middleware usará la estrategia que nombramos 'jwt-client'
export const isClientAuthenticated = passport.authenticate('jwt-client', {
  session: false,
  failWithError: true,
});
