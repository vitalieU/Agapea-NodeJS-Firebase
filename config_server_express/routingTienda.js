const express = require("express");
const router = express.Router(); //objeto router de express para definir endpoints de la zona cliente
const tiendaController = require("../controllers/tiendaController");
router.get('/RecuperarCategorias:idcat', tiendaController.recuperarCategorias);
router.get('/RecuperarLibros:idcat', tiendaController.recuperarLibros);
router.get('/RecuperarLibro:isbn13', tiendaController.recuperarLibro);





module.exports = router;