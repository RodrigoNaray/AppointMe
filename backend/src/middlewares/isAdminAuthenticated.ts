import passport from 'passport';

export const isAdminAuthenticated = passport.authenticate('jwt-admin', { session: false });