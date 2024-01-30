const { initializeApp } = require("firebase/app");
const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));
const { getAuth } = require("firebase/auth");
const auth = getAuth(app);

const {
  getFirestore,
  getDocs,
  collection,
  query,
  where,
} = require("firebase/firestore");
const db = getFirestore(app);

module.exports = {
  recuperarCategorias: async function (req, res, next) {
    try {
      console.log("idcategoria recibida desde react...", req.params.idcat);
      var _idcategoria = req.params.idCategoria;
      let _categorias = [];
      var _patron =
        _idcategoria === "path"
          ? new RegExp("^\\d{1,}$")
          : new RegExp("^" + _idcategoria + "-\\d{1,}$");
      const _cats = await getDocs(collection(db, "categorias"));
      _cats.forEach((doc) => {
        if (_patron.test(doc.data().IdCategoria)) {
          _categorias.push(doc.data());
        }
      });
      res.status(200).send(_categorias);
    } catch (error) {
      console.log("error al recuperar categorias...", error);
      res.status(500).send([]);
    }
  },
  recuperarLibros: async function (req, res, next) {
    try {
      const idcat = req.params.idcat;
      console.log("idcat recibido desde react...", idcat);
      const _libros = [];
      const _q = query(
        collection(db, "libros")
      );
      const _querySnapshot = await getDocs(_q);
      _querySnapshot.forEach((doc) => {
        _libros.push(doc.data());
      });
      const _patron=idcat==='padres' ?  new RegExp("^\\d{1,}$") : new RegExp("^" + idcat + "-\\d{1,}$");
      const libroFiltrador = _libros.filter((libro) => {
        return _patron.test(libro.IdCategoria);
      });
      res.status(200).send(_libros);
    } catch (error) {
      console.log("Error al enviar libros", error);
      res.status(500).send([]);
    }
  },
  recuperarLibro: async function (req, res, next) {
    try {
    } catch (error) {
      console.log("Error al enviar libro", error);
      res.status(500).send(error);
    }
  },
};
