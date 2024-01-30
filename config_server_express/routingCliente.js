//modulo de node para definir endpoints zona cliente con sus respectivas funciones middleware para su procesamiento
//se meten en objeto router y se exporta este objeto router:
const express=require('express');

const router=express.Router(); //<----- objeto router a exportar...

const clienteController=require('../controllers/clienteController');


//añado endpoints y funciones middleware a ese objeto router importardas desde un objeto javascript q funciona como si fuese un "controlador":
router.post('/Login', clienteController.login);
router.post('/Registro', clienteController.registro);
router.get('/ComprobarEmail', clienteController.comprobarEmail); //<---- en url, hay variable: ?email=....
router.get('/ActivarEmail', clienteController.activarCuenta);

module.exports=router;