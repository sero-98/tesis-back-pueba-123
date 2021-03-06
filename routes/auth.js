const express= require('express');
const passport=require('passport');
const jwt = require('jsonwebtoken');
const { config } = require('../config/config_env');
const ApiKeysService = require('../services/apiKeys');
const UsersService =require('../services/user');
const validationHandler = require('../utils/middleware/validationHandler');
const {createUserSchema} =require('../utils/schema/user');
const joi = require('@hapi/joi');
require('../utils/auth/strategies/basic');
function authApi (app){

  
  const router = express.Router();
  app.use('/api/auth', router);
  const apiKeysService = new ApiKeysService();
  const usersServices= new UsersService();
  
  router.post('/sign-in', async (req, res, next) => {
    /** verificamos que del cuerpo venga un atributo que se llame apiKeyToken
     * este es el token que le vamos a pasar el Sign In para determinar que clase de permiso
     * vamos a firmar en el JWT que vamos a devolver
     */

     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
     res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
     res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
 

    const { apiKeyToken } = req.body;
   console.log(req.body)
    // verificamos si no existe el token
    if (!apiKeyToken) {
      next(boom.unauthorized('apiKeyToken is required'), false);
    }

    // cuando ya tengamos el token, podemos implementar un custom Callback
    // se va ha encargar de ubicar a nuestro usuario en nuestro request.user,
    // en esté caso no nos interesa que úbique al usuario que encuentra en la ubicación basic
    // nosotros lo que queremos es que nos devuelva un JWT Firmado.
    passport.authenticate('basic', (err, user) => {
      try {
        if (err || !user) {
          next(boom.unauthorized(), false);
        }

        // si exite el usuario, procedemos a implementar el req.login
        // vamos definir que no vamos a implementar una session 
        // recibimos un error en caso de que exista
        req.login(user, { session: false }, async function (error) {
          if (error) {
            next(error);
          }

          // si no hay error procedemos a buscar nuestro API Key
          console.log(apiKeyToken);

          const apiKey = await apiKeysService.getApiKey({ token: apiKeyToken });

          if (!apiKey) {
            next(boom.unauthorized());
          }

          // teniendo en cuenta el API Key procedemos a construir nuestro JWT 

          const {
            _id: id,
            name,
            email
          } = user;


          const payload = {
            sub: id,
            name,
            email,
            scopes: apiKey.scopes
          }

          const token = jwt.sign(payload, config.authJwtSecret, {
            //expiresIn: '15m'
          });

          return res.status(200).json({token, user: {id, name, email}})
        });

      } catch (err) {
        next(err)
      }
      // como es un custom Callback, debemos hace un Clousure con la firma de la ruta.
    })(req, res, next);


  });
  
  











  router.post(
    '/sign-up',
    validationHandler(createUserSchema),
    async (req, res, next) => {
      // sacamos del body el user:
      console.log( req.body)
      const { body: user } = req;

      try {

        //llamamos nuestro servicio de creación de usuario
        const createUserId = await usersServices.createUser({user});

        res.status(201).json({
          data: createUserId,
          message: 'user created'
        });
      } catch (err) {
        next(err);
      }
    }
  );
}
module.exports = authApi ;