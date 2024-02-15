const express = require("express");
const router = express.Router(); //objeto router de express para definir endpoints de la zona cliente
const tiendaController = require("../controllers/tiendaController");
router.get('/RecuperarLibros', tiendaController.recuperarLibros); //<---- en url, hay variable: ?email=....
router.get('/RecuperarUnLibro', tiendaController.recuperarUnLibro);
router.get('/RecuperarCategorias', tiendaController.recuperarCategorias);
router.get('/RecuperarProvincias', tiendaController.recuperarProvincias);
router.get('/RecuperarMunicipios', tiendaController.recuperarMunicipios);





module.exports = router;