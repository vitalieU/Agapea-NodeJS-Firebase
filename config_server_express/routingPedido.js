const express=require('express');

const router=express.Router(); //<----- objeto router a exportar...

const pedidoController=require('../controllers/pedidoController');
const {getStorage, ref, uplodadString, getDownloadURL}=require('firebase/storage');
const storage = getStorage();

router.post('/FinalizarPedido', pedidoController.finalizarPedido);
router.get('/PayPalCallback', pedidoController.payPalCallback);
router.post('/RecuperarCliente', pedidoController.obtenerDatosCliente);
module.exports=router;
