import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import prisma from "./prisma";
import logger from "../utils/logger";


if (!process.env.JWT_SECRET) {
  logger.fatal('FATAL ERROR: JWT_SECRET no está definida en las variables de entorno.');
  throw new Error('FATAL ERROR: JWT_SECRET no está definida.');
}

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

const strategy = new JwtStrategy(opts, async (payload, done) => {
  try{
    const user = await prisma.adminUser.findUnique({
      where: { id: payload.sub},
    });

    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    };

  }catch(error){
    logger.error(error, 'Error en la estrategia de Passport JWT');
    return done(error, false);
  }
});

export default strategy;